// This is a generated file. Any manual changes made here will be lost
// ----------------------------------------
//  Dashboard endpoint
//
//  Endpoint to load dashboard items
//
//  v1.0.0
// ----------------------------------------

// ----------------------------------------
//
//  Model Definitions
//
// ----------------------------------------

// ----------------------------------------
//  ITotals
// ----------------------------------------
/**
 * Total documents in each drawer
 *
 * @export
 * @interface ITotals
 */
export interface ITotals {
  /**
   * Total number of documents
   *
   * @example 100
   * @type {number}
   * @memberof ITotals
   */
  total: number;

  /**
   * Total number of work documents
   *
   * @example 50
   * @type {number}
   * @memberof ITotals
   */
  workTotal: number;

  /**
   * Total number of quote documents
   *
   * @example 50
   * @type {number}
   * @memberof ITotals
   */
  quoteTotal: number;
}

// ----------------------------------------
//  ISearchResults
// ----------------------------------------
/**
 * Documents drawer filter by quick search results
 *
 * @export
 * @interface ISearchResults
 */
export interface ISearchResults {
  /**
   * The search results for the all drawer
   *
   * @type {IDocument[]}
   * @memberof ISearchResults
   */
  all: IDocument[];

  /**
   * The search results for the work drawer
   *
   * @type {IDocument[]}
   * @memberof ISearchResults
   */
  work: IDocument[];

  /**
   * The search results for the quote drawer
   *
   * @type {IDocument[]}
   * @memberof ISearchResults
   */
  quote: IDocument[];
}

// ----------------------------------------
//  IPagedResponse
// ----------------------------------------
/**
 * A generic page of data items
 *
 * @export
 * @interface IPagedResponse
 */
export interface IPagedResponse {
  /**
   * The array of items for this page
   *
   * @type {IDocument[]}
   * @memberof IPagedResponse
   */
  items: IDocument[];

  /**
   * Subsequent requests for pages by unique ID
   *
   * @type {string}
   * @memberof IPagedResponse
   */
  id: string;

  /**
   * Where in the search response to start returning the list of documents
   *
   * @type {number}
   * @memberof IPagedResponse
   */
  offset?: number;

  /**
   * A flag indicating whether or not there are more pages of documents
   *
   * @type {boolean}
   * @memberof IPagedResponse
   */
  morePages?: boolean;

  /**
   * The number of documents returned per page (default is 15)
   *
   * @type {number}
   * @memberof IPagedResponse
   */
  limit?: number;

  /**
   * Total documents available in documents drawer
   *
   * @type {number}
   * @memberof IPagedResponse
   */
  total?: number;
}

// ----------------------------------------
//  IDocument
// ----------------------------------------
/**
 * Documents drawer list
 *
 * @export
 * @interface IDocument
 */
export interface IDocument {
  /**
   * The AI status for the order.  NOTE: This is needed to properly open an order to the AI Flow from the sidebar
   *
   * @example "Pending"
   * @type {string}
   * @memberof IDocument
   */
  aiStatus?: string;

  /**
   *
   * @see ICustomer
   * @memberof IDocument
   */
  customer: ICustomer;

  /**
   * The status of the customer
   *
   * @example "Waiting"
   * @type {string}
   * @memberof IDocument
   */
  customerStatus?: string;

  /**
   *
   * @see IVehicle
   * @memberof IDocument
   */
  vehicle: IVehicle;

  /**
   * Represents a Backend Order Id
   *
   * @example "0000025121"
   * @type {string}
   * @memberof IDocument
   */
  orderID: string;

  /**
   * Specifies whether a payment has been applied to the work order
   *
   * @type {boolean}
   * @memberof IDocument
   */
  hasPayment: boolean;

  /**
   * Specifies whether or not the order is carryout
   *
   * @example true
   * @type {boolean}
   * @memberof IDocument
   */
  isCarryout: boolean;

  /**
   * The status of the order
   *
   * @example "Quoting"
   * @type {string}
   * @memberof IDocument
   */
  orderStatus: string;

  /**
   * The type of order
   *
   * @example "WalkIn"
   * @type {string}
   * @memberof IDocument
   */
  orderType?: string;

  /**
   * Specifies if a full or partial or no payment has been made on the work order
   *
   * @example "FullPayment"
   * @type {string}
   * @memberof IDocument
   */
  paymentStatus?: string;

  /**
   * Source system
   *
   * @type {string}
   * @memberof IDocument
   */
  sourceSystem?: string;

  /**
   *
   * @see DocumentFilterType
   * @memberof IDocument
   */
  documentFilterType?: DocumentFilterType;
}

// ----------------------------------------
//  ICustomer
// ----------------------------------------
/**
 * Represents the the customer associated with a Document
 *
 * @export
 * @interface ICustomer
 */
export interface ICustomer {
  /**
   * First name of the customer
   *
   * @example "Johnathan"
   * @type {string}
   * @memberof ICustomer
   */
  firstName: string;

  /**
   * Last name of the customer
   *
   * @example "Doe"
   * @type {string}
   * @memberof ICustomer
   */
  lastName: string;

  /**
   * Represents the customer's preferred contact phone number
   *
   * @example "214-123-5555"
   * @type {string}
   * @memberof ICustomer
   */
  phone: string;
}

// ----------------------------------------
//  IVehicle
// ----------------------------------------
/**
 * Represents the the vehicle associated with a Document
 *
 * @export
 * @interface IVehicle
 */
export interface IVehicle {
  /**
   * The parts of a vehicle configuration combined into
   * a short text value suitable for display to a user
   *
   * @example "'19 Ford Edge Limited"
   * @type {string}
   * @memberof IVehicle
   */
  name: string;
}

// ----------------------------------------
//  IKpi
// ----------------------------------------
/**
 * KPI data and brand logo for the current store
 *
 * @export
 * @interface IKpi
 */
export interface IKpi {
  /**
   *
   * @see BrandLogo
   * @memberof IKpi
   */
  brandLogo: BrandLogo;

  /**
   * The budgeted car count
   *
   * @example "1"
   * @type {string}
   * @memberof IKpi
   */
  budget: string;

  /**
   * The completed car count
   *
   * @example "1"
   * @type {string}
   * @memberof IKpi
   */
  completed: string;

  /**
   * The remaining car count
   *
   * @example "1"
   * @type {string}
   * @memberof IKpi
   */
  remaining: string;

  /**
   * The average completion duration
   *
   * @example "01:49:14"
   * @type {string}
   * @memberof IKpi
   */
  average: string;

  /**
   * The quickest completion duration
   *
   * @example "00:06:55"
   * @type {string}
   * @memberof IKpi
   */
  quickest: string;

  /**
   * The store's rank
   *
   * @example "11"
   * @type {string}
   * @memberof IKpi
   */
  rank: string;
}

/**
 *
 * @type {DocumentFilterType}
 */
export enum DocumentFilterType {
  ALL = 'ALL',
  WORK = 'WORK',
  QUOTE = 'QUOTE'
}

/**
 *
 * @type {BrandLogo}
 */
export enum BrandLogo {
  TK = 'TK',
  NTB = 'NTB',
  BIG_O = 'BIG_O',
  MERCHANTS = 'MERCHANTS',
  TK_EXPRESS = 'TK_EXPRESS'
}

// ----------------------------------------
//
//  Request / Response Definitions
//
// ----------------------------------------

// ----------------------------------------
//  IGetTotalsRequest
// ----------------------------------------
/**
 * Retrieves the number of total documents per drawer
 *
 * @export
 * @interface IGetTotalsRequest
 */
export interface IGetTotalsRequest {}

// ----------------------------------------
//  IGetTotalsResponse
// ----------------------------------------
/**
 * Success
 *
 * @export
 * @interface IGetTotalsResponse
 */
export interface IGetTotalsResponse extends ITotals {}

// ----------------------------------------
//  IGetOrdersReadyForCustomerRequest
// ----------------------------------------
/**
 * Retrieves the orders ready for customer pickup and sets the repo
 *
 * @export
 * @interface IGetOrdersReadyForCustomerRequest
 */
export interface IGetOrdersReadyForCustomerRequest {}

// ----------------------------------------
//  IGetOrdersReadyForCustomerResponse
// ----------------------------------------
/**
 * Success
 *
 * @export
 * @interface IGetOrdersReadyForCustomerResponse
 */
export interface IGetOrdersReadyForCustomerResponse extends IPagedResponse {}

// ----------------------------------------
//  IFilterByQuickSearchRequest
// ----------------------------------------
/**
 * Returns a page of documents based on search ID
 *
 * @export
 * @interface IFilterByQuickSearchRequest
 */
export interface IFilterByQuickSearchRequest {
  /**
   * The unique search identifier returned from the original search request
   *
   * @type {string}
   * @memberof IFilterByQuickSearchRequest
   */
  id: string;

  /**
   * The item to filter documents by
   *
   * @type {string}
   * @memberof IFilterByQuickSearchRequest
   */
  filter: string;
}

// ----------------------------------------
//  IFilterByQuickSearchResponse
// ----------------------------------------
/**
 * Success
 *
 * @export
 * @interface IFilterByQuickSearchResponse
 */
export interface IFilterByQuickSearchResponse extends ISearchResults {}

// ----------------------------------------
//  IGetDocumentsPageRequest
// ----------------------------------------
/**
 * Returns a page of documents based on search ID
 *
 * @export
 * @interface IGetDocumentsPageRequest
 */
export interface IGetDocumentsPageRequest {
  /**
   * The unique search identifier returned from the original search request
   *
   * @type {string}
   * @memberof IGetDocumentsPageRequest
   */
  id: string;

  /**
   * The location in the search results to start slicing data for the customer page of data
   *
   * @type {number}
   * @memberof IGetDocumentsPageRequest
   */
  offset: number;

  /**
   * The number of search results to return for this page (defaults to 15)
   *
   * @type {number}
   * @memberof IGetDocumentsPageRequest
   */
  limit?: number;

  /**
   * Retrieve documents by type-based integer
   *
   * @type {number}
   * @memberof IGetDocumentsPageRequest
   */
  idx?: number;
}

// ----------------------------------------
//  IGetDocumentsPageResponse
// ----------------------------------------
/**
 * Success
 *
 * @export
 * @interface IGetDocumentsPageResponse
 */
export interface IGetDocumentsPageResponse extends IPagedResponse {}

// ----------------------------------------
//  IGetReadyForCustomerPageRequest
// ----------------------------------------
/**
 * Returns a page of orders ready for customer pickup based on search ID
 *
 * @export
 * @interface IGetReadyForCustomerPageRequest
 */
export interface IGetReadyForCustomerPageRequest {
  /**
   * The unique search identifier returned from the original search request
   *
   * @type {string}
   * @memberof IGetReadyForCustomerPageRequest
   */
  id: string;

  /**
   * The location in the search results to start slicing data for the customer page of data
   *
   * @type {number}
   * @memberof IGetReadyForCustomerPageRequest
   */
  offset: number;

  /**
   * The number of search results to return for this page (defaults to 10)
   *
   * @type {number}
   * @memberof IGetReadyForCustomerPageRequest
   */
  limit?: number;
}

// ----------------------------------------
//  IGetReadyForCustomerPageResponse
// ----------------------------------------
/**
 * Success
 *
 * @export
 * @interface IGetReadyForCustomerPageResponse
 */
export interface IGetReadyForCustomerPageResponse extends IPagedResponse {}

// ----------------------------------------
//  IGetKpiRequest
// ----------------------------------------
/**
 * Retrieves the KPI data and brand logo for the current store
 *
 * @export
 * @interface IGetKpiRequest
 */
export interface IGetKpiRequest {}

// ----------------------------------------
//  IGetKpiResponse
// ----------------------------------------
/**
 * Success
 *
 * @export
 * @interface IGetKpiResponse
 */
export interface IGetKpiResponse extends IKpi {}
