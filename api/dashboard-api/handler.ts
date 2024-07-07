import * as Models from '@proton/api/dashboard/models/generated';
import * as Services from '@proton/api/dashboard/service';
import { mapRequestToType, wrap } from '@proton/util/handler-wrapper';
import * as Express from '@shared/util/express';
import { Container } from 'inversify';

let _container: Container;

export function setContainer(container: Container): void {
  _container = container;
}
function getService(): Services.DashboardService {
  return _container.get<Services.DashboardService>(
    Services.DashboardService.TYPE_KEY
  );
}

export const getTotals = wrap((req: Express.IRequest) => {
  return getService().getTotals(req);
});

export const getDocumentsPage = wrap((req: Express.IRequest) => {
  const mapped: Models.IGetDocumentsPageRequest = mapRequestToType(req);
  mapped.offset = parseInt(
    (mapped.offset as any) || Services.DashboardService.OFFSET,
    10
  );
  mapped.limit = parseInt(
    (mapped.limit as any) || Services.DashboardService.DOC_LIMIT,
    10
  );
  mapped.idx = parseInt(
    (mapped.idx as any) || Services.DashboardService.OFFSET,
    10
  );
  return getService().getDocumentsPage(mapped);
});

export const filterByQuickSearch = wrap((req: Express.IRequest) => {
  const mapped: Models.IFilterByQuickSearchRequest = mapRequestToType(req);
  return getService().filterByQuickSearch(mapped);
});

export const getOrdersReadyForCustomer = wrap((req: Express.IRequest) => {
  return getService().getOrdersReadyForCustomer(req);
});

export const getReadyForCustomerPage = wrap((req: Express.IRequest) => {
  const mapped: Models.IGetReadyForCustomerPageRequest = mapRequestToType(req);
  mapped.offset = parseInt(
    (mapped.offset as any) || Services.DashboardService.OFFSET,
    10
  );
  mapped.limit = parseInt(
    (mapped.limit as any) || Services.DashboardService.LIMIT,
    10
  );
  return getService().getReadyForCustomerPage(mapped);
});

export const getKpi = wrap((req: Express.IRequest) => {
  return getService().getKpi(req);
});
