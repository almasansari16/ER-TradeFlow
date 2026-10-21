# TradeFlow — B2B Distribution & Sales Portal (frontend prototype)

> **From Customer Request to Fulfillment.**
> A React + TypeScript prototype for stakeholder demonstration. All data is mock data and every action is simulated in the browser. It does **not** create SAP customers, submit SAP sales orders, verify payments or send email.

## Setup and run

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # serve the production build
npm run lint       # oxlint
```

Open `/` for the public landing page, `/sign-in` to pick a demo role, or `/register` to submit a distributor application.

Demo state is mirrored to `localStorage` so a demo survives a refresh. Use **Profile menu › Reset demo data** to restore the seeded state.

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · React Router 7 · Lucide React · Recharts · React Hook Form + Zod (small local resolver in `components/forms/zodResolver.ts`). No backend, no Next.js.

## Project structure

```
src/
  app/            router.tsx (lazy routes + role gate), store.tsx (demo state + simulated workflow actions)
  config/         brand.ts (product name/tagline — change here), navigation.ts (roles, role-aware sidebar)
  components/
    layout/       AppShell, Sidebar, Topbar (search, role switcher, notifications, help, profile), PageHeader, Logo
    ui/           Button, Badge/StatusBadge/DemoTag, Card, Dialog/ConfirmDialog/Drawer, Toast, Tabs, Popover menu, misc
    data-display/ DataTable (sort, paging, mobile cards), StatCard, Timeline, ApprovalChain, ProductVisual, FilterBar…
    forms/        Field controls, FileDrop (local-only), zodResolver
  pages/          public · dashboard · workspace · customers · catalog · orders · approvals · finance · logistics · communications · administration
  data/           typed seed data (org, catalog, customers, transactions, communications, integration, config)
  services/       contracts.ts (service interfaces) + mock.ts (mock implementations) + index.ts (single switch point)
  hooks/          useScope (role data scope + task generation), misc hooks
  types/          domain.ts — the full typed domain model
  utils/          formatting, FX (illustrative), promo calculation, time helpers
  styles/         design tokens (Tailwind @theme)
```

## Demo roles

Switch with the purple **Demo role** control (top bar) or at `/sign-in`. This is not authentication.

| Role | Demo user | Sees |
|---|---|---|
| Distributor | Omar Haddad (Gulf Horizon Trading, UAE) | Own account only |
| Sales Coordinator | Priya Nair | All customers, applications, follow-ups |
| Territory Manager | Daniel Okafor | UAE & Oman, Qatar/Bahrain/Kuwait |
| Regional Manager | Layla Mansour | Middle East region |
| General Manager | Marcus Chen | All; final approver for strategic orders |
| Finance Officer | Aisha Siddiqui | Proformas, payments, integration monitor |
| Logistics Coordinator | Carlos Mendes | Shipments, collection, documents |
| Administrator | Elena Petrova | Everything incl. configuration |

## Implemented screens

Public: landing page · demo sign-in · distributor registration (5-step, validated) · public application status (`/status/:ref`).
Workspace: role-specific overview dashboards (distributor, coordinator, approvers, finance, logistics, admin) · My tasks · Notifications.
Sales: My application · Customers (accounts + registration applications) · Customer profile · Application review · Product catalog (grid/table, filters, cart) · Sales order request wizard (6 steps) · Requests list with tracking filters · Request detail (journey, lines, approval history, activity, documents) · Orders · Proforma invoices + document view · Payments with verification drawer.
Fulfillment: Shipment tracking · Shipment detail (7-step timeline, packing list, documents) · Collection readiness · Documents.
Communication: Email split view with compose/reply/link/follow-up · Follow-ups.
Administration: Approval workbench (queue, SLA, decisions) · Users & role capabilities · Territories & regions (manager + brand visibility) · Workflow rules (approval bands, tester/sample rules with calculator, notification preferences) · Integration monitor.

## Simulated features

- Registration submit → application with reference; coordinator verifies, requests info, approves (creates a customer account) or rejects; applicant responds with documents.
- Catalog → cart → wizard with live price/availability check through the mock service, case-pack and stock validation, draft saving, confirmation dialog and demo request reference.
- Approval routing by USD value band (default: <25k TM; 25–100k TM→RM; ≥100k TM→RM→GM), SLA indicators, approve / reject / request changes with comment, acting user and timestamp recorded; revise-and-resubmit.
- Finance issues proforma (creates invoice, payment record, document) → distributor uploads receipt (**Receipt Uploaded**) → finance completes a checklist and marks **Verified** (or rejects).
- Shipment flow: Approved → Awaiting Payment → Payment Verified → Ready for Warehouse Preparation → Documents in Progress → Ready for Collection (collection reference generated) → Collected. Logistics advances the warehouse steps; payment steps follow Finance.
- In-app notifications and tasks generated from workflow state; read/unread state.
- Email compose/reply adds messages to local state only (marked "Simulated — not sent").
- Integration monitor retries resolve via the mock service (timeouts recover, validation errors keep failing).
- Admin changes (approval bands, promo rules, territory managers, brand visibility, users) apply immediately to the prototype.

## Tester & sample calculation — assumptions (illustrative, to be confirmed)

Implemented in `src/utils/promo.ts`, configurable in Administration › Workflow Rules:

1. Eligible units = units in categories *Eau de Parfum, Extrait de Parfum, Eau de Toilette* (body mists, home fragrance and gift sets excluded).
2. Calculated on the whole request, rounding down: testers = ⌊eligible ÷ 6⌋; samples = ⌊eligible ÷ 12⌋ × 4 (1.2 ml each).
3. Testers and samples are free of charge and shown separately from priced lines.

## Known limitations

- No authentication or authorization; role gating is cosmetic.
- Prices, stock, FX rates, credit limits, bank details and ERP references are fictional. Brands and customers are invented.
- Uploaded files are never stored — only name and size; previews are placeholders. "Download PDF" is simulated (Print works).
- Single-browser state (localStorage); no multi-user concurrency.
- Charts labelled "Illustrative" use synthetic history.
- No i18n/RTL, no real email delivery, no tax logic.
- Fonts load from Google Fonts; system fonts are used offline.

## Future backend & SAP integration requirements

The UI talks to data through `src/services/contracts.ts`. Replace `mockServices` in `src/services/index.ts` with a real implementation backed by a separately developed BFF/integration layer. That layer would need to provide:

- **Identity & access:** SSO (e.g. SAP IAS / corporate IdP), roles and territory scopes enforced server-side.
- **Customer registration:** persist applications and documents (object storage with virus scanning), review workflow, Business Partner creation/maintenance in S/4HANA on approval.
- **Catalogue, pricing & availability:** product master, customer-specific pricing conditions and ATP/stock per plant.
- **Sales order requests:** persistence, approval workflow engine (value bands, SLAs, delegation/escalation), audit trail, and sales order creation in S/4HANA after final approval.
- **Tester/sample policy:** confirmed rules, possibly as free-goods condition records.
- **Finance:** proforma generation (document templates), bank-reconciliation-backed payment verification, billing document references.
- **Logistics:** outbound delivery, picking/packing, shipping documents and goods-issue status.
- **Communication:** mail integration (send/receive, threading), notification delivery (email/in-app).
- **Integration operations:** queueing, retries, error handling and monitoring (feeding the Integration Monitor screen).

All SAP API selection, endpoints and credentials are deliberately out of scope for this prototype.
