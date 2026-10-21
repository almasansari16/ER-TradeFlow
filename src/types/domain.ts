/**
 * TradeFlow domain model.
 * These types describe what the UI needs. They are deliberately independent of
 * SAP structures so that a future integration layer can map S/4HANA objects
 * (Business Partner, Sales Document, Billing Document, Delivery…) onto them.
 */

export type ID = string
export type ISODate = string
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR' | 'QAR' | 'SGD'

// ─── People & organisation ────────────────────────────────────────────────

export type RoleId =
  | 'distributor'
  | 'sales_coordinator'
  | 'territory_manager'
  | 'regional_manager'
  | 'general_manager'
  | 'finance'
  | 'logistics'
  | 'admin'

export interface RoleDefinition {
  id: RoleId
  label: string
  description: string
  /** Approval stage this role acts on, if any. */
  approvalStage?: ApprovalStageName
}

export interface DemoUser {
  id: ID
  name: string
  email: string
  title: string
  role: RoleId
  /** Territory scope for territory managers. */
  territoryIds?: ID[]
  /** Region scope for regional managers. */
  regionId?: ID
  /** Customer account for distributor users. */
  customerId?: ID
  active: boolean
  lastActiveAt: ISODate
}

export interface Region {
  id: ID
  name: string
  managerId: ID
}

export interface Territory {
  id: ID
  name: string
  regionId: ID
  countries: string[]
  managerId: ID
  defaultCurrency: CurrencyCode
  /** Brand ids that distributors in this territory may see and order. */
  visibleBrandIds: ID[]
}

// ─── Catalogue ────────────────────────────────────────────────────────────

export interface Brand {
  id: ID
  name: string
  origin: string
  /** Accent hue used to render product visuals. */
  hue: number
}

export type ProductCategory =
  | 'Eau de Parfum'
  | 'Extrait de Parfum'
  | 'Eau de Toilette'
  | 'Body Mist'
  | 'Home Fragrance'
  | 'Gift Set'

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Pre-order'

export interface Product {
  id: ID
  sku: string
  name: string
  brandId: ID
  category: ProductCategory
  sizeMl: number
  /** Illustrative list price in USD. */
  unitPriceUsd: number
  availableQty: number
  stockStatus: StockStatus
  /** Minimum order quantity / case pack. */
  casePack: number
  notes: string
  /** Visual style seed for the mock bottle illustration. */
  bottle: 'tall' | 'round' | 'square' | 'jar' | 'box'
  isNew?: boolean
}

// ─── Customers & registration ─────────────────────────────────────────────

export type CustomerStatus = 'Active' | 'Pending Review' | 'On Hold' | 'Blocked'

export interface Address {
  line1: string
  line2?: string
  city: string
  region?: string
  postalCode?: string
  country: string
}

export interface Contact {
  id: ID
  name: string
  role: string
  email: string
  phone: string
  primary?: boolean
}

export interface Customer {
  id: ID
  code: string
  name: string
  legalName: string
  country: string
  city: string
  territoryId: ID
  status: CustomerStatus
  crNumber: string
  taxNumber: string
  currency: CurrencyCode
  paymentTerms: string
  creditLimit: number
  brandIds: ID[]
  contacts: Contact[]
  billingAddress: Address
  deliveryAddress: Address
  customerSince: ISODate
  /** Placeholder for a future SAP Business Partner number. Mock only. */
  externalRef?: string
  accountManagerId: ID
  tier: 'Platinum' | 'Gold' | 'Silver' | 'New'
}

export type ApplicationStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Information Requested'
  | 'Approved'
  | 'Rejected'

export interface ReviewStep {
  label: string
  status: 'done' | 'current' | 'upcoming' | 'blocked'
  at?: ISODate
  by?: string
  note?: string
}

export interface RegistrationApplication {
  id: ID
  ref: string
  companyName: string
  legalName: string
  crNumber: string
  taxNumber: string
  country: string
  city: string
  territoryId: ID
  website?: string
  businessType: string
  annualVolumeBand: string
  contact: Omit<Contact, 'id'>
  requestedBrandIds: ID[]
  billingAddress: Address
  deliveryAddress: Address
  documents: { name: string; type: DocumentType; sizeKb: number }[]
  submittedAt: ISODate
  status: ApplicationStatus
  steps: ReviewStep[]
  pendingItems: string[]
  rejectionReason?: string
  reviewerId?: ID
  activity: ActivityEntry[]
  customerId?: ID
}

// ─── Sales order requests ─────────────────────────────────────────────────

export type RequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'In Approval'
  | 'Changes Requested'
  | 'Approved'
  | 'Rejected'
  | 'Awaiting Payment'
  | 'Payment Verified'
  | 'In Fulfillment'
  | 'Ready for Collection'
  | 'Collected'
  | 'Cancelled'

export type ApprovalStageName = 'Territory Manager' | 'Regional Manager' | 'General Manager'

export type ApprovalStepStatus =
  | 'Waiting'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'

export interface ApprovalStep {
  stage: ApprovalStageName
  approverId: ID
  status: ApprovalStepStatus
  slaHours: number
  enteredAt?: ISODate
  actedAt?: ISODate
  actedById?: ID
  comment?: string
}

export interface OrderLine {
  productId: ID
  quantity: number
  /** Unit price in the request currency at the time of the request. */
  unitPrice: number
}

export interface PromoAllocation {
  eligibleUnits: number
  testers: number
  samples: number
  ruleVersion: string
}

export interface ActivityEntry {
  id: ID
  at: ISODate
  actorId: ID
  action: string
  comment?: string
  kind: 'system' | 'user' | 'approval' | 'rejection' | 'change' | 'finance' | 'logistics'
}

export type FulfilmentMode = 'Delivery' | 'Collection'

export interface SalesOrderRequest {
  id: ID
  ref: string
  customerId: ID
  territoryId: ID
  currency: CurrencyCode
  lines: OrderLine[]
  promo: PromoAllocation
  status: RequestStatus
  approvalSteps: ApprovalStep[]
  fulfilment: FulfilmentMode
  deliveryAddress?: Address
  collectionWarehouse?: string
  requestedDate: ISODate
  customerPo?: string
  notes?: string
  createdAt: ISODate
  updatedAt: ISODate
  createdById: ID
  activity: ActivityEntry[]
  invoiceId?: ID
  shipmentId?: ID
  /** Mock placeholder for a future SAP sales document number. */
  externalRef?: string
}

// ─── Finance ──────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'Issued'
  | 'Receipt Uploaded'
  | 'Payment Verified'
  | 'Partially Paid'
  | 'Overdue'
  | 'Cancelled'

export interface ProformaInvoice {
  id: ID
  number: string
  requestId: ID
  customerId: ID
  issuedAt: ISODate
  dueAt: ISODate
  currency: CurrencyCode
  subtotal: number
  freight: number
  tax: number
  total: number
  status: InvoiceStatus
  bankDetails: { bank: string; accountName: string; iban: string; swift: string }
}

export type PaymentStatus =
  | 'Awaiting Receipt'
  | 'Receipt Uploaded'
  | 'Under Verification'
  | 'Verified'
  | 'Rejected'

export interface Payment {
  id: ID
  ref: string
  invoiceId: ID
  customerId: ID
  amount: number
  currency: CurrencyCode
  method: 'Bank Transfer' | 'Letter of Credit' | 'Cheque'
  valueDate?: ISODate
  payerBank?: string
  receiptFile?: { name: string; sizeKb: number; uploadedAt: ISODate }
  status: PaymentStatus
  verifiedById?: ID
  verifiedAt?: ISODate
  note?: string
}

// ─── Logistics ────────────────────────────────────────────────────────────

export const SHIPMENT_FLOW = [
  'Approved',
  'Awaiting Payment',
  'Payment Verified',
  'Ready for Warehouse Preparation',
  'Documents in Progress',
  'Ready for Collection',
  'Collected',
] as const

export type ShipmentStatus = (typeof SHIPMENT_FLOW)[number]

export interface PackingLine {
  productId: ID
  quantity: number
  cartons: number
  kind: 'Saleable' | 'Tester' | 'Sample'
}

export interface Shipment {
  id: ID
  ref: string
  requestId: ID
  customerId: ID
  status: ShipmentStatus
  mode: 'Customer Collection' | 'Sea Freight' | 'Air Freight'
  warehouse: string
  collectionRef?: string
  collectionWindow?: string
  cartons: number
  grossWeightKg: number
  volumeCbm: number
  packing: PackingLine[]
  history: { status: ShipmentStatus; at: ISODate; byId: ID; note?: string }[]
  documentIds: ID[]
}

// ─── Documents ────────────────────────────────────────────────────────────

export type DocumentType =
  | 'Commercial Registration'
  | 'Tax Certificate'
  | 'Trade License'
  | 'Bank Reference Letter'
  | 'Proforma Invoice'
  | 'Payment Receipt'
  | 'Packing List'
  | 'Commercial Invoice'
  | 'Certificate of Origin'
  | 'Bill of Lading'
  | 'Safety Data Sheet'

export interface DocumentRecord {
  id: ID
  name: string
  type: DocumentType
  linkedTo: { kind: 'customer' | 'request' | 'invoice' | 'shipment' | 'application'; id: ID }
  customerId?: ID
  uploadedAt: ISODate
  uploadedById: ID
  sizeKb: number
  status: 'Verified' | 'Pending Review' | 'Draft' | 'Expired' | 'Final'
  expiresAt?: ISODate
}

// ─── Communication ────────────────────────────────────────────────────────

export interface EmailParticipant {
  name: string
  email: string
}

export interface EmailMessage {
  id: ID
  from: EmailParticipant
  to: EmailParticipant[]
  sentAt: ISODate
  body: string
  attachments: { name: string; sizeKb: number }[]
  direction: 'inbound' | 'outbound'
  /** True for messages composed inside the prototype (never actually sent). */
  simulated?: boolean
}

export type FollowUpStatus = 'None' | 'Open' | 'Due Today' | 'Overdue' | 'Done'

export interface EmailThread {
  id: ID
  subject: string
  customerId: ID
  requestId?: ID
  messages: EmailMessage[]
  followUp: { status: FollowUpStatus; dueAt?: ISODate; ownerId?: ID; note?: string }
  unread: boolean
  starred?: boolean
  labels: string[]
}

// ─── Notifications ────────────────────────────────────────────────────────

export interface AppNotification {
  id: ID
  title: string
  body: string
  at: ISODate
  read: boolean
  link?: string
  kind: 'approval' | 'finance' | 'logistics' | 'customer' | 'system' | 'email'
  audience: RoleId[]
}

// ─── Configuration ────────────────────────────────────────────────────────

export interface PromoRules {
  enabled: boolean
  version: string
  /** One tester per N eligible fragrance units. */
  testerPerUnits: number
  /** Samples granted per block of eligible units. */
  samplesPerBlock: number
  sampleBlockUnits: number
  sampleSizeMl: number
  eligibleCategories: ProductCategory[]
}

export interface ApprovalRule {
  id: ID
  name: string
  /** Inclusive lower bound in USD. */
  minValueUsd: number
  /** Exclusive upper bound in USD; null = no upper bound. */
  maxValueUsd: number | null
  stages: ApprovalStageName[]
  slaHours: number
  active: boolean
}

export interface NotificationPreference {
  id: ID
  event: string
  description: string
  inApp: boolean
  email: boolean
  roles: RoleId[]
}

// ─── Integration monitor (simulated) ──────────────────────────────────────

export type IntegrationStatus = 'Synced' | 'Pending' | 'Failed' | 'Retrying'

export interface IntegrationEvent {
  id: ID
  entity: 'Business Partner' | 'Sales Order' | 'Pricing' | 'Billing Document' | 'Outbound Delivery' | 'Stock'
  direction: 'Outbound' | 'Inbound'
  objectRef: string
  targetRef?: string
  status: IntegrationStatus
  at: ISODate
  attempts: number
  message: string
  errorCode?: string
  payloadPreview: string
}

export interface IntegrationChannel {
  id: ID
  name: string
  status: 'Operational' | 'Degraded' | 'Down'
  lastSyncAt: ISODate
  latencyMs: number
  successRate: number
}
