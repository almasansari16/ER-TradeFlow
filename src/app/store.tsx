/**
 * Demo state store.
 * Holds every record the prototype shows and the simulated workflow actions
 * that mutate it. Everything lives in browser memory (mirrored to
 * localStorage so a stakeholder demo survives a refresh) — nothing is sent anywhere.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  ActivityEntry,
  AppNotification,
  ApprovalRule,
  ApprovalStep,
  Customer,
  CustomerStatus,
  DemoUser,
  DocumentRecord,
  EmailMessage,
  EmailThread,
  FollowUpStatus,
  IntegrationChannel,
  IntegrationEvent,
  NotificationPreference,
  OrderLine,
  Payment,
  Product,
  ProformaInvoice,
  PromoRules,
  RegistrationApplication,
  RoleId,
  SalesOrderRequest,
  Shipment,
  ShipmentStatus,
  Territory,
} from '@/types/domain'
import { SHIPMENT_FLOW } from '@/types/domain'
import { DEMO_USER_BY_ROLE, regions, territories as seedTerritories, users as seedUsers } from '@/data/org'
import { brands, products as seedProducts } from '@/data/catalog'
import { applications as seedApplications, customers as seedCustomers } from '@/data/customers'
import { defaultApprovalRules, defaultNotificationPrefs, defaultPromoRules } from '@/data/config'
import {
  buildInvoice,
  buildPacking,
  documents as seedDocuments,
  invoices as seedInvoices,
  payments as seedPayments,
  salesOrderRequests as seedRequests,
  shipments as seedShipments,
  warehouseFor,
} from '@/data/transactions'
import { emailThreads as seedThreads, notifications as seedNotifications } from '@/data/communications'
import { integrationChannels as seedChannels, integrationEvents as seedEvents } from '@/data/integration'
import { calculatePromo } from '@/utils/promo'
import { roundMoney, toUsd } from '@/utils/fx'
import { nowIso, uid } from '@/utils/time'
import type { RegistrationInput } from '@/services'

// ─── State shape ──────────────────────────────────────────────────────────

export interface CartItem {
  productId: string
  quantity: number
}

export interface DemoState {
  version: number
  role: RoleId
  users: DemoUser[]
  territories: Territory[]
  products: Product[]
  customers: Customer[]
  applications: RegistrationApplication[]
  requests: SalesOrderRequest[]
  invoices: ProformaInvoice[]
  payments: Payment[]
  shipments: Shipment[]
  documents: DocumentRecord[]
  threads: EmailThread[]
  notifications: AppNotification[]
  promoRules: PromoRules
  approvalRules: ApprovalRule[]
  notificationPrefs: NotificationPreference[]
  integrationEvents: IntegrationEvent[]
  integrationChannels: IntegrationChannel[]
  cart: CartItem[]
  cartCustomerId?: string
  counters: { request: number; invoice: number; shipment: number; customer: number; application: number; payment: number }
}

const STATE_VERSION = 3
const STORAGE_KEY = 'tradeflow-demo-state'

function seedState(role: RoleId = 'distributor'): DemoState {
  return structuredClone({
    version: STATE_VERSION,
    role,
    users: seedUsers,
    territories: seedTerritories,
    products: seedProducts,
    customers: seedCustomers,
    applications: seedApplications,
    requests: seedRequests,
    invoices: seedInvoices,
    payments: seedPayments,
    shipments: seedShipments,
    documents: seedDocuments,
    threads: seedThreads,
    notifications: seedNotifications,
    promoRules: defaultPromoRules,
    approvalRules: defaultApprovalRules,
    notificationPrefs: defaultNotificationPrefs,
    integrationEvents: seedEvents,
    integrationChannels: seedChannels,
    cart: [],
    counters: { request: 146, invoice: 407, shipment: 217, customer: 10093, application: 315, payment: 710 },
  })
}

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed.version === STATE_VERSION) return parsed
    }
  } catch {
    /* storage unavailable or corrupt — fall back to seed */
  }
  return seedState()
}

// ─── Pure helpers / selectors ─────────────────────────────────────────────

export const currentUserOf = (s: Pick<DemoState, 'role' | 'users'>) =>
  s.users.find((u) => u.id === DEMO_USER_BY_ROLE[s.role])!

export function territoriesInScope(s: DemoState, user: DemoUser): string[] {
  if (user.role === 'territory_manager') return user.territoryIds ?? []
  if (user.role === 'regional_manager') return s.territories.filter((t) => t.regionId === user.regionId).map((t) => t.id)
  if (user.role === 'distributor') {
    const c = s.customers.find((x) => x.id === user.customerId)
    return c ? [c.territoryId] : []
  }
  return s.territories.map((t) => t.id)
}

/** Customer ids the current demo user may see. */
export function customerScope(s: DemoState, user: DemoUser): Set<string> {
  if (user.role === 'distributor') return new Set(user.customerId ? [user.customerId] : [])
  const terr = new Set(territoriesInScope(s, user))
  return new Set(s.customers.filter((c) => terr.has(c.territoryId)).map((c) => c.id))
}

export function rulesForValue(rules: ApprovalRule[], valueUsd: number) {
  const active = rules.filter((r) => r.active).sort((a, b) => a.minValueUsd - b.minValueUsd)
  return active.find((r) => valueUsd >= r.minValueUsd && (r.maxValueUsd === null || valueUsd < r.maxValueUsd)) ?? active.at(-1)!
}

export function approverIdFor(s: DemoState, stage: ApprovalStep['stage'], territoryId: string) {
  const t = s.territories.find((x) => x.id === territoryId)!
  if (stage === 'Territory Manager') return t.managerId
  if (stage === 'Regional Manager') return regions.find((r) => r.id === t.regionId)!.managerId
  return s.users.find((u) => u.role === 'general_manager')!.id
}

/** Can the given user act on the request's current approval step? */
export function canActOn(s: DemoState, user: DemoUser, r: SalesOrderRequest) {
  const step = r.approvalSteps.find((x) => x.status === 'Pending')
  if (!step) return false
  if (user.role === 'general_manager') return step.stage === 'General Manager'
  if (user.role === 'regional_manager')
    return step.stage === 'Regional Manager' && territoriesInScope(s, user).includes(r.territoryId)
  if (user.role === 'territory_manager')
    return step.stage === 'Territory Manager' && territoriesInScope(s, user).includes(r.territoryId)
  return false
}

export const pendingStep = (r: SalesOrderRequest) => r.approvalSteps.find((x) => x.status === 'Pending')

export const requestTotal = (r: Pick<SalesOrderRequest, 'lines'>) =>
  roundMoney(r.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0))

// ─── Action inputs ────────────────────────────────────────────────────────

export interface RequestDraftInput {
  id?: string
  customerId: string
  lines: OrderLine[]
  fulfilment: SalesOrderRequest['fulfilment']
  deliveryAddress?: SalesOrderRequest['deliveryAddress']
  collectionWarehouse?: string
  requestedDate: string
  customerPo?: string
  notes?: string
}

export type ApprovalDecision = 'approve' | 'reject' | 'changes'
export type ApplicationDecision = 'start' | 'approve' | 'request_info' | 'reject'

interface StoreApi {
  state: DemoState
  user: DemoUser
  setRole: (role: RoleId) => void
  resetDemo: () => void
  // notifications
  markNotificationRead: (id: string, read?: boolean) => void
  markAllNotificationsRead: () => void
  // cart
  addToCart: (productId: string, qty: number) => void
  setCartQty: (productId: string, qty: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  // requests
  saveDraft: (input: RequestDraftInput) => string
  submitRequest: (input: RequestDraftInput, ref: string) => string
  decideApproval: (requestId: string, decision: ApprovalDecision, comment: string) => void
  cancelRequest: (requestId: string, comment: string) => void
  addRequestComment: (requestId: string, comment: string) => void
  // applications & customers
  submitApplication: (input: RegistrationInput, receipt: { id: string; ref: string }) => void
  decideApplication: (id: string, decision: ApplicationDecision, comment: string, items?: string[]) => void
  respondToInformationRequest: (id: string, files: { name: string; sizeKb: number }[], comment: string) => void
  setCustomerStatus: (id: string, status: CustomerStatus, comment: string) => void
  // finance
  issueInvoice: (requestId: string) => void
  uploadReceipt: (invoiceId: string, file: { name: string; sizeKb: number }, meta: { valueDate: string; payerBank: string }) => void
  verifyPayment: (paymentId: string, decision: 'verify' | 'reject', note: string) => void
  // logistics
  advanceShipment: (shipmentId: string, note?: string) => void
  // documents
  addDocument: (doc: Omit<DocumentRecord, 'id' | 'uploadedAt' | 'uploadedById'>) => void
  // email
  sendEmail: (input: { threadId?: string; subject: string; to: { name: string; email: string }[]; body: string; attachments: { name: string; sizeKb: number }[]; customerId: string; requestId?: string }) => string
  markThreadRead: (threadId: string, unread?: boolean) => void
  setFollowUp: (threadId: string, status: FollowUpStatus, dueAt?: string, note?: string) => void
  linkThread: (threadId: string, customerId: string, requestId?: string) => void
  // admin
  updatePromoRules: (rules: PromoRules) => void
  updateApprovalRules: (rules: ApprovalRule[]) => void
  toggleNotificationPref: (id: string, channel: 'inApp' | 'email') => void
  updateUser: (id: string, patch: Partial<Pick<DemoUser, 'active' | 'territoryIds' | 'title'>>) => void
  updateTerritory: (id: string, patch: Partial<Pick<Territory, 'managerId' | 'visibleBrandIds'>>) => void
  setIntegrationEvent: (event: IntegrationEvent) => void
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [state])

  /** Immer-style helper: clone, mutate, commit. State is small enough for structuredClone. */
  const mutate = useCallback((recipe: (draft: DemoState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev)
      recipe(next)
      return next
    })
  }, [])

  const user = useMemo(() => currentUserOf(state), [state])

  const api = useMemo<StoreApi>(() => {
    const actorOf = (s: DemoState) => currentUserOf(s)
    const log = (r: { activity: ActivityEntry[] }, actorId: string, action: string, kind: ActivityEntry['kind'], comment?: string) =>
      r.activity.push({ id: uid('act'), at: nowIso(), actorId, action, kind, comment: comment || undefined })
    const notify = (s: DemoState, n: Omit<AppNotification, 'id' | 'at' | 'read'>) =>
      s.notifications.unshift({ ...n, id: uid('n'), at: nowIso(), read: false })

    const buildSteps = (s: DemoState, customer: Customer, subtotal: number): ApprovalStep[] => {
      const rule = rulesForValue(s.approvalRules, toUsd(subtotal, customer.currency))
      return rule.stages.map((stage, i) => ({
        stage,
        approverId: approverIdFor(s, stage, customer.territoryId),
        status: i === 0 ? 'Pending' : 'Waiting',
        slaHours: rule.slaHours,
        enteredAt: i === 0 ? nowIso() : undefined,
      }))
    }

    const upsertDraft = (s: DemoState, input: RequestDraftInput, id: string, ref: string): SalesOrderRequest => {
      const customer = s.customers.find((c) => c.id === input.customerId)!
      const existing = s.requests.find((r) => r.id === id)
      const base: SalesOrderRequest = existing ?? {
        id,
        ref,
        customerId: customer.id,
        territoryId: customer.territoryId,
        currency: customer.currency,
        lines: [],
        promo: { eligibleUnits: 0, testers: 0, samples: 0, ruleVersion: s.promoRules.version },
        status: 'Draft',
        approvalSteps: [],
        fulfilment: 'Collection',
        requestedDate: input.requestedDate,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdById: actorOf(s).id,
        activity: [],
      }
      Object.assign(base, {
        customerId: customer.id,
        territoryId: customer.territoryId,
        currency: customer.currency,
        lines: input.lines,
        promo: calculatePromo(input.lines, s.products, s.promoRules),
        fulfilment: input.fulfilment,
        deliveryAddress: input.fulfilment === 'Delivery' ? input.deliveryAddress : undefined,
        collectionWarehouse: input.fulfilment === 'Collection' ? input.collectionWarehouse ?? warehouseFor(customer.territoryId) : undefined,
        requestedDate: input.requestedDate,
        customerPo: input.customerPo,
        notes: input.notes,
        updatedAt: nowIso(),
      })
      if (!existing) {
        log(base, actorOf(s).id, 'Request created', 'user')
        s.requests.unshift(base)
      }
      return base
    }

    const createShipment = (s: DemoState, r: SalesOrderRequest) => {
      const pk = buildPacking(r)
      const shp: Shipment = {
        id: `shp-${r.id}`,
        ref: `SHP-${new Date().getFullYear()}-${String(s.counters.shipment++).padStart(4, '0')}`,
        requestId: r.id,
        customerId: r.customerId,
        status: 'Approved',
        mode: r.fulfilment === 'Delivery' ? 'Sea Freight' : 'Customer Collection',
        warehouse: r.collectionWarehouse ?? warehouseFor(r.territoryId),
        ...pk,
        history: [{ status: 'Approved', at: nowIso(), byId: 'u-system' }],
        documentIds: [],
      }
      s.shipments.unshift(shp)
      r.shipmentId = shp.id
    }

    const syncShipment = (s: DemoState, requestId: string, status: ShipmentStatus, byId: string, note?: string) => {
      const shp = s.shipments.find((x) => x.requestId === requestId)
      if (!shp || shp.status === status) return
      shp.status = status
      shp.history.push({ status, at: nowIso(), byId, note })
    }

    return {
      state,
      user,
      setRole: (role) => mutate((s) => void (s.role = role)),
      resetDemo: () => {
        const role = state.role
        setState(seedState(role))
      },

      markNotificationRead: (id, read = true) =>
        mutate((s) => {
          const n = s.notifications.find((x) => x.id === id)
          if (n) n.read = read
        }),
      markAllNotificationsRead: () =>
        mutate((s) => s.notifications.forEach((n) => n.audience.includes(s.role) && (n.read = true))),

      addToCart: (productId, qty) =>
        mutate((s) => {
          const item = s.cart.find((c) => c.productId === productId)
          if (item) item.quantity += qty
          else s.cart.push({ productId, quantity: qty })
        }),
      setCartQty: (productId, qty) =>
        mutate((s) => {
          if (qty <= 0) s.cart = s.cart.filter((c) => c.productId !== productId)
          else {
            const item = s.cart.find((c) => c.productId === productId)
            if (item) item.quantity = qty
            else s.cart.push({ productId, quantity: qty })
          }
        }),
      removeFromCart: (productId) => mutate((s) => void (s.cart = s.cart.filter((c) => c.productId !== productId))),
      clearCart: () => mutate((s) => void (s.cart = [])),

      saveDraft: (input) => {
        const id = input.id ?? uid('r')
        mutate((s) => {
          const ref = `DRAFT-${String(s.counters.request).padStart(4, '0')}`
          const isNew = !s.requests.some((r) => r.id === id)
          if (isNew) s.counters.request++
          const r = upsertDraft(s, input, id, ref)
          if (r.status !== 'Changes Requested') r.status = 'Draft'
          log(r, actorOf(s).id, 'Draft saved', 'user')
        })
        return id
      },

      submitRequest: (input, ref) => {
        const id = input.id ?? uid('r')
        mutate((s) => {
          if (!s.requests.some((r) => r.id === id)) s.counters.request++
          const r = upsertDraft(s, input, id, ref)
          if (r.ref.startsWith('DRAFT')) r.ref = ref
          const customer = s.customers.find((c) => c.id === r.customerId)!
          const resubmission = r.status === 'Changes Requested'
          r.approvalSteps = buildSteps(s, customer, requestTotal(r))
          r.status = 'In Approval'
          log(r, actorOf(s).id, resubmission ? 'Request revised and resubmitted' : 'Request submitted for approval', 'user', input.notes)
          const first = r.approvalSteps[0]!
          notify(s, { kind: 'approval', title: `${r.ref} awaits your approval`, body: `${customer.name} · ${r.approvalSteps.length} approval level(s)`, link: `/app/approvals/${r.id}`, audience: [first.stage === 'Territory Manager' ? 'territory_manager' : first.stage === 'Regional Manager' ? 'regional_manager' : 'general_manager'] })
          notify(s, { kind: 'approval', title: `${r.ref} submitted`, body: `Now with ${s.users.find((u) => u.id === first.approverId)?.name} (${first.stage}).`, link: `/app/requests/${r.id}`, audience: ['distributor', 'sales_coordinator'] })
          s.cart = []
        })
        return id
      },

      decideApproval: (requestId, decision, comment) =>
        mutate((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          const actor = actorOf(s)
          if (!r || !canActOn(s, actor, r)) return
          const idx = r.approvalSteps.findIndex((x) => x.status === 'Pending')
          const step = r.approvalSteps[idx]!
          step.actedAt = nowIso()
          step.actedById = actor.id
          step.comment = comment || undefined
          const customer = s.customers.find((c) => c.id === r.customerId)!
          r.updatedAt = nowIso()
          if (decision === 'approve') {
            step.status = 'Approved'
            log(r, actor.id, `Approved at ${step.stage} stage (demo)`, 'approval', comment)
            const next = r.approvalSteps[idx + 1]
            if (next) {
              next.status = 'Pending'
              next.enteredAt = nowIso()
              notify(s, { kind: 'approval', title: `${r.ref} awaits your approval`, body: `${customer.name} · approved by ${actor.name}`, link: `/app/approvals/${r.id}`, audience: [next.stage === 'Regional Manager' ? 'regional_manager' : 'general_manager'] })
              notify(s, { kind: 'approval', title: `${r.ref} approved by ${step.stage.toLowerCase()}`, body: `Now with ${s.users.find((u) => u.id === next.approverId)?.name} (${next.stage}).`, link: `/app/requests/${r.id}`, audience: ['distributor', 'sales_coordinator'] })
            } else {
              r.status = 'Approved'
              r.externalRef = `SO-45${String(Math.floor(Math.random() * 90000) + 10000)} (mock)`
              log(r, 'u-system', 'All approvals complete — request approved (demo)', 'system')
              createShipment(s, r)
              notify(s, { kind: 'approval', title: `${r.ref} approved`, body: 'A proforma invoice will be issued by Finance.', link: `/app/requests/${r.id}`, audience: ['distributor', 'sales_coordinator'] })
              notify(s, { kind: 'finance', title: 'Proforma invoice to issue', body: `${r.ref} (${customer.name}) is approved.`, link: `/app/requests/${r.id}`, audience: ['finance'] })
              s.integrationEvents.unshift({ id: uid('ie'), entity: 'Sales Order', direction: 'Outbound', objectRef: r.ref, targetRef: r.externalRef, status: 'Pending', at: nowIso(), attempts: 0, message: 'Queued for sales order creation (simulated — no ERP connection).', payloadPreview: JSON.stringify({ request: r.ref, soldTo: customer.code, items: r.lines.length, currency: r.currency }, null, 2) })
            }
          } else if (decision === 'reject') {
            step.status = 'Rejected'
            r.status = 'Rejected'
            log(r, actor.id, `Rejected at ${step.stage} stage (demo)`, 'rejection', comment)
            notify(s, { kind: 'approval', title: `${r.ref} rejected`, body: comment || 'See request for details.', link: `/app/requests/${r.id}`, audience: ['distributor', 'sales_coordinator'] })
          } else {
            step.status = 'Changes Requested'
            r.status = 'Changes Requested'
            log(r, actor.id, `Changes requested at ${step.stage} stage (demo)`, 'change', comment)
            notify(s, { kind: 'approval', title: `Changes requested on ${r.ref}`, body: comment || 'See request for details.', link: `/app/requests/${r.id}`, audience: ['distributor', 'sales_coordinator'] })
          }
        }),

      cancelRequest: (requestId, comment) =>
        mutate((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          if (!r) return
          r.status = 'Cancelled'
          r.approvalSteps.forEach((st) => (st.status === 'Pending' || st.status === 'Waiting') && (st.status = 'Waiting'))
          log(r, actorOf(s).id, 'Request cancelled', 'user', comment)
        }),

      addRequestComment: (requestId, comment) =>
        mutate((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          if (r) log(r, actorOf(s).id, 'Comment added', 'user', comment)
        }),

      submitApplication: (input, receipt) =>
        mutate((s) => {
          s.applications.unshift({
            ...input,
            id: receipt.id,
            ref: receipt.ref,
            submittedAt: nowIso(),
            status: 'Submitted',
            pendingItems: [],
            steps: [
              { label: 'Application submitted', status: 'done', at: nowIso(), by: input.contact.name },
              { label: 'Document verification', status: 'current' },
              { label: 'Commercial review', status: 'upcoming' },
              { label: 'Territory manager approval', status: 'upcoming' },
              { label: 'Account set-up', status: 'upcoming' },
            ],
            activity: [{ id: uid('act'), at: nowIso(), actorId: 'u-system', action: 'Application received via registration portal (demo)', kind: 'system' }],
          })
          notify(s, { kind: 'customer', title: 'New distributor application', body: `${input.companyName} (${input.city}) submitted ${receipt.ref}.`, link: `/app/customers/applications/${receipt.id}`, audience: ['sales_coordinator', 'admin', 'territory_manager'] })
        }),

      decideApplication: (id, decision, comment, items = []) =>
        mutate((s) => {
          const a = s.applications.find((x) => x.id === id)
          if (!a) return
          const actor = actorOf(s)
          const stamp = { at: nowIso(), by: actor.name }
          a.reviewerId = actor.id
          if (decision === 'start') {
            a.status = 'Under Review'
            a.steps[1] = { ...a.steps[1]!, status: 'done', ...stamp }
            a.steps[2] = { ...a.steps[2]!, status: 'current' }
            a.pendingItems = []
            a.activity.push({ id: uid('act'), at: nowIso(), actorId: actor.id, action: 'Documents verified', comment, kind: 'user' })
          } else if (decision === 'approve') {
            a.status = 'Approved'
            a.steps = a.steps.map((st) => (st.status === 'done' ? st : { ...st, status: 'done', ...stamp }))
            const code = `CUST-${s.counters.customer++}`
            const customerId = uid('c')
            a.customerId = customerId
            const terr = s.territories.find((t) => t.id === a.territoryId)!
            s.customers.unshift({
              id: customerId,
              code,
              name: a.companyName,
              legalName: a.legalName,
              country: a.country,
              city: a.city,
              territoryId: a.territoryId,
              status: 'Active',
              crNumber: a.crNumber,
              taxNumber: a.taxNumber,
              currency: terr.defaultCurrency,
              paymentTerms: '100% advance before release',
              creditLimit: 150_000,
              brandIds: a.requestedBrandIds,
              contacts: [{ id: uid('ct'), ...a.contact, primary: true }],
              billingAddress: a.billingAddress,
              deliveryAddress: a.deliveryAddress,
              customerSince: nowIso(),
              accountManagerId: 'u-sc',
              tier: 'New',
            })
            a.documents.forEach((d) =>
              s.documents.unshift({ id: uid('doc'), name: d.name, type: d.type, linkedTo: { kind: 'customer', id: customerId }, customerId, uploadedAt: a.submittedAt, uploadedById: 'u-sc', sizeKb: d.sizeKb, status: 'Verified' }),
            )
            a.activity.push({ id: uid('act'), at: nowIso(), actorId: actor.id, action: `Application approved — customer account ${code} created (demo)`, comment, kind: 'approval' })
            s.integrationEvents.unshift({ id: uid('ie'), entity: 'Business Partner', direction: 'Outbound', objectRef: code, status: 'Pending', at: nowIso(), attempts: 0, message: 'Queued for business partner creation (simulated — no ERP connection).', payloadPreview: JSON.stringify({ customer: code, country: a.country, role: 'Sold-to' }, null, 2) })
            notify(s, { kind: 'customer', title: `${a.companyName} approved`, body: `Customer account ${code} is active (demo).`, link: `/app/customers/${customerId}`, audience: ['sales_coordinator', 'admin', 'territory_manager'] })
          } else if (decision === 'request_info') {
            a.status = 'Information Requested'
            a.pendingItems = items
            const cur = a.steps.findIndex((st) => st.status === 'current')
            if (cur >= 0) a.steps[cur] = { ...a.steps[cur]!, status: 'blocked', ...stamp, note: `Awaiting ${items.length} item(s) from applicant` }
            a.activity.push({ id: uid('act'), at: nowIso(), actorId: actor.id, action: 'Requested additional information', comment, kind: 'change' })
          } else {
            a.status = 'Rejected'
            a.rejectionReason = comment
            const cur = a.steps.findIndex((st) => st.status === 'current' || st.status === 'blocked')
            if (cur >= 0) a.steps[cur] = { ...a.steps[cur]!, status: 'blocked', ...stamp, note: 'Rejected' }
            a.activity.push({ id: uid('act'), at: nowIso(), actorId: actor.id, action: 'Application rejected', comment, kind: 'rejection' })
          }
        }),

      respondToInformationRequest: (id, files, comment) =>
        mutate((s) => {
          const a = s.applications.find((x) => x.id === id)
          if (!a) return
          a.documents.push(...files.map((f) => ({ ...f, type: 'Commercial Registration' as const })))
          a.pendingItems = []
          a.status = 'Under Review'
          const blocked = a.steps.findIndex((st) => st.status === 'blocked')
          if (blocked >= 0) a.steps[blocked] = { label: a.steps[blocked]!.label, status: 'current' }
          a.activity.push({ id: uid('act'), at: nowIso(), actorId: actorOf(s).id, action: `Applicant provided ${files.length} document(s)`, comment, kind: 'user' })
          notify(s, { kind: 'customer', title: `${a.ref}: information provided`, body: `${a.companyName} responded to your request.`, link: `/app/customers/applications/${a.id}`, audience: ['sales_coordinator'] })
        }),

      setCustomerStatus: (id, status, _comment) =>
        mutate((s) => {
          const c = s.customers.find((x) => x.id === id)
          if (c) c.status = status
        }),

      issueInvoice: (requestId) =>
        mutate((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          if (!r || r.status !== 'Approved') return
          const inv = buildInvoice(r, s.counters.invoice++, nowIso(), 'Issued')
          s.invoices.unshift(inv)
          r.invoiceId = inv.id
          r.status = 'Awaiting Payment'
          s.payments.unshift({ id: uid('pay'), ref: `PAY-${new Date().getFullYear()}-${String(s.counters.payment++).padStart(4, '0')}`, invoiceId: inv.id, customerId: r.customerId, amount: inv.total, currency: inv.currency, method: 'Bank Transfer', status: 'Awaiting Receipt' })
          s.documents.unshift({ id: uid('doc'), name: `${inv.number}.pdf`, type: 'Proforma Invoice', linkedTo: { kind: 'invoice', id: inv.id }, customerId: r.customerId, uploadedAt: nowIso(), uploadedById: actorOf(s).id, sizeKb: 148, status: 'Final' })
          log(r, actorOf(s).id, `Proforma invoice ${inv.number} issued (demo)`, 'finance')
          syncShipment(s, r.id, 'Awaiting Payment', actorOf(s).id)
          notify(s, { kind: 'finance', title: `Proforma invoice ${inv.number} issued`, body: `Please arrange payment for ${r.ref} and upload the receipt.`, link: `/app/invoices/${inv.id}`, audience: ['distributor', 'sales_coordinator'] })
        }),

      uploadReceipt: (invoiceId, file, meta) =>
        mutate((s) => {
          const inv = s.invoices.find((i) => i.id === invoiceId)
          const p = s.payments.find((x) => x.invoiceId === invoiceId)
          if (!inv || !p) return
          p.receiptFile = { ...file, uploadedAt: nowIso() }
          p.valueDate = meta.valueDate
          p.payerBank = meta.payerBank
          p.status = 'Receipt Uploaded'
          inv.status = 'Receipt Uploaded'
          s.documents.unshift({ id: uid('doc'), name: file.name, type: 'Payment Receipt', linkedTo: { kind: 'invoice', id: inv.id }, customerId: inv.customerId, uploadedAt: nowIso(), uploadedById: actorOf(s).id, sizeKb: file.sizeKb, status: 'Pending Review' })
          const r = s.requests.find((x) => x.id === inv.requestId)
          if (r) log(r, actorOf(s).id, 'Payment receipt uploaded', 'finance', file.name)
          notify(s, { kind: 'finance', title: 'Payment receipt uploaded', body: `Proof of payment received for ${inv.number}.`, link: '/app/payments', audience: ['finance'] })
        }),

      verifyPayment: (paymentId, decision, note) =>
        mutate((s) => {
          const p = s.payments.find((x) => x.id === paymentId)
          if (!p) return
          const inv = s.invoices.find((i) => i.id === p.invoiceId)!
          const r = s.requests.find((x) => x.id === inv.requestId)
          const actor = actorOf(s)
          p.note = note || undefined
          if (decision === 'verify') {
            p.status = 'Verified'
            p.verifiedById = actor.id
            p.verifiedAt = nowIso()
            inv.status = 'Payment Verified'
            s.documents.forEach((d) => d.type === 'Payment Receipt' && d.linkedTo.id === inv.id && (d.status = 'Verified'))
            if (r) {
              r.status = 'Payment Verified'
              log(r, actor.id, 'Payment verified (demo — no bank reconciliation performed)', 'finance', note)
              syncShipment(s, r.id, 'Payment Verified', actor.id)
            }
            notify(s, { kind: 'finance', title: `Payment verified for ${inv.number}`, body: 'Your order moves to warehouse preparation.', link: `/app/invoices/${inv.id}`, audience: ['distributor', 'sales_coordinator'] })
            notify(s, { kind: 'logistics', title: `Payment verified — prepare ${r?.ref ?? 'order'}`, body: 'Order can move to warehouse preparation.', link: r?.shipmentId ? `/app/shipments/${r.shipmentId}` : '/app/shipments', audience: ['logistics'] })
          } else {
            p.status = 'Rejected'
            inv.status = 'Issued'
            if (r) log(r, actor.id, 'Payment receipt rejected', 'finance', note)
            notify(s, { kind: 'finance', title: `Payment receipt rejected for ${inv.number}`, body: note || 'Please upload a valid transfer confirmation.', link: `/app/invoices/${inv.id}`, audience: ['distributor', 'sales_coordinator'] })
          }
        }),

      advanceShipment: (shipmentId, note) =>
        mutate((s) => {
          const shp = s.shipments.find((x) => x.id === shipmentId)
          if (!shp) return
          const idx = SHIPMENT_FLOW.indexOf(shp.status)
          if (idx < SHIPMENT_FLOW.indexOf('Payment Verified') || idx >= SHIPMENT_FLOW.length - 1) return
          const next = SHIPMENT_FLOW[idx + 1]!
          const actor = actorOf(s)
          shp.status = next
          shp.history.push({ status: next, at: nowIso(), byId: actor.id, note: note || undefined })
          const r = s.requests.find((x) => x.id === shp.requestId)!
          if (next === 'Ready for Warehouse Preparation') r.status = 'In Fulfillment'
          if (next === 'Documents in Progress') {
            for (const type of ['Packing List', 'Commercial Invoice', 'Certificate of Origin'] as const) {
              const id = uid('doc')
              s.documents.unshift({ id, name: `${type.replace(/ /g, '_')}_${shp.ref}.pdf`, type, linkedTo: { kind: 'shipment', id: shp.id }, customerId: shp.customerId, uploadedAt: nowIso(), uploadedById: actor.id, sizeKb: 240, status: 'Draft' })
              shp.documentIds.push(id)
            }
          }
          if (next === 'Ready for Collection') {
            r.status = 'Ready for Collection'
            shp.collectionRef = `COL-${7000 + s.counters.shipment++}`
            shp.collectionWindow = 'Sun–Thu, 08:00–15:00 (bring collection reference & ID)'
            s.documents.forEach((d) => shp.documentIds.includes(d.id) && (d.status = 'Final'))
            notify(s, { kind: 'logistics', title: `${r.ref} is ready for collection`, body: `Collection reference ${shp.collectionRef} at ${shp.warehouse}.`, link: `/app/shipments/${shp.id}`, audience: ['distributor', 'sales_coordinator'] })
          }
          if (next === 'Collected') {
            r.status = 'Collected'
            notify(s, { kind: 'logistics', title: `${r.ref} collected`, body: 'Goods released to the customer’s forwarder.', link: `/app/shipments/${shp.id}`, audience: ['distributor', 'sales_coordinator'] })
          }
          log(r, actor.id, `Shipment status → ${next} (demo)`, 'logistics', note)
        }),

      addDocument: (doc) =>
        mutate((s) => void s.documents.unshift({ ...doc, id: uid('doc'), uploadedAt: nowIso(), uploadedById: actorOf(s).id })),

      sendEmail: (input) => {
        const threadId = input.threadId ?? uid('em')
        mutate((s) => {
          const actor = actorOf(s)
          const msg: EmailMessage = {
            id: uid('m'),
            direction: actor.role === 'distributor' ? 'inbound' : 'outbound',
            from: { name: actor.name, email: actor.email },
            to: input.to,
            sentAt: nowIso(),
            body: input.body,
            attachments: input.attachments,
            simulated: true,
          }
          const t = s.threads.find((x) => x.id === threadId)
          if (t) {
            t.messages.push(msg)
          } else {
            s.threads.unshift({ id: threadId, subject: input.subject, customerId: input.customerId, requestId: input.requestId, messages: [msg], followUp: { status: 'None' }, unread: false, labels: ['Demo'] })
          }
        })
        return threadId
      },
      markThreadRead: (threadId, unread = false) =>
        mutate((s) => {
          const t = s.threads.find((x) => x.id === threadId)
          if (t) t.unread = unread
        }),
      setFollowUp: (threadId, status, dueAt, note) =>
        mutate((s) => {
          const t = s.threads.find((x) => x.id === threadId)
          if (t) t.followUp = { status, dueAt, note, ownerId: actorOf(s).id }
        }),
      linkThread: (threadId, customerId, requestId) =>
        mutate((s) => {
          const t = s.threads.find((x) => x.id === threadId)
          if (t) {
            t.customerId = customerId
            t.requestId = requestId
          }
        }),

      updatePromoRules: (rules) => mutate((s) => void (s.promoRules = rules)),
      updateApprovalRules: (rules) => mutate((s) => void (s.approvalRules = rules)),
      toggleNotificationPref: (id, channel) =>
        mutate((s) => {
          const p = s.notificationPrefs.find((x) => x.id === id)
          if (p) p[channel] = !p[channel]
        }),
      updateUser: (id, patch) =>
        mutate((s) => {
          const u = s.users.find((x) => x.id === id)
          if (u) Object.assign(u, patch)
        }),
      updateTerritory: (id, patch) =>
        mutate((s) => {
          const t = s.territories.find((x) => x.id === id)
          if (t) Object.assign(t, patch)
        }),
      setIntegrationEvent: (event) =>
        mutate((s) => {
          const i = s.integrationEvents.findIndex((x) => x.id === event.id)
          if (i >= 0) s.integrationEvents[i] = event
        }),
    }
  }, [state, user, mutate])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

// ─── Convenience lookup hook ──────────────────────────────────────────────

export function useLookups() {
  const { state } = useStore()
  return useMemo(() => {
    const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]))
    const customers = byId(state.customers)
    const products = byId(state.products)
    const users = byId(state.users)
    const territories = byId(state.territories)
    const brandMap = byId(brands)
    const regionMap = byId(regions)
    return {
      customer: (id?: string) => (id ? customers.get(id) : undefined),
      product: (id: string) => products.get(id),
      user: (id?: string) => (id ? users.get(id) : undefined),
      territory: (id?: string) => (id ? territories.get(id) : undefined),
      brand: (id: string) => brandMap.get(id),
      region: (id?: string) => (id ? regionMap.get(id) : undefined),
      request: (id?: string) => state.requests.find((r) => r.id === id),
      invoice: (id?: string) => state.invoices.find((r) => r.id === id),
      shipment: (id?: string) => state.shipments.find((r) => r.id === id),
    }
  }, [state])
}
