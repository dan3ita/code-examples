import {
  BarcodeType,
  BWTrackingDataFinder,
  CarrierTrackingCode,
  InternalError,
  LocationEvent,
  LocationEventFields,
  LocationEventTypes,
  newError,
  NotFoundError,
  Tenant,
  TenantRef,
  TrackingDataFinderRegistry,
  ValidationError,
  Venue,
  VenueSummary,
} from "bootworks-common"
import { DBClient } from "../../lib/db/db.methods"
import { MongoDBClient } from "../../lib/db/mongo/mongo"
import { Request } from "../../interfaces/models/core/Request"
import { AuthorizerClaims, UserContext, userContext } from "../util/UserContext"
import { parseJSON } from "../util/Data.util"
import { newResponse, BootworksResponse } from "../../interfaces/models/core/Response"
import { BWUser } from "../impl/BWUser"
import { convertLocationEventFieldsDates } from "../../lib/util/Conversion"
import { validateGeoLocation, validateVenueAndTenantId } from "../util/Validation.util"
import { Configuration, getConfig } from "../../lib/config"
import { EventStreamClient } from "../../lib/streams/client"
import { LocationEventStreamMapper } from "../../lib/streams/mappers/locationEventMapper"

// Load static configuration
const CONFIG: Configuration = getConfig()

// Set config constants
const MAX_PARTITION_KEY_LENGTH = CONFIG.cloud?.aws?.services?.kinesis?.maxPartitionKeyLength || 256
const MAX_DATA_BLOB_LENGTH = CONFIG.cloud?.aws?.services?.kinesis?.maxRecordSize || 1048576
const LOCATION_EVENT_STREAM_NAME = CONFIG.cloud?.aws?.services?.kinesis?.locationEventStreamName
const STREAM_PRODUCER_ERROR = "Error invoking stream producer"

// Set mapper and stream client
const locationEventMapper = new LocationEventStreamMapper({ MAX_PARTITION_KEY_LENGTH, MAX_DATA_BLOB_LENGTH })
const streamClient = LOCATION_EVENT_STREAM_NAME ? new EventStreamClient(LOCATION_EVENT_STREAM_NAME) : undefined

const client: DBClient = new MongoDBClient()
const bwFinder = new BWTrackingDataFinder()

export const recordLocationEvent = async (
  request: Request,
  claims: AuthorizerClaims | null,
): Promise<BootworksResponse<LocationEvent>> => {
  let userCtx: UserContext

  return Promise.resolve()
    .then(() => request.isBodyValidAsync())
    .then(() => client.connect())
    .then(() => userContext(client, claims))
    .then((uc) => {
      userCtx = uc
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return parseJSON<LocationEventFields>(request.data.body!)
    })
    .then(validateEventType)
    .then(convertLocationEventFieldsDates)
    .then(validateGeoLocationField)
    .then(async (eventFields) => {
      const parsedBarcode = await parseBarcode(eventFields)
      return { eventFields, parsedBarcode }
    })
    .then(({ eventFields, parsedBarcode }) => createLocationEvent(userCtx, eventFields, parsedBarcode))
    .then((event) => client.recordLocationEvent(event))
    .then(async (event) => {
      // send event to kinesis
      await sendRecordsToStreamClient(event)
      return newResponse({ data: event })
    })
    .catch((err) => {
      return newResponse<LocationEvent>({ err })
    })
}
const validateEventType = (eventFields: LocationEventFields): LocationEventFields => {
  const { venue, tenant, eventType, bwBarcode, geoLocation } = eventFields

  switch (eventType) {
    case undefined:
      throw newError(ValidationError, "An event type is required.")
    case LocationEventTypes.DEVICE_LOCATION:
      if (!bwBarcode && !geoLocation) {
        // missing required fields for DEVICE_LOCATION
        throw newError(ValidationError, `For ${eventType} events at least one of (bwBarcode, geoLocation) is required.`)
      }
      break
    case LocationEventTypes.TENANT_ARRIVAL:
    case LocationEventTypes.TENANT_DEPARTURE:
      if (!venue || !tenant) {
        // missing required fields for TENANT_ARRIVAL and TENANT_DEPARTURE
        throw newError(ValidationError, `For ${eventType} events a venue/tenant pair is required.`)
      }
      break
    default:
      if (!(eventType in LocationEventTypes)) {
        throw newError(ValidationError, `${eventType} is an invalid event type.`)
      }
  }

  return eventFields
}

const validateGeoLocationField = (eventFields: LocationEventFields): LocationEventFields => {
  if (eventFields.geoLocation) {
    const validGeoLocation = validateGeoLocation(eventFields.geoLocation)
    if (validGeoLocation) {
      eventFields.geoLocation = validGeoLocation
    } else {
      console.warn("recordLocationEvent received invalid geoLocation: " + JSON.stringify(eventFields.geoLocation))
    }
  }
  return eventFields
}

const parseBarcode = async (eventFields: LocationEventFields): Promise<CarrierTrackingCode | undefined> => {
  if (!eventFields.bwBarcode) {
    return undefined
  }
  const finderRegistry = new TrackingDataFinderRegistry()
  const parsedBarcode = await finderRegistry.lookup(eventFields.bwBarcode)
  if (!parsedBarcode) {
    throw newError(ValidationError, `Invalid barcode ${eventFields.bwBarcode}`)
  }
  // Only accept BW barcodes. If for some reason we get a new type of barcode
  // that we can also accept for locations, it needs to be handled here.
  if (parsedBarcode.carrierCode !== bwFinder.code) {
    throw newError(ValidationError, `Invalid barcode ${eventFields.bwBarcode}`)
  }
  return parsedBarcode
}

const processVenueBarcode = async ({
  bwBarcode,
  venueCode,
  venueId,
}: {
  bwBarcode?: string
  venueCode?: string
  venueId?: string
}): Promise<Venue> => {
  let venue: Venue | null = null
  let msg = "At least one of (bwBarcode, venueCode, venueId) is required."

  if (bwBarcode) {
    venue = await client.getVenueByBWBarcode(bwBarcode)
    msg = `Venue barcode ${bwBarcode} does not exist`
  } else if (venueCode) {
    venue = await client.getVenueByCode(venueCode)
    msg = `Venue code ${venueCode} does not exist`
  } else if (venueId) {
    venue = await client.getVenue(venueId)
    msg = `Venue Id ${venueId} does not exist`
  }

  if (!venue) {
    throw newError(NotFoundError, msg)
  }

  return venue
}

interface TenantBarcodeParseResult {
  venue: Venue
  tenant: Tenant
}
const processTenantBarcode = async (parsedBarcode: CarrierTrackingCode): Promise<TenantBarcodeParseResult> => {
  const subFields = bwFinder.parseBWTenantBarcode(parsedBarcode)
  const venue = await processVenueBarcode({ venueCode: subFields.venueCode })

  const tenant = venue.tenants.find((t) => t.bwBarcode === parsedBarcode.trackingCode) as Tenant | undefined
  if (!tenant) {
    throw newError(
      NotFoundError,
      `Tenant barcode ${parsedBarcode.trackingCode} does not exist in Venue ${subFields.venueCode}`,
    )
  }
  return { venue, tenant }
}

const processParsedBarcode = async (parsedBarcode: CarrierTrackingCode, bwBarcode?: string) => {
  if (parsedBarcode.barcodeType === BarcodeType.VENUE) {
    const venue = await processVenueBarcode({ bwBarcode: parsedBarcode.trackingCode })
    return { venue }
  } else if (parsedBarcode.barcodeType === BarcodeType.TENANT) {
    const result = await processTenantBarcode(parsedBarcode)

    return { venue: result.venue, tenant: result.tenant }
  } else {
    throw newError(ValidationError, `Invalid barcode type ${bwBarcode}`)
  }
}

const processVenueAndTenant = async (venueSummary: VenueSummary, tenantRef: TenantRef) => {
  await validateVenueAndTenantId(client, venueSummary.id, tenantRef.id, "Invalid venue or tenant id.")
  const venue = await processVenueBarcode({ venueId: venueSummary.id })
  const tenant = venue.tenants.find((t) => t.id === tenantRef.id)

  return { venue, tenant }
}

const createLocationEvent = async (
  userCtx: UserContext,
  eventFields: LocationEventFields,
  parsedBarcode?: CarrierTrackingCode,
): Promise<LocationEvent> => {
  let value: { venue?: VenueSummary; tenant?: TenantRef } = {
    venue: undefined,
    tenant: undefined,
  }

  if (parsedBarcode) {
    const result = await processParsedBarcode(parsedBarcode, eventFields.bwBarcode)
    value = { ...value, ...result }
  } else if (eventFields.venue && eventFields.tenant) {
    const result = await processVenueAndTenant(eventFields.venue, eventFields.tenant)
    value = { ...value, ...result }
  }

  const { tenant, venue } = value

  return {
    ...eventFields,
    user: BWUser.summary(userCtx.user),
    ...(tenant && {
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
    }),
    ...(venue && {
      venue: {
        id: venue.id,
        name: venue.name,
      },
    }),
  }
}

// send location event to kinesis data stream
const sendRecordsToStreamClient = async (event: LocationEvent) => {
  if (!streamClient) {
    return
  }
  return Promise.resolve()
    .then(() => locationEventMapper.map([event]))
    .then(streamClient.putRecords)
    .catch((e: unknown) => {
      const err = newError(InternalError, STREAM_PRODUCER_ERROR, e as Error)
      console.error(err)
    })
}

export const testable = { parseBarcode, createLocationEvent, STREAM_PRODUCER_ERROR }
