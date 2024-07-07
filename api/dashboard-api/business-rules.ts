import * as Middleware from '@proton/middleware';
import {
  OrderState,
  OrderType,
} from '@proton/middleware/soap/generated/types/order-v1';

export function hasPayment(status: OrderState | undefined): boolean {
  return status === OrderState.INVOICING;
}

export function getVehicleName(
  vehicle: Middleware.Types.VehicleV1.IVehicleConfiguration | null
): string {
  const make = vehicle && vehicle.make ? vehicle.make.name : null;
  const model = vehicle && vehicle.model ? vehicle.model.name : null;
  const year =
    vehicle && vehicle.year && vehicle.year !== '0000'
      ? "'" + vehicle.year.substr(2)
      : null;
  const yearMakeModel =
    year && make && model ? year + ' ' + make + ' ' + model : '';

  return yearMakeModel;
}

export function isCarryout(
  orderType: OrderType | undefined,
  vehicleName: string
): boolean {
  return orderType !== OrderType.TACCOMMERCIAL_ORDER && vehicleName === '';
}
