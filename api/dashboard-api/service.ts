import * as BusinessRules from '@proton/api/dashboard/business-rules';
import * as Mappers from '@proton/api/dashboard/mappers';
import * as Models from '@proton/api/dashboard/models/generated';
import { OrderworkingV1 } from '@proton/middleware/soap/generated/endpoints';
import { IWorkingOrderView } from '@proton/middleware/soap/generated/endpoints/orderworking-v1';
import { OrderState } from '@proton/middleware/soap/generated/types/order-v1';
import { Repos } from '@proton/middleware/soap/order-working';
import { ServiceError } from '@proton/middleware/soap/service';
import {
  IStoreMgtSoapProviderOverride,
  StoreMgtSoapProviderOverride
} from '@proton/middleware/soap/store-mgt/services/main-services';
import {
  IStoreMetadataService,
  TYPE_KEY as StoreMetadataServiceKey
} from '@proton/middleware/soap/store-mgt/services/store-metadata-service';
import * as Express from '@shared/util/express';
import { uniqId } from '@shared/util/string';
import { inject, injectable } from 'inversify';

@injectable()
export class DashboardService {
  public static TYPE_KEY = Symbol('Api.Dashboard.Service');

  // Set Defaults
  public static LIMIT = 10;
  public static DOC_LIMIT = 30;
  public static OFFSET = 0;

  // Quote Filter
  public static QFILTER = [OrderState.QUOTING, OrderState.ESTIMATING];

  constructor(
    // Obtain Working Orders
    @inject(OrderworkingV1.OrderWorkingSoapProvider.TYPE_KEY)
    private _workingOrders: OrderworkingV1.IOrderWorkingSoapProvider,
    @inject(StoreMetadataServiceKey)
    private _storeMetadataService: IStoreMetadataService,
    @inject(StoreMgtSoapProviderOverride.TYPE_KEY)
    private _storeMgtService: IStoreMgtSoapProviderOverride,
    @inject(Repos.Repo.TYPE_KEY)
    private _repo: Repos.IRepo
  ) {}

  public async getTotals(
    req: Express.IRequest
  ): Promise<Express.IResult<Models.IGetTotalsResponse>> {
    const result = await this._workingOrders.getWorkingOrders(
      req.body,
      req.headers
    );
    const documents = result.response.workingOrders || [];
    const mapped = documents.map(wo => Mappers.mapSoaDocument(wo));
    return this.getDocumentTotals(mapped);
  }

  public async getOrdersReadyForCustomer(
    req: Express.IRequest
  ): Promise<Express.IResult<Models.IPagedResponse>> {
    const searchId = await uniqId();
    const limit: number = DashboardService.LIMIT;
    const offset: number = DashboardService.OFFSET;
    const results = await this._workingOrders.getWorkingOrders(
      req.body,
      req.headers
    );
    const documents = results.response.workingOrders || [];
    this._repo.putList(documents, searchId);
    const fltOrders = documents.filter(
      w => BusinessRules.hasPayment(w.orderStatus) || w.orderReadyForPayment
    );
    return this.slice(fltOrders, searchId, limit, offset);
  }

  public async filterByQuickSearch({
    id,
    filter
  }: Models.IFilterByQuickSearchRequest): Promise<
    Express.IResult<Models.IFilterByQuickSearchResponse | void>
  > {
    const results: IWorkingOrderView[] = [];
    const cached = await this._repo.get(id);
    const re = new RegExp(filter, 'i');
    // Get the keys in the object
    Object.keys(cached).forEach(key => {
      const obj = (cached as any)[key];
      for (const property in obj) {
        if (typeof obj.hasOwnProperty(property)) {
          const value = obj[property];
          if (typeof value === 'string' && value.match(re)) {
            results.push(obj);
            return;
            // If value is not a string, use recursive loop to continue search
          } else if (typeof value === 'object' || value instanceof Array) {
            const result = this._findObject(value, re);
            if (result) {
              results.push(obj);
              return;
            }
          }
        }
      }
    });
    const qo = this._filterOrders(results, Models.DocumentFilterType.QUOTE);
    const wo = this._filterOrders(results, Models.DocumentFilterType.WORK);
    return {
      body: {
        all: results.map(a => Mappers.mapSoaDocument(a)),
        quote: qo.map(q => Mappers.mapSoaDocument(q)),
        work: wo.map(w => Mappers.mapSoaDocument(w))
      },
      statusCode: 200
    };
  }

  public async getDocumentsPage({
    id,
    limit,
    offset,
    idx
  }: Models.IGetDocumentsPageRequest): Promise<
    Express.IResult<Models.IGetDocumentsPageResponse | void>
  > {
    const docLimit = offset === 0 ? DashboardService.DOC_LIMIT : limit;
    const cached = await this._repo.get(id);
    const filter = idx
      ? (Object.keys(Models.DocumentFilterType)[
          idx
        ] as Models.DocumentFilterType)
      : Models.DocumentFilterType.ALL;
    const fltOrders = this._filterOrders(cached, filter);
    return this.slice(
      fltOrders,
      id,
      docLimit || DashboardService.DOC_LIMIT,
      offset
    );
  }

  public async getReadyForCustomerPage({
    id,
    limit,
    offset
  }: Models.IGetReadyForCustomerPageRequest): Promise<
    Express.IResult<Models.IGetReadyForCustomerPageResponse | void>
  > {
    const cached = await this._repo.get(id);
    const fltOrders = cached.filter(
      c => BusinessRules.hasPayment(c.orderStatus) || c.orderReadyForPayment
    );
    return this.slice(fltOrders, id, limit || DashboardService.LIMIT, offset);
  }

  public async getKpi(
    req: Express.IRequest
  ): Promise<Express.IResult<Models.IGetKpiResponse>> {
    const kpiData: Models.IKpi = {
      average: '',
      brandLogo: Models.BrandLogo.TK,
      budget: '0',
      completed: '0',
      quickest: '',
      rank: '0',
      remaining: '0'
    };

    const store = await this._storeMetadataService.getCurrent();
    if (!store || !store.storeID) {
      throw ServiceError.generateSoaInternalError(
        'The SOA response did not return an expected store with an ID'
      );
    }
    kpiData.brandLogo = Mappers.mapBrandIdToBrandLogo(store.brandID);

    const kpiResult = await this._storeMgtService.getStoreKPIData(
      {},
      req.headers
    );

    if (kpiResult.response.KPIData) {
      if (kpiResult.response.KPIData.averageTime) {
        kpiData.average = kpiResult.response.KPIData.averageTime;
      }
      if (kpiResult.response.KPIData.quickestTime) {
        kpiData.quickest = kpiResult.response.KPIData.quickestTime;
      }
      if (kpiResult.response.KPIData.budgetCount) {
        kpiData.budget = kpiResult.response.KPIData.budgetCount;
      }
      if (kpiResult.response.KPIData.completedCount) {
        kpiData.completed = kpiResult.response.KPIData.completedCount;
      }
      if (kpiResult.response.KPIData.remainingCount) {
        kpiData.remaining = kpiResult.response.KPIData.remainingCount;
      }
      if (kpiResult.response.KPIData.budgetRank) {
        kpiData.rank = kpiResult.response.KPIData.budgetRank;
      }
    }

    return {
      body: kpiData,
      statusCode: 200
    };
  }

  private slice(
    cached: IWorkingOrderView[],
    id: string,
    limit: number,
    offset: number
  ): Express.IResult<Models.IPagedResponse> {
    const calcEnd = offset + Math.min(cached.length, limit);
    const end = calcEnd > cached.length ? cached.length : calcEnd;
    const sliced = cached && cached.length > 0 ? cached.slice(offset, end) : [];
    return {
      body: {
        id,
        items: sliced.map(wo => Mappers.mapSoaDocument(wo)),
        limit,
        morePages: cached.length > offset + limit,
        offset,
        total: cached.length
      },
      statusCode: 200
    };
  }

  private getDocumentTotals(
    mapped: Models.IDocument[]
  ): Express.IResult<Models.ITotals> {
    const workTotal = mapped.reduce((n: number, m: Models.IDocument) => {
      return (n +=
        DashboardService.QFILTER.indexOf(m.orderStatus as OrderState) === -1
          ? 1
          : 0);
    }, 0);
    const quoteTotal = mapped.reduce((n: number, m: Models.IDocument) => {
      return (n +=
        DashboardService.QFILTER.indexOf(m.orderStatus as OrderState) > -1
          ? 1
          : 0);
    }, 0);
    return {
      body: {
        quoteTotal,
        total: mapped.length,
        workTotal
      },
      statusCode: 200
    };
  }

  private _filterOrders(
    document: IWorkingOrderView[],
    filter: Models.DocumentFilterType
  ): IWorkingOrderView[] {
    return document.filter(d =>
      filter === Models.DocumentFilterType.WORK
        ? DashboardService.QFILTER.indexOf(
            // Get work orders
            d.orderStatus as OrderState
          ) === -1
        : filter === Models.DocumentFilterType.QUOTE
        ? DashboardService.QFILTER.indexOf(
            // Get estimates
            d.orderStatus as OrderState
          ) > -1
        : document
    );
  }

  private _findObject(wo: IWorkingOrderView[], re: RegExp): boolean {
    // Recursive loop to check arrays and nested objects for value
    let result: boolean = false;
    if (wo instanceof Array) {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < wo.length; i++) {
        result = this._findObject(wo[i] as any, re);
        if (result) {
          break;
        }
      }
    } else {
      const obj = wo as any;
      for (const property in obj) {
        if (typeof obj.hasOwnProperty(property)) {
          const value = obj[property];
          if (typeof value === 'string' && value.match(re)) {
            result = true;
            break;
          }

          if (typeof value === 'object' || value instanceof Array) {
            result = this._findObject(value, re);
            if (result) {
              break;
            }
          }
        }
      }
    }
    return result;
  }
}
