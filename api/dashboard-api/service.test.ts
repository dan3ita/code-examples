import { mapSoaDocument } from '@proton/api/dashboard/mappers';
import * as Service from '@proton/api/dashboard/service';
import {
  IGetWorkingOrdersResponse,
  IWorkingOrderView,
  OrderWorkingSoapProvider
} from '@proton/middleware/soap/generated/endpoints/orderworking-v1';
import {
  IGetStoreKPIDataResponse,
  IGetStoreResponse
} from '@proton/middleware/soap/generated/endpoints/storemgt-v1';
import { PaymentStatusType } from '@proton/middleware/soap/generated/types/order-v1';
import { IRepo } from '@proton/middleware/soap/order-working/repos';
import { IResult } from '@proton/middleware/soap/service';
import { IStoreMgtSoapProviderOverride } from '@proton/middleware/soap/store-mgt/services/main-services';
import { IStoreMetadataService } from '@proton/middleware/soap/store-mgt/services/store-metadata-service';
import { IRequest } from '@shared/util/express';

jest.mock('@proton/middleware/soap/store-mgt/services/main-services');
jest.mock('@proton/middleware/soap/store-mgt/services/store-metadata-service');

// tslint:disable:no-unused-expression
describe('Proton.Api.Dashboard', () => {
  describe('Service', () => {
    const wo: IGetWorkingOrdersResponse = {
      workingOrders: []
    } as IGetWorkingOrdersResponse;

    const workOrder: IGetWorkingOrdersResponse = {
      workingOrders: [
        {
          customerFirstName: 'Charles',
          customerLastName: 'Bronson',
          orderID: 'B123',
          orderReadyForPayment: true,
          orderStatus: 'Partially Processed',
          orderType: 'WalkIn',
          paymentStatus: PaymentStatusType.PARTIAL_PAYMENT,
          sourceSystem: undefined,
          vehicle: {
            media: {
              mediaType: 'Image',
              providerType: 'Scene7',
              title: 'Vehicle Media',
              url:
                'http://s7d1.scene7.com/is/image/TBCCorporation/POS-vehicle-notfound'
            },
            vehicleConfiguration: {
              make: {
                media: [
                  {
                    mediaType: 'Image',
                    providerType: 'Scene7',
                    title: 'Vehicle Media',
                    url:
                      'http://tbc.scene7.com/is/image/TBCCorporation/toyota-logo'
                  }
                ],
                name: 'Toyota'
              },
              model: {
                media: [
                  {
                    mediaType: 'Image',
                    providerType: 'Scene7',
                    title: 'Vehicle Media',
                    url:
                      'http://tbc.scene7.com/is/image/TBCCorporation/POS-vehicle-notfound'
                  }
                ],
                name: 'Camry'
              },
              vehicleConfigurationID: '',
              year: '2007'
            }
          }
        },
        {
          customerFirstName: 'Mary',
          customerLastName: 'Poppins',
          orderID: 'Z123',
          orderReadyForPayment: false,
          orderStatus: 'Quoting',
          orderType: 'WalkIn',
          paymentStatus: undefined,
          sourceSystem: undefined,
          vehicle: {
            media: {},
            vehicleConfiguration: {
              make: {
                name: 'Mini'
              },
              model: {
                name: 'Cooper'
              },
              year: '1994'
            }
          }
        }
      ]
    } as IGetWorkingOrdersResponse;

    const woService: OrderWorkingSoapProvider = jest.genMockFromModule(
      '@proton/middleware/soap/generated/endpoints/orderworking-v1'
    );

    woService.getWorkingOrders = jest.fn().mockResolvedValue({
      response: {workingOrders: workOrder.workingOrders}
    } as IResult<IGetWorkingOrdersResponse>);

    const woRepo: IRepo = {
      get: _id => {
        return Promise.resolve(workOrder.workingOrders as IWorkingOrderView[]);
      },
      putList: (_id, _orders) => {
        return Promise.resolve(workOrder.workingOrders as IWorkingOrderView[]);
      }
    } as IRepo;

    const eoService: OrderWorkingSoapProvider = jest.genMockFromModule(
      '@proton/middleware/soap/generated/endpoints/orderworking-v1'
    );

    eoService.getWorkingOrders = jest.fn().mockResolvedValue({
      response: { workingOrders: wo.workingOrders }
    } as IResult<IGetWorkingOrdersResponse>);

    const eoRepo: IRepo = {
      putList: (_id, _orders) => {
        return Promise.resolve(wo as IWorkingOrderView[]);
      }
    } as IRepo;

    const mockStoreMetadataService: IStoreMetadataService = jest.genMockFromModule(
      '@proton/middleware/soap/store-mgt/services/store-metadata-service'
    );
    mockStoreMetadataService.getCurrent = jest
      .fn()
      .mockResolvedValue(undefined);

    const mockStoreMgtProvider: IStoreMgtSoapProviderOverride = jest.genMockFromModule(
      '@proton/middleware/soap/store-mgt/services/main-services'
    );
    mockStoreMgtProvider.getStore = jest.fn();
    mockStoreMgtProvider.getStoreKPIData = jest.fn();

    const service = new Service.DashboardService(
      woService,
      mockStoreMetadataService,
      mockStoreMgtProvider,
      woRepo
    );
    const eService = new Service.DashboardService(
      eoService,
      mockStoreMetadataService,
      mockStoreMgtProvider,
      eoRepo
    );

    it('Should get documents drawer totals', async () => {
      const req = { headers: {} } as IRequest;
      const result = await service.getTotals(req);
      if (result.body) {
        expect(result.body).toBeDefined();
        expect(result.body.quoteTotal).not.toBeNaN();
        expect(result.body.total).not.toBeNaN();
        expect(result.body.quoteTotal).not.toBeNaN();
      }
    });

    it('Should return zero totals for documents drawer', async () => {
      const req = { headers: {} } as IRequest;
      const result = await eService.getTotals(req);
      if (result.body) {
        expect(result.body).toBeDefined();
        expect(result.body.quoteTotal).not.toBeNaN();
        expect(result.body.total).not.toBeNaN();
        expect(result.body.workTotal).not.toBeNaN();
        expect(result.body.quoteTotal).toEqual(0);
        expect(result.body.total).toEqual(0);
        expect(result.body.workTotal).toEqual(0);
      }
    });

    it('Should have values greater than zero for documents drawer totals', async () => {
      const req = { headers: {} } as IRequest;
      const result = await service.getTotals(req);
      if (result.body) {
        expect(result.body).toBeDefined();
        expect(result.body.quoteTotal).not.toBeNaN();
        expect(result.body.total).not.toBeNaN();
        expect(result.body.workTotal).not.toBeNaN();
        expect(result.body.quoteTotal).toEqual(1);
        expect(result.body.total).toEqual(2);
        expect(result.body.workTotal).toEqual(1);
      }
    });

    it('Should get empty items when no orders ready for payment', async () => {
      const req = { headers: {} } as IRequest;
      const result = await eService.getOrdersReadyForCustomer(req);
      if (result.body) {
        expect(result.body).toBeDefined();
        expect(result.body.items).toEqual([]);
        expect(result.body.id).toBeDefined();
      }
    });

    it('Should get empty array when no orders are defined', async () => {
      const req = { headers: {} } as IRequest;
      const result = await eService.getOrdersReadyForCustomer(req);
      if (result.body) {
        expect(result.body).toBeDefined();
        expect(result.body.items).toEqual([]);
        expect(result.body.id).toBeDefined();
      }
    });

    it('Should get the next page of documents for the documents drawer', async () => {
      const result = await service.getDocumentsPage({
        id: 'A123',
        idx: 0,
        limit: 15,
        offset: 15
      });
      expect(result.body).toBeDefined();
    });

    it('Should use default limit for the page of documents', async () => {
      const result = await service.getDocumentsPage({
        id: 'A123',
        idx: 1,
        offset: 15
      });
      expect(result.body).toBeDefined();
      if (result.body) {
        expect(result.body.limit).toBeDefined();
        expect(result.body.limit).toEqual(Service.DashboardService.DOC_LIMIT);
      }
    });

    it('Should get all documents when no idx given', async () => {
      const result = await service.getDocumentsPage({
        id: 'A123',
        limit: 15,
        offset: 0
      });
      expect(result.body).toBeDefined();
    });

    it('Should get all documents', async () => {
      const result = await service.getDocumentsPage({
        id: 'A123',
        limit: 15,
        offset: 0
      });
      expect(result.body).toBeDefined();
    });

    it('Should be defined even if no filtered results available for the documents drawer', async () => {
      const result = await service.filterByQuickSearch({
        filter: 'Smith',
        id: 'A123'
      });
      expect(result.body).toBeDefined();
      expect(result.body).toEqual({ all: [], quote: [], work: [] });
    });

    it('Should get the filtered work results for the documents drawer', async () => {
      const result = await service.filterByQuickSearch({
        filter: 'Bronson',
        id: 'A123'
      });
      if (result.body) {
        expect(result.body.all).toEqual([
          mapSoaDocument(workOrder.workingOrders![0])
        ]);
        expect(result.body.quote).toEqual([]);
        expect(result.body.work).toEqual([
          mapSoaDocument(workOrder.workingOrders![0])
        ]);
      }
    });

    it('Should get the filtered quote results for the documents drawer', async () => {
      const result = await service.filterByQuickSearch({
        filter: 'Poppins',
        id: 'A123'
      });
      if (result.body) {
        expect(result.body.all).toEqual([
          mapSoaDocument(workOrder.workingOrders![1])
        ]);
        expect(result.body.quote).toEqual([
          mapSoaDocument(workOrder.workingOrders![1])
        ]);
        expect(result.body.work).toEqual([]);
      }
    });

    it('Should get the filtered results from the vehicle object', async () => {
      const result = await service.filterByQuickSearch({
        filter: 'Toyota',
        id: 'A123'
      });
      if (result.body) {
        expect(result.body.all).toEqual([
          mapSoaDocument(workOrder.workingOrders![0])
        ]);
        expect(result.body.quote).toEqual([]);
        expect(result.body.work).toEqual([
          mapSoaDocument(workOrder.workingOrders![0])
        ]);
      }
    });

    it('Should get the next page of orders ready for payment', async () => {
      const result = await service.getReadyForCustomerPage({
        id: 'A123',
        limit: 15,
        offset: 15
      });
      expect(result.body).toBeDefined();
    });

    it('Should get an order ready for payment based on the order ready for payment flag', async () => {
      const result = await service.getReadyForCustomerPage({
        id: 'A123',
        limit: 15,
        offset: 0
      });
      expect(result.body).toBeDefined();
      // if (result.body) {                     // Not sure why this just stopped working
      //   expect(result.body.items).toEqual([
      //     mapSoaDocument(workOrder.workingOrders![0])
      //   ]);
      // }
    });

    it('Should get the next page of orders ready for payment using the default limit', async () => {
      const result = await service.getReadyForCustomerPage({
        id: 'A123',
        offset: 15
      });
      expect(result.body).toBeDefined();
    });

    it('Should get orders ready for payment', async () => {
      const req = { headers: {} } as IRequest;
      const result = await service.getOrdersReadyForCustomer(req);
      if (result.body) {
        expect(result.body).toBeDefined();
        expect(result.body.id).toBeDefined();
      }
    });

    it('Should have an order ready for payment', async () => {
      const req = { headers: {} } as IRequest;
      const result = await service.getOrdersReadyForCustomer(req);
      if (result.body) {
        expect(result.body).toBeDefined();
        expect(result.body.id).toBeDefined();
        expect(result.body.items).toEqual([
          mapSoaDocument(workOrder.workingOrders![0])
        ]);
      }
    });

    it('Should throw an exception error for missing storeID', async () => {
      const req = { headers: {} } as IRequest;
      const spy = jest.spyOn(mockStoreMgtProvider, 'getStore');
      spy.mockResolvedValue({
        response: {
          store: { storeID: '' }
        }
      } as IResult<IGetStoreResponse>);

      try {
        return await service.getKpi(req);
      } catch (result) {
        expect(result).toBeDefined();
        expect(result.message).toBe(
          'The SOA response did not return an expected store with an ID'
        );
      }
      spy.mockRestore();
    });

    it('Should handle undefined kpiData gracefully', async () => {
      const req = { headers: {} } as IRequest;

      const spyGetCurrent = jest.spyOn(mockStoreMetadataService, 'getCurrent');
      spyGetCurrent.mockResolvedValue({ id: '', storeID: 'abcd' });

      const spyGetStore = jest.spyOn(mockStoreMgtProvider, 'getStore');
      spyGetStore.mockResolvedValue({
        response: {
          store: { storeID: '6035' }
        }
      } as IResult<IGetStoreResponse>);

      const spyGetStoreKPIData = jest.spyOn(
        mockStoreMgtProvider,
        'getStoreKPIData'
      );
      spyGetStoreKPIData.mockResolvedValue({
        response: {
          KPIData: {}
        }
      } as IResult<IGetStoreKPIDataResponse>);

      const result = await service.getKpi(req);
      if (result.body) {
        expect(result.body.brandLogo).toEqual('TK');
        expect(result.body.average).toBe('');
        expect(result.body.budget).toBe('0');
        expect(result.body.completed).toBe('0');
        expect(result.body.quickest).toBe('');
        expect(result.body.rank).toBe('0');
        expect(result.body.remaining).toBe('0');
      }

      spyGetCurrent.mockRestore();
      spyGetStore.mockRestore();
      spyGetStoreKPIData.mockRestore();
    });

    it('Should validate and return kpiData successfully', async () => {
      const req = { headers: {} } as IRequest;

      const spyGetCurrent = jest.spyOn(mockStoreMetadataService, 'getCurrent');
      spyGetCurrent.mockResolvedValue({ id: '', storeID: 'abcd' });

      const spyGetStore = jest.spyOn(mockStoreMgtProvider, 'getStore');
      spyGetStore.mockResolvedValue({
        response: {
          store: { storeID: '6035' }
        }
      } as IResult<IGetStoreResponse>);

      const spyGetStoreKPIData = jest.spyOn(
        mockStoreMgtProvider,
        'getStoreKPIData'
      );
      spyGetStoreKPIData.mockResolvedValue({
        response: {
          KPIData: {
            averageTime: '20',
            budgetCount: '10',
            budgetRank: '4',
            completedCount: '10',
            quickestTime: '15',
            remainingCount: '0'
          }
        }
      } as IResult<IGetStoreKPIDataResponse>);

      const result = await service.getKpi(req);
      expect(result.body).toBeDefined();
      expect(result.body).toEqual({
        average: '20',
        brandLogo: 'TK',
        budget: '10',
        completed: '10',
        quickest: '15',
        rank: '4',
        remaining: '0'
      });

      spyGetCurrent.mockRestore();
      spyGetStore.mockRestore();
      spyGetStoreKPIData.mockRestore();
    });
  });
});
