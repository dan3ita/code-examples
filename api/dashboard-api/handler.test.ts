import { mockHandlerWrapper } from '@proton/mocks/util/handler-wrapper';
import { IRequest, IResponse } from '@shared/util/express';
import { Container } from 'inversify';
import * as Handler from './handler';
import { DashboardService } from './service';

// ************* Setup **************************************************
jest.mock('@proton/util/handler-wrapper', () => mockHandlerWrapper);

const mockDashboardService: DashboardService = jest.genMockFromModule(
  './service'
);

const mockContainer = new Container();

mockContainer
  .bind(DashboardService.TYPE_KEY)
  .toConstantValue(mockDashboardService);

const req = {} as IRequest;
const res = {
  getHeader: (_data: string): string => 'text/plain'
} as IResponse;

Handler.setContainer(mockContainer);

// ************* Tests **************************************************
describe('Api.Dashboard - Handler', () => {

  it('Should have the exports which are required by the api generator and route', () => {
    expect(Handler).toHaveProperty('getTotals');
    expect(Handler).toHaveProperty('getDocumentsPage');
    expect(Handler).toHaveProperty('filterByQuickSearch');
    expect(Handler).toHaveProperty('getOrdersReadyForCustomer');
    expect(Handler).toHaveProperty('getReadyForCustomerPage');
    expect(Handler).toHaveProperty('getKpi');
  });

  it('Should set the container', () => {
    mockDashboardService.getTotals = jest.fn();
    Handler.getTotals(req, undefined as any);
    expect(mockDashboardService.getTotals).toHaveBeenCalledTimes(1);
  });

  it('Should properly wrap getTotals', () => {
    mockDashboardService.getTotals = jest.fn();
    Handler.getTotals(req, undefined as any);
    expect(mockDashboardService.getTotals).toHaveBeenCalledTimes(1);
  });

  it('Should properly wrap getDocumentsPage', () => {
    mockDashboardService.getDocumentsPage = jest.fn();
    Handler.getDocumentsPage(req, res)
    expect(mockDashboardService.getDocumentsPage).toHaveBeenCalledTimes(1);
  });

  it('Should properly wrap filterByQuickSearch', () => {
    mockDashboardService.filterByQuickSearch = jest.fn();
    Handler.filterByQuickSearch(req, res)
    expect(mockDashboardService.filterByQuickSearch).toHaveBeenCalledTimes(1);
  });

  it('Should properly wrap getOrdersReadyForCustomer', () => {
    mockDashboardService.getOrdersReadyForCustomer = jest.fn();
    Handler.getOrdersReadyForCustomer(req, res)
    expect(mockDashboardService.getOrdersReadyForCustomer).toHaveBeenCalledTimes(1);
  });

  it('Should properly wrap getReadyForCustomerPage', () => {
    mockDashboardService.getReadyForCustomerPage = jest.fn();
    Handler.getReadyForCustomerPage(req, res)
    expect(mockDashboardService.getReadyForCustomerPage).toHaveBeenCalledTimes(1);
  });

  it('Should properly wrap getKpi', () => {
    mockDashboardService.getKpi = jest.fn();
    Handler.getKpi(req, res)
    expect(mockDashboardService.getKpi).toHaveBeenCalledTimes(1);
  });

});
