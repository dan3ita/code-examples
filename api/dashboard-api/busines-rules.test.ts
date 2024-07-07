import * as BusinessRules from '@proton/api/dashboard/business-rules';
import {
  OrderState,
  OrderType,
} from '@proton/middleware/soap/generated/types/order-v1';
import { IVehicleConfiguration } from '@proton/middleware/soap/generated/types/vehicle-v1';

// tslint:disable:no-unused-expression
describe('Proton.Api.Dashboard', () => {
  describe('Business Rules', () => {
    it('Should return true or false for payment based on order status', () => {
      const abandon = BusinessRules.hasPayment(OrderState.ABANDONED);
      expect(abandon).not.toBeUndefined;
      expect(abandon).toBeFalsy;

      const appt = BusinessRules.hasPayment(OrderState.APPOINTMENT);
      expect(appt).not.toBeUndefined;
      expect(appt).toBeFalsy;

      const blocked = BusinessRules.hasPayment(OrderState.BLOCKED);
      expect(blocked).not.toBeUndefined;
      expect(blocked).toBeFalsy;

      const canceled = BusinessRules.hasPayment(OrderState.CANCELED);
      expect(canceled).not.toBeUndefined;
      expect(canceled).toBeFalsy;

      const completed = BusinessRules.hasPayment(OrderState.COMPLETED);
      expect(completed).not.toBeUndefined;
      expect(completed).toBeFalsy;

      const creditBlock = BusinessRules.hasPayment(
        OrderState.CREDIT_BLOCKED
      );
      expect(creditBlock).not.toBeUndefined;
      expect(creditBlock).toBeFalsy;

      const estimating = BusinessRules.hasPayment(OrderState.ESTIMATING);
      expect(estimating).not.toBeUndefined;
      expect(estimating).toBeFalsy;

      const initial = BusinessRules.hasPayment(OrderState.INITIAL);
      expect(initial).not.toBeUndefined;
      expect(initial).toBeFalsy;

      const invoicing = BusinessRules.hasPayment(OrderState.INVOICING);
      expect(invoicing).not.toBeUndefined;
      expect(invoicing).toBeTruthy;

      const partialProcessed = BusinessRules.hasPayment(
        OrderState.PARTIALLY_PROCESSED
      );
      expect(partialProcessed).not.toBeUndefined;
      expect(partialProcessed).toBeFalsy;

      const quoting = BusinessRules.hasPayment(OrderState.QUOTING);
      expect(quoting).not.toBeUndefined;
      expect(quoting).toBeFalsy;

      const received = BusinessRules.hasPayment(OrderState.RECEIVED);
      expect(received).not.toBeUndefined;
      expect(received).toBeFalsy;

      const workComp = BusinessRules.hasPayment(
        OrderState.WORKING_COMPLETE
      );
      expect(workComp).not.toBeUndefined;
      expect(workComp).toBeFalsy;

      const workInBay = BusinessRules.hasPayment(
        OrderState.WORKING_IN_BAY
      );
      expect(workInBay).not.toBeUndefined;
      expect(workInBay).toBeFalsy;

      const workNonBay = BusinessRules.hasPayment(
        OrderState.WORKING_NON_BAY
      );
      expect(workNonBay).not.toBeUndefined;
      expect(workNonBay).toBeFalsy;

      const workWaiting = BusinessRules.hasPayment(
        OrderState.WORKING_WAITING
      );
      expect(workWaiting).not.toBeUndefined;
      expect(workWaiting).toBeFalsy;

      const none = BusinessRules.hasPayment(undefined);
      expect(none).toBeUndefined;
      expect(none).toBeFalsy;
    });

    it('Should return an empty vehicle name', () => {
      const config = {
        make: '',
        model: '',
        year: '',
      };
      const vehicleName = BusinessRules.getVehicleName(
        config as IVehicleConfiguration
      );
      expect(vehicleName).toBeNull;
    });

    it('Should return an empty vehicle name when no make available', () => {
      const config = {
        make: '',
        model: {
          name: 'COUNTRYMAN',
        },
        year: '2016',
      };
      const vehicleName = BusinessRules.getVehicleName(
        config as IVehicleConfiguration
      );
      expect(vehicleName).toBeUndefined;
      expect(vehicleName).toEqual('');
    });

    it('Should return an empty vehicle name when no model available', () => {
      const config = {
        make: {
          name: 'MINI',
        },
        model: '',
        year: '2016',
      };
      const vehicleName = BusinessRules.getVehicleName(
        config as IVehicleConfiguration
      );
      expect(vehicleName).toBeUndefined;
      expect(vehicleName).toEqual('');
    });

    it('Should return an empty vehicle name when no year available', () => {
      const config = {
        make: {
          name: 'MINI',
        },
        model: {
          name: 'COUNTRYMAN',
        },
        year: '',
      };
      const vehicleName = BusinessRules.getVehicleName(
        config as IVehicleConfiguration
      );
      expect(vehicleName).toBeUndefined;
      expect(vehicleName).toEqual('');
    });

    it('Should return a constructed vehicle name', () => {
      const config = {
        make: {
          name: 'MINI',
        },
        model: {
          name: 'COUNTRYMAN',
        },
        year: '2016',
      };
      const vehicleName = BusinessRules.getVehicleName(
        config as IVehicleConfiguration
      );
      expect(vehicleName).toBeDefined;
      expect(vehicleName).toEqual("'16 MINI COUNTRYMAN");
    });

    it('Should return false for carryout when a vehicle name is given', () => {
      const vehicleName = '86 Mitsubishi GT';
      const ar = BusinessRules.isCarryout(OrderType.AR, vehicleName);
      expect(ar).toBeDefined;
      expect(ar).toBeFalsy;

      const batteryCore = BusinessRules.isCarryout(
        OrderType.BATTERY_CORE_RETURN_ORDER,
        vehicleName
      );
      expect(batteryCore).toBeDefined;
      expect(batteryCore).toBeFalsy;

      const c4 = BusinessRules.isCarryout(OrderType.C4, vehicleName);
      expect(c4).toBeDefined;
      expect(c4).toBeFalsy;

      const commercial = BusinessRules.isCarryout(
        OrderType.COMMERCIAL,
        vehicleName
      );
      expect(commercial).toBeDefined;
      expect(commercial).toBeFalsy;

      const national = BusinessRules.isCarryout(
        OrderType.NATIONAL_ACCOUNT,
        vehicleName
      );
      expect(national).toBeDefined;
      expect(national).toBeFalsy;

      const priceAdj = BusinessRules.isCarryout(
        OrderType.PRICE_ADJUSTMENT_ORDER,
        vehicleName
      );
      expect(priceAdj).toBeDefined;
      expect(priceAdj).toBeFalsy;

      const returnCred = BusinessRules.isCarryout(
        OrderType.RETURN_CREDIT_MEMO_ORDER,
        vehicleName
      );
      expect(returnCred).toBeDefined;
      expect(returnCred).toBeFalsy;

      const rod = BusinessRules.isCarryout(OrderType.ROD, vehicleName);
      expect(rod).toBeDefined;
      expect(rod).toBeFalsy;

      const tacCom = BusinessRules.isCarryout(
        OrderType.TACCOMMERCIAL_ORDER,
        vehicleName
      );
      expect(tacCom).toBeDefined;
      expect(tacCom).toBeFalsy;

      const tacReturn = BusinessRules.isCarryout(
        OrderType.TACCOMMERCIAL_RETURN_ORDER,
        vehicleName
      );
      expect(tacReturn).toBeDefined;
      expect(tacReturn).toBeFalsy;

      const tacAcct = BusinessRules.isCarryout(
        OrderType.TACNATIONAL_ACCOUNT_ORDER,
        vehicleName
      );
      expect(tacAcct).toBeDefined;
      expect(tacAcct).toBeFalsy;

      const tacAcctReturn = BusinessRules.isCarryout(
        OrderType.TACNATIONAL_ACCOUNT_RETURN_ORDER,
        vehicleName
      );
      expect(tacAcctReturn).toBeDefined;
      expect(tacAcctReturn).toBeFalsy;

      const tacOrder = BusinessRules.isCarryout(
        OrderType.TACORDER,
        vehicleName
      );
      expect(tacOrder).toBeDefined;
      expect(tacOrder).toBeFalsy;

      const tacRet = BusinessRules.isCarryout(
        OrderType.TACRETURN_ORDER,
        vehicleName
      );
      expect(tacRet).toBeDefined;
      expect(tacRet).toBeFalsy;

      const tKoms = BusinessRules.isCarryout(OrderType.TKOMSORDER, vehicleName);
      expect(tKoms).toBeDefined;
      expect(tKoms).toBeFalsy;

      const walkIn = BusinessRules.isCarryout(OrderType.WALK_IN, vehicleName);
      expect(walkIn).toBeDefined;
      expect(walkIn).toBeFalsy;

      const warranty = BusinessRules.isCarryout(
        OrderType.WARRANTY_ADJUSTMENT_ORDER,
        vehicleName
      );
      expect(warranty).toBeDefined;
      expect(warranty).toBeFalsy;
    });

    it('Should return true or false for carryout based on order type when vehicle name empty', () => {
      const noVehicleName = '';
      const ar = BusinessRules.isCarryout(OrderType.AR, noVehicleName);
      expect(ar).toBeDefined;
      expect(ar).toBeTruthy;

      const batteryCore = BusinessRules.isCarryout(
        OrderType.BATTERY_CORE_RETURN_ORDER,
        noVehicleName
      );
      expect(batteryCore).toBeDefined;
      expect(batteryCore).toBeTruthy;

      const c4 = BusinessRules.isCarryout(OrderType.C4, noVehicleName);
      expect(c4).toBeDefined;
      expect(c4).toBeTruthy;

      const commercial = BusinessRules.isCarryout(
        OrderType.COMMERCIAL,
        noVehicleName
      );
      expect(commercial).toBeDefined;
      expect(commercial).toBeTruthy;

      const national = BusinessRules.isCarryout(
        OrderType.NATIONAL_ACCOUNT,
        noVehicleName
      );
      expect(national).toBeDefined;
      expect(national).toBeTruthy;

      const priceAdj = BusinessRules.isCarryout(
        OrderType.PRICE_ADJUSTMENT_ORDER,
        noVehicleName
      );
      expect(priceAdj).toBeDefined;
      expect(priceAdj).toBeTruthy;

      const returnCred = BusinessRules.isCarryout(
        OrderType.RETURN_CREDIT_MEMO_ORDER,
        noVehicleName
      );
      expect(returnCred).toBeDefined;
      expect(returnCred).toBeTruthy;

      const rod = BusinessRules.isCarryout(OrderType.ROD, noVehicleName);
      expect(rod).toBeDefined;
      expect(rod).toBeTruthy;

      const tacCom = BusinessRules.isCarryout(
        OrderType.TACCOMMERCIAL_ORDER,
        noVehicleName
      );
      expect(tacCom).toBeDefined;
      expect(tacCom).toBeFalsy;

      const tacReturn = BusinessRules.isCarryout(
        OrderType.TACCOMMERCIAL_RETURN_ORDER,
        noVehicleName
      );
      expect(tacReturn).toBeDefined;
      expect(tacReturn).toBeTruthy;

      const tacAcct = BusinessRules.isCarryout(
        OrderType.TACNATIONAL_ACCOUNT_ORDER,
        noVehicleName
      );
      expect(tacAcct).toBeDefined;
      expect(tacAcct).toBeTruthy;

      const tacAcctReturn = BusinessRules.isCarryout(
        OrderType.TACNATIONAL_ACCOUNT_RETURN_ORDER,
        noVehicleName
      );
      expect(tacAcctReturn).toBeDefined;
      expect(tacAcctReturn).toBeTruthy;

      const tacOrder = BusinessRules.isCarryout(
        OrderType.TACORDER,
        noVehicleName
      );
      expect(tacOrder).toBeDefined;
      expect(tacOrder).toBeTruthy;

      const tacRet = BusinessRules.isCarryout(
        OrderType.TACRETURN_ORDER,
        noVehicleName
      );
      expect(tacRet).toBeDefined;
      expect(tacRet).toBeTruthy;

      const tKoms = BusinessRules.isCarryout(
        OrderType.TKOMSORDER,
        noVehicleName
      );
      expect(tKoms).toBeDefined;
      expect(tKoms).toBeTruthy;

      const walkIn = BusinessRules.isCarryout(OrderType.WALK_IN, noVehicleName);
      expect(walkIn).toBeDefined;
      expect(walkIn).toBeTruthy;

      const warranty = BusinessRules.isCarryout(
        OrderType.WARRANTY_ADJUSTMENT_ORDER,
        noVehicleName
      );
      expect(warranty).toBeDefined;
      expect(warranty).toBeTruthy;
    });
  });
});
