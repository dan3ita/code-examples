import * as Mappers from '@proton/api/dashboard/mappers';
import { IWorkingOrderView } from '@proton/middleware/soap/generated/endpoints/orderworking-v1';
import { StoreBrand } from '@proton/middleware/soap/generated/types/store-v1';

// tslint:disable:no-unused-expression
describe('Proton.Api.Dashboard', () => {
  describe('Mappers', () => {
    it('Should map order information to SOA document', () => {
      const wo = {
        customerFirstName: '',
        customerLastName: '',
        customerPhoneNumber: '',
        customerStatus: undefined,
        orderID: '',
        orderStatus: undefined,
        orderType: undefined,
        sourceSystem: undefined,
        vehicle: {
          media: {
            url: ''
          },
          vehicleConfiguration: {
            make: {
              name: ''
            },
            model: {
              name: ''
            },
            year: ''
          }
        }
      } as IWorkingOrderView;
      const mapped = Mappers.mapSoaDocument(wo);
      expect(mapped).toEqual({
        customer: {
          firstName: '',
          lastName: '',
          phone: ''
        },
        customerStatus: '',
        hasPayment: false,
        isCarryout: true,
        orderID: '',
        orderStatus: '',
        orderType: '',
        sourceSystem: '',
        vehicle: {
          name: ''
        }
      });
    });

    it('Should map empty strings to SOA document if no order information', () => {
      const wo = {} as IWorkingOrderView;
      const mapped = Mappers.mapSoaDocument(wo);
      expect(mapped).toEqual({
        customer: {
          firstName: '',
          lastName: '',
          phone: ''
        },
        customerStatus: '',
        hasPayment: false,
        isCarryout: true,
        orderID: '',
        orderStatus: '',
        orderType: '',
        sourceSystem: '',
        vehicle: {
          name: ''
        }
      });
    });

    it('Should map customer, vehicle and order information to SOA document', () => {
      const wo = {
        customerFirstName: 'Max',
        customerLastName: 'Well',
        customerPhoneNumber: '(555)123-0893',
        customerStatus: undefined,
        orderID: 'ABC1234',
        orderStatus: undefined,
        orderType: 'WalkIn',
        sourceSystem: undefined,
        vehicle: {
          media: {
            url: 'http://www.coolWhips.com'
          },
          vehicleConfiguration: {
            make: {
              name: ''
            },
            model: {
              name: ''
            },
            year: ''
          }
        }
      } as IWorkingOrderView;
      const mapped = Mappers.mapSoaDocument(wo);
      expect(mapped).toEqual({
        customer: {
          firstName: 'Max',
          lastName: 'Well',
          phone: '(555)123-0893'
        },
        customerStatus: '',
        hasPayment: false,
        isCarryout: true,
        orderID: 'ABC1234',
        orderStatus: '',
        orderType: 'WalkIn',
        sourceSystem: '',
        vehicle: {
          name: ''
        }
      });
    });

    it('Should return a brand logo', () => {
      const bigO = Mappers.mapBrandIdToBrandLogo(StoreBrand.BIG_O);
      expect(bigO).toBeDefined;
      expect(bigO).toEqual('BIG_O');

      const bigODev = Mappers.mapBrandIdToBrandLogo(
        StoreBrand.BIG_O_DEVELOPMENT
      );
      expect(bigODev).toBeDefined;
      expect(bigODev).toEqual('BIG_O');

      const bigOLV = Mappers.mapBrandIdToBrandLogo(StoreBrand.BIG_O_LAS_VEGAS);
      expect(bigOLV).toBeDefined;
      expect(bigOLV).toEqual('BIG_O');

      const bigOI = Mappers.mapBrandIdToBrandLogo(
        StoreBrand.BIG_O_TIREOF_IDAHO
      );
      expect(bigOI).toBeDefined;
      expect(bigOI).toEqual('BIG_O');

      const merch = Mappers.mapBrandIdToBrandLogo(StoreBrand.MERCHANTS);
      expect(merch).toBeDefined;
      expect(merch).toEqual('MERCHANTS');

      const ntw = Mappers.mapBrandIdToBrandLogo(StoreBrand.NTW);
      expect(ntw).toBeDefined;
      expect(ntw).toEqual('NTB');

      const ntb = Mappers.mapBrandIdToBrandLogo(StoreBrand.NTB);
      expect(ntb).toBeDefined;
      expect(ntb).toEqual('NTB');

      const tkExp = Mappers.mapBrandIdToBrandLogo(
        StoreBrand.TK_EXPRESS_SPEEDEE_OIL
      );
      expect(tkExp).toBeDefined;
      expect(tkExp).toEqual('TK_EXPRESS');

      const test = Mappers.mapBrandIdToBrandLogo('test');
      expect(test).toBeDefined;
      expect(test).toEqual('TK');

      const num = Mappers.mapBrandIdToBrandLogo('30');
      expect(num).toBeDefined;
      expect(num).toEqual('TK');

      const noBrand = Mappers.mapBrandIdToBrandLogo();
      expect(noBrand).toBeDefined;
      expect(noBrand).toEqual('TK');
    });
  });
});
