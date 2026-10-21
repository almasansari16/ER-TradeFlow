/**
 * Frontend service contracts.
 *
 * These interfaces are the seam between the UI and a future backend /
 * integration layer (for example a BFF that talks to SAP S/4HANA via
 * released APIs). The prototype ships only MOCK implementations
 * (see ./mock). No endpoints are assumed or invented here — a real
 * implementation decides its own transport.
 */
import type {
  ApprovalStep,
  CurrencyCode,
  Customer,
  EmailThread,
  IntegrationEvent,
  Payment,
  Product,
  ProformaInvoice,
  RegistrationApplication,
  SalesOrderRequest,
  Shipment,
  StockStatus,
} from '@/types/domain'

export type RegistrationInput = Omit<
  RegistrationApplication,
  'id' | 'ref' | 'submittedAt' | 'status' | 'steps' | 'pendingItems' | 'activity' | 'reviewerId' | 'rejectionReason' | 'customerId'
>

export interface SubmissionReceipt {
  id: string
  ref: string
  receivedAt: string
}

export interface PriceAvailability {
  productId: string
  currency: CurrencyCode
  unitPrice: number
  availableQty: number
  stockStatus: StockStatus
  /** Source marker so the UI can label values honestly. */
  source: 'mock'
}

export interface ProductQuery {
  search?: string
  brandIds?: string[]
  categories?: Product['category'][]
}

export interface CustomerService {
  submitRegistration(input: RegistrationInput): Promise<SubmissionReceipt>
  lookupCustomers(query: string): Promise<Customer[]>
  getCustomer(id: string): Promise<Customer | undefined>
}

export interface CatalogService {
  listProducts(query?: ProductQuery): Promise<Product[]>
  getPriceAndAvailability(productIds: string[], customerId: string): Promise<PriceAvailability[]>
}

export interface SalesOrderService {
  submitRequest(request: Pick<SalesOrderRequest, 'customerId' | 'lines' | 'fulfilment'>): Promise<SubmissionReceipt>
  getApprovalStatus(requestId: string): Promise<ApprovalStep[]>
}

export interface FinanceService {
  getProformaInvoice(id: string): Promise<ProformaInvoice | undefined>
  getPaymentStatus(invoiceId: string): Promise<Payment | undefined>
}

export interface LogisticsService {
  getShipmentStatus(id: string): Promise<Shipment | undefined>
}

export interface CommunicationService {
  listConversations(customerId?: string): Promise<EmailThread[]>
}

export interface IntegrationService {
  /** Simulated retry — resolves with the record's new state. */
  retry(event: IntegrationEvent): Promise<IntegrationEvent>
}

export interface TradeFlowServices {
  customers: CustomerService
  catalog: CatalogService
  orders: SalesOrderService
  finance: FinanceService
  logistics: LogisticsService
  communications: CommunicationService
  integration: IntegrationService
}
