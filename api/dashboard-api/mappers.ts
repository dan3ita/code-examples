import * as BusinessRules from '@proton/api/dashboard/business-rules';
import * as Models from '@proton/api/dashboard/models/generated';
import * as Middleware from '@proton/middleware';
import { StoreBrand } from '@proton/middleware/soap/generated/types/store-v1';

// ----------------------------------------
//
//  Mapping Functions
//
// ----------------------------------------
export function mapSoaDocument(
  wo: Middleware.Endpoints.OrderworkingV1.IWorkingOrderView
): Models.IDocument {
  // Define Customer Name and Phone
  const cusFirstName =
    wo.customerFirstName && wo.customerFirstName !== ''
      ? wo.customerFirstName
      : '';
  const cusLastName =
    wo.customerLastName && wo.customerLastName !== ''
      ? wo.customerLastName
      : '';
  const cusPhone = wo.customerPhoneNumber ? wo.customerPhoneNumber : '';

  // Define Vehicle Info
  const vehConfig =
    wo.vehicle && wo.vehicle.vehicleConfiguration
      ? wo.vehicle.vehicleConfiguration
      : null;
  const vehName = BusinessRules.getVehicleName(vehConfig);

  // Define Order Info
  const orderId = wo.orderID ? wo.orderID : '';
  const status = wo.customerStatus ? wo.customerStatus : '';
  const oStatus = wo.orderStatus ? wo.orderStatus : '';
  const oType = wo.orderType ? wo.orderType : '';
  const ss = wo.sourceSystem ? wo.sourceSystem : '';
  const aiStatus = wo.aiStatus ? wo.aiStatus : undefined;

  // Business Rules
  const pmtApplied = BusinessRules.hasPayment(wo.orderStatus);
  const carryout = BusinessRules.isCarryout(wo.orderType, vehName);
  const pmtStatus = wo.paymentStatus ? wo.paymentStatus : undefined;

  return {
    aiStatus,
    customer: {
      firstName: cusFirstName,
      lastName: cusLastName,
      phone: cusPhone
    },
    customerStatus: status,
    hasPayment: pmtApplied,
    isCarryout: carryout,
    orderID: orderId,
    orderStatus: oStatus,
    orderType: oType,
    paymentStatus: pmtStatus,
    sourceSystem: ss,
    vehicle: {
      name: vehName
    }
  };
}

export function mapBrandIdToBrandLogo(id?: string): Models.BrandLogo {
  switch (id) {
    case StoreBrand.BIG_O:
    case StoreBrand.BIG_O_DEVELOPMENT:
    case StoreBrand.BIG_O_LAS_VEGAS:
    case StoreBrand.BIG_O_TIREOF_IDAHO:
      return Models.BrandLogo.BIG_O;
    case StoreBrand.MERCHANTS:
      return Models.BrandLogo.MERCHANTS;
    case StoreBrand.NTW:
    case StoreBrand.NTB:
      return Models.BrandLogo.NTB;
    case StoreBrand.TK_EXPRESS_SPEEDEE_OIL:
      return Models.BrandLogo.TK_EXPRESS;
    default:
      return Models.BrandLogo.TK;
  }
}
