import {
  GeoLocation,
  LocationEvent,
  LocationEventTypes,
  NotFoundError,
  TenantRef,
  User,
  ValidationError,
  Venue,
  VenueSummary,
} from "bootworks-common"
import { DBClient } from "../../../lib/db/db.methods"
import { MongoDBClient } from "../../../lib/db/mongo/mongo"
import { MockUtil } from "../../../__tests__/_mock.util"
import { Request } from "../../../interfaces/models/core/Request"
import { userContext, UserContext } from "../../util/UserContext"
import { getAuthorizerClaims } from "../../../lambda/util/authorizerUtil"

const mockPutRecords = jest.fn().mockImplementation()
import { recordLocationEvent, testable } from "../recordLocationEvent"
const { parseBarcode, createLocationEvent, STREAM_PRODUCER_ERROR } = testable

const mockUtil: MockUtil = new MockUtil()
const mockUser = mockUtil.mockUser()

const mockEvent = mockUtil.mockAPIGatewayRequest()
mockEvent.requestContext.authorizer!.jwt.claims.permissions = "[read:mine write:delivery:status write]"
const mockClaims = getAuthorizerClaims(mockEvent)
let mockUserContext: UserContext

const DEFAULT_VENUE_ID = "22222222-2222-2222-2222-222222222222"
const DEFAULT_TENANT_ID = "77777777-7777-7777-7777-777777777777"
const VALID_VENUE_BARCODE = "BWV000000000565"
const INVALID_VENUE_BARCODE = "BWV99999999999"
const VALID_TENANT_BARCODE = "BWTTST-1_0000000001"
const TENANT_BARCODE_WITH_BAD_VENUE = "BWTBADCODE_0000000001"
const INVALID_TENANT_BARCODE = "BWTTST-1_99999999999"

const mockRecordLocationEventFn = jest.fn((e) => e)

jest.mock("../../../lib/db/mongo/mongo", () => {
  return {
    MongoDBClient: class MockDBClient {
      connect = async (): Promise<boolean> => {
        return true
      }
      getUser = async (_identityKey: string): Promise<User | null> => {
        return mockUser
      }
      updateUser = async (user: User): Promise<User> => {
        return user
      }
      recordLocationEvent = (evt: LocationEvent) => mockRecordLocationEventFn(evt)
      getVenue = async (venueId: string): Promise<Venue | null> => {
        if (venueId !== "nonexistent") {
          return Promise.resolve(mockUtil.mockVenue(venueId))
        }
        return Promise.resolve(null)
      }
      getVenueByCode = async (venueCode: string): Promise<Venue | null> => {
        if (venueCode === "TST-1") {
          return Promise.resolve(mockUtil.mockVenue(DEFAULT_VENUE_ID))
        }
        return Promise.resolve(null)
      }
      getVenueByBWBarcode = async (barcode: string): Promise<Venue | null> => {
        if (barcode !== INVALID_VENUE_BARCODE) {
          return Promise.resolve(mockUtil.mockVenue(DEFAULT_VENUE_ID))
        }
        return Promise.resolve(null)
      }
      findTenant = async (venueId: string, tenantId: string) => {
        if (venueId === DEFAULT_VENUE_ID && tenantId === DEFAULT_TENANT_ID) {
          return Promise.resolve(mockUtil.mockTenant(DEFAULT_TENANT_ID))
        }
        return Promise.resolve(null)
      }
    },
  }
})

jest.mock("../../../lib/streams/client", () => {
  return {
    EventStreamClient: class MockEventStreamClient {
      putRecords = mockPutRecords.mockImplementation()
    },
  }
})

const mockLocationEvent = ({
  bwBarcode,
  geoLocation,
  venue,
  tenant,
  eventType,
}: {
  bwBarcode?: string
  geoLocation?: GeoLocation
  venue?: VenueSummary
  tenant?: TenantRef
  eventType?: LocationEventTypes
}) => {
  return {
    eventType: LocationEventTypes.DEVICE_LOCATION,
    timestamp: new Date(),
    ...(eventType && { eventType }),
    ...(bwBarcode && { bwBarcode }),
    ...(geoLocation && { geoLocation }),
    ...(tenant && { tenant }),
    ...(venue && { venue }),
  }
}

const mockLocationEventWithStringDate = (bwBarcode?: string, geoLocation?: GeoLocation) => {
  return {
    eventType: LocationEventTypes.DEVICE_LOCATION,
    timestamp: "2021-06-15T15:47:50.685Z",
    ...(bwBarcode && { bwBarcode }),
    ...(geoLocation && { geoLocation }),
  }
}

const mockRequest = (body: any | null) => {
  if (body) {
    return new Request({
      queryParams: {},
      body: JSON.stringify(body),
    })
  }
  return new Request({
    queryParams: {},
  })
}

const mockClient: DBClient = new MongoDBClient()

describe("recordLocationEvent", () => {
  beforeAll(async () => {
    mockUserContext = await userContext(mockClient, mockClaims)
  })

  beforeEach(() => {
    mockPutRecords.mockClear()
    mockRecordLocationEventFn.mockClear()
  })

  //
  // recordLocationEvent
  //
  it("should fail with an invalid body", async () => {
    expect.assertions(3)

    const request = mockRequest(null)
    const br = await recordLocationEvent(request, mockClaims)

    expect(br.ok).toBe(false)
    expect(br.err).toBeInstanceOf(ValidationError)
    expect(mockRecordLocationEventFn).not.toHaveBeenCalled()
  })

  it("should return an error when event validation fails", async () => {
    expect.assertions(3)

    const event = mockLocationEvent({})
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)

    expect(br.ok).toBe(false)
    expect(br.err).toBeInstanceOf(ValidationError)
    expect(mockRecordLocationEventFn).not.toHaveBeenCalled()
  })

  it("should return an error when event type is missing", async () => {
    expect.assertions(4)

    const event = {}
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)
    expect(br.ok).toBe(false)
    expect(br.err).toBeInstanceOf(ValidationError)
    expect(br.err!.message).toBe("An event type is required.")
    expect(mockRecordLocationEventFn).not.toHaveBeenCalled()
  })

  it("should return an error when event type is invalid", async () => {
    expect.assertions(4)
    const INVALID_TYPE = "INVALID"
    const event = { eventType: INVALID_TYPE }
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)
    expect(br.ok).toBe(false)
    expect(br.err).toBeInstanceOf(ValidationError)
    expect(br.err!.message).toBe(`${INVALID_TYPE} is an invalid event type.`)
    expect(mockRecordLocationEventFn).not.toHaveBeenCalled()
  })

  it(`should return an error when bwBarcode or geolocation is missing for ${LocationEventTypes.DEVICE_LOCATION} events`, async () => {
    expect.assertions(4)

    const event = mockLocationEvent({ eventType: LocationEventTypes.DEVICE_LOCATION })
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)
    expect(br.ok).toBe(false)
    expect(br.err).toBeInstanceOf(ValidationError)
    expect(br.err!.message).toBe(
      `For ${LocationEventTypes.DEVICE_LOCATION} events at least one of (bwBarcode, geoLocation) is required.`,
    )
    expect(mockRecordLocationEventFn).not.toHaveBeenCalled()
  })

  it(`should return an error when venue is missing for ${LocationEventTypes.TENANT_ARRIVAL} events`, async () => {
    expect.assertions(4)
    const mockTenant = { ...mockUtil.mockTenant(), id: DEFAULT_TENANT_ID }

    const event = mockLocationEvent({ eventType: LocationEventTypes.TENANT_ARRIVAL, tenant: mockTenant })
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)
    expect(br.ok).toBe(false)
    expect(br.err).toBeInstanceOf(ValidationError)
    expect(br.err!.message).toBe(`For ${LocationEventTypes.TENANT_ARRIVAL} events a venue/tenant pair is required.`)
    expect(mockRecordLocationEventFn).not.toHaveBeenCalled()
  })

  it(`should return an error when tenant is missing for ${LocationEventTypes.TENANT_ARRIVAL} events`, async () => {
    expect.assertions(4)
    const mockVenue = { ...mockUtil.mockVenue(), id: DEFAULT_VENUE_ID }

    const event = mockLocationEvent({ eventType: LocationEventTypes.TENANT_ARRIVAL, venue: mockVenue })
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)
    expect(br.ok).toBe(false)
    expect(br.err).toBeInstanceOf(ValidationError)
    expect(br.err!.message).toBe(`For ${LocationEventTypes.TENANT_ARRIVAL} events a venue/tenant pair is required.`)
    expect(mockRecordLocationEventFn).not.toHaveBeenCalled()
  })

  it(`should return an error when venue is missing for ${LocationEventTypes.TENANT_DEPARTURE} events`, async () => {
    expect.assertions(4)
    const mockTenant = { ...mockUtil.mockTenant(), id: DEFAULT_TENANT_ID }

    const event = mockLocationEvent({ eventType: LocationEventTypes.TENANT_DEPARTURE, tenant: mockTenant })
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)
    expect(br.ok).toBe(false)
    expect(br.err).toBeInstanceOf(ValidationError)
    expect(br.err!.message).toBe(`For ${LocationEventTypes.TENANT_DEPARTURE} events a venue/tenant pair is required.`)
    expect(mockRecordLocationEventFn).not.toHaveBeenCalled()
  })

  it(`should return an error when tenant is missing for ${LocationEventTypes.TENANT_DEPARTURE} events`, async () => {
    expect.assertions(4)
    const mockVenue = { ...mockUtil.mockVenue(), id: DEFAULT_VENUE_ID }

    const event = mockLocationEvent({ eventType: LocationEventTypes.TENANT_DEPARTURE, venue: mockVenue })
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)
    expect(br.ok).toBe(false)
    expect(br.err).toBeInstanceOf(ValidationError)
    expect(br.err!.message).toBe(`For ${LocationEventTypes.TENANT_DEPARTURE} events a venue/tenant pair is required.`)
    expect(mockRecordLocationEventFn).not.toHaveBeenCalled()
  })

  it("should record a location event and send to kinesis", async () => {
    expect.assertions(5)

    const event = mockLocationEvent({ bwBarcode: VALID_TENANT_BARCODE, eventType: LocationEventTypes.DEVICE_LOCATION })
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)

    expect(br.ok).toBe(true)
    expect(br.data!.venue!.id).toBe(DEFAULT_VENUE_ID)
    expect(br.data!.bwBarcode).toBe(VALID_TENANT_BARCODE)
    expect(mockRecordLocationEventFn).toHaveBeenCalled()
    expect(mockPutRecords).toHaveBeenCalled()
  })

  it("should convert timestamp to Date", async () => {
    expect.assertions(8)

    const event = mockLocationEventWithStringDate(VALID_TENANT_BARCODE)
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)

    expect(br.ok).toBe(true)
    expect(br.data!.bwBarcode).toBe(VALID_TENANT_BARCODE)
    expect(br.data!.venue!.id).toBe(DEFAULT_VENUE_ID)
    expect(br.data!.tenant!.id).toBe(MockUtil.DEFAULT_TENANT_ID)
    expect(br.data!.user.identityKey).toBe(mockUserContext.user.identityKey)
    expect((br.data!.timestamp as Date).getTime()).toBe(new Date("2021-06-15T15:47:50.685Z").getTime())
    expect(mockRecordLocationEventFn).toHaveBeenCalled()
    expect(mockPutRecords).toHaveBeenCalled()
  })

  it("should still record a location event on kinesis failure", async () => {
    expect.assertions(6)
    mockPutRecords.mockRejectedValueOnce("fail")

    const consoleSpy = jest.spyOn(console, "error")
    consoleSpy.mockImplementation()

    const event = mockLocationEvent({ bwBarcode: VALID_TENANT_BARCODE, eventType: LocationEventTypes.DEVICE_LOCATION })
    const request = mockRequest(event)
    const br = await recordLocationEvent(request, mockClaims)

    expect(br.ok).toBe(true)
    expect(br.data!.venue!.id).toBe(DEFAULT_VENUE_ID)
    expect(br.data!.bwBarcode).toBe(VALID_TENANT_BARCODE)
    expect(mockRecordLocationEventFn).toHaveBeenCalled()
    expect(mockPutRecords).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(expect.objectContaining({ message: STREAM_PRODUCER_ERROR }))
  })

  //
  // createLocationEvent
  //
  describe("CreateLocationEvent", () => {
    let eventType = { eventType: LocationEventTypes.DEVICE_LOCATION }

    it("should fail if a non-claimed barcode is used", async () => {
      expect.assertions(2)

      const event = mockLocationEvent({ ...eventType, bwBarcode: "hello" })
      try {
        await parseBarcode(event)
        fail()
      } catch (e) {
        expect(e).toBeTruthy()
        expect(e).toBeInstanceOf(NotFoundError)
      }
    })

    it("should fail if a non-Bootworks barcode is used", async () => {
      expect.assertions(2)

      const event = mockLocationEvent({ ...eventType, bwBarcode: "1ZMOCKNOTBOOTWORK0" })
      try {
        await parseBarcode(event)
        fail()
      } catch (e) {
        expect(e).toBeTruthy()
        expect(e).toBeInstanceOf(ValidationError)
      }
    })

    it("should fail if an invalid venue barcode is used", async () => {
      expect.assertions(2)

      const event = mockLocationEvent({ ...eventType, bwBarcode: INVALID_VENUE_BARCODE })
      try {
        const parsedBarcode = await parseBarcode(event)
        await createLocationEvent(mockUserContext, event, parsedBarcode)
        fail()
      } catch (e) {
        expect(e).toBeTruthy()
        expect(e).toBeInstanceOf(NotFoundError)
      }
    })

    it("should succeed if a valid venue barcode is used and return the venue ID", async () => {
      expect.assertions(3)

      const event = mockLocationEvent({ ...eventType, bwBarcode: VALID_VENUE_BARCODE })
      const parsedBarcode = await parseBarcode(event)
      const created = await createLocationEvent(mockUserContext, event, parsedBarcode)
      expect(created.venue!.id).toBe(DEFAULT_VENUE_ID)
      expect(created.user.identityKey).toBe(mockUserContext.user.identityKey)
      expect(created).not.toHaveProperty("tenant")
    })

    it("should fail if given a tenant barcode with an invalid venue", async () => {
      expect.assertions(2)

      const event = mockLocationEvent({ ...eventType, bwBarcode: TENANT_BARCODE_WITH_BAD_VENUE })
      try {
        const parsedBarcode = await parseBarcode(event)
        await createLocationEvent(mockUserContext, event, parsedBarcode)
        fail()
      } catch (e) {
        expect(e).toBeTruthy()
        expect(e).toBeInstanceOf(NotFoundError)
      }
    })

    it("should fail if given a tenant barcode that doesn't exist", async () => {
      expect.assertions(2)

      const event = mockLocationEvent({ ...eventType, bwBarcode: INVALID_TENANT_BARCODE })
      try {
        const parsedBarcode = await parseBarcode(event)
        await createLocationEvent(mockUserContext, event, parsedBarcode)
        fail()
      } catch (e) {
        expect(e).toBeTruthy()
        expect(e).toBeInstanceOf(NotFoundError)
      }
    })

    it("should succeed if a valid tenant barcode is used", async () => {
      expect.assertions(3)

      const event = mockLocationEvent({ ...eventType, bwBarcode: VALID_TENANT_BARCODE })
      const parsedBarcode = await parseBarcode(event)
      const created = await createLocationEvent(mockUserContext, event, parsedBarcode)
      expect(created.venue!.id).toBe(DEFAULT_VENUE_ID)
      expect(created.user.identityKey).toBe(mockUserContext.user.identityKey)
      expect(created.tenant!.id).toBe(MockUtil.DEFAULT_TENANT_ID)
    })

    it("should succeed if only a geoLocation is used", async () => {
      expect.assertions(4)

      const geoLocation = {
        latitude: 47.6,
        longitude: -122.3,
        accuracy: 1.5,
        timestamp: "2001-07-20T20:17:40Z",
      }
      const event = mockLocationEvent({ ...eventType, geoLocation })
      const created = await createLocationEvent(mockUserContext, event)

      expect(created.user.identityKey).toBe(mockUserContext.user.identityKey)
      expect(created).not.toHaveProperty("venue")
      expect(created).not.toHaveProperty("tenant")
      expect(created.geoLocation).toStrictEqual(geoLocation)
    })

    describe("Events with tenant and Venue", () => {
      eventType = { eventType: LocationEventTypes.TENANT_ARRIVAL }

      it("should succeed if only tenant and venue are used", async () => {
        expect.assertions(5)
        const mockVenue = { ...mockUtil.mockVenue(), id: DEFAULT_VENUE_ID }
        const mockTenant = { ...mockUtil.mockTenant(), id: DEFAULT_TENANT_ID }

        const event = mockLocationEvent({ ...eventType, venue: mockVenue, tenant: mockTenant })
        const eventLog = await createLocationEvent(mockUserContext, event)

        expect(eventLog.user.identityKey).toBe(mockUserContext.user.identityKey)
        expect(eventLog.venue).toEqual({ id: mockVenue.id, name: mockVenue.name })
        expect(eventLog.tenant).toEqual({ id: mockTenant.id, name: mockTenant.name })
        expect(event).not.toHaveProperty("geoLocation")
        expect(event).not.toHaveProperty("bwBarcode")
      })

      it("should fail if  tenant is invalid", async () => {
        expect.assertions(3)
        const mockVenue = { ...mockUtil.mockVenue(), id: DEFAULT_VENUE_ID }
        const mockTenant = { ...mockUtil.mockTenant(), id: "INVALID_TENANT_ID" }
        const event = mockLocationEvent({ ...eventType, venue: mockVenue, tenant: mockTenant })
        try {
          await createLocationEvent(mockUserContext, event)
          fail()
        } catch (e: any) {
          expect(e).toBeTruthy()
          expect(e).toBeInstanceOf(NotFoundError)
          expect(e.message).toBe("Invalid venue or tenant id.")
        }
      })

      it("should fail if  venue is invalid", async () => {
        expect.assertions(3)
        const mockVenue = { ...mockUtil.mockVenue(), id: "INVALID_VENUE_ID" }
        const mockTenant = { ...mockUtil.mockTenant(), id: DEFAULT_VENUE_ID }
        const event = mockLocationEvent({ ...eventType, venue: mockVenue, tenant: mockTenant })
        try {
          await createLocationEvent(mockUserContext, event)
          fail()
        } catch (e: any) {
          expect(e).toBeTruthy()
          expect(e).toBeInstanceOf(NotFoundError)
          expect(e.message).toBe("Invalid venue or tenant id.")
        }
      })
    })
  })
})
