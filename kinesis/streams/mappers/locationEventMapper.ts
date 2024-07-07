import { StreamMapper } from "../streamMapper"
import { LocationEvent } from "bootworks-common"
import { StreamLimits } from "../model/streamEvent"

export class LocationEventStreamMapper extends StreamMapper<LocationEvent> {
  constructor(props: StreamLimits) {
    super(props)
  }

  getDataBlob = (data: LocationEvent): string => {
    return JSON.stringify(data)
  }

  getPartitionKeyParts = (data: LocationEvent): string[] => {
    return [this.DEFAULT_OPERATOR_PREFIX, data.user.identityKey]
  }
}
