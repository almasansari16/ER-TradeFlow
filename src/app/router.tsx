import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ALL_NAV_ITEMS, roleLabel } from '@/config/navigation'
import { useStore } from './store'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { RoleSwitcher } from '@/components/layout/Topbar'

const page = (loader: () => Promise<{ default: ComponentType }>) => {
  const C = lazy(loader)
  return <C />
}

function PageFallback() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-80" />
    </div>
  )
}

/** Hides a page from roles that do not have it in their navigation (demo-level gating only). */
function RoleGate({ navKey, children }: { navKey: string; children: ReactNode }) {
  const { state } = useStore()
  const item = ALL_NAV_ITEMS.find((i) => i.key === navKey)
  const allowed = !item || item.roles === 'all' || item.roles.includes(state.role)
  if (allowed) return <>{children}</>
  return (
    <div className="card">
      <EmptyState
        icon={<ShieldOff className="size-5" />}
        title={`Not part of the ${roleLabel(state.role)} experience`}
        description={`“${item.label}” is shown to other roles in this prototype. Switch the demo role to preview it.`}
        action={<RoleSwitcher compact />}
      />
    </div>
  )
}

const gated = (navKey: string, el: ReactNode) => (
  <RoleGate navKey={navKey}>
    <Suspense fallback={<PageFallback />}>{el}</Suspense>
  </RoleGate>
)

const open = (el: ReactNode) => <Suspense fallback={<div className="p-10"><PageFallback /></div>}>{el}</Suspense>

export const router = createBrowserRouter([
  { path: '/', element: open(page(() => import('@/pages/public/LandingPage'))) },
  { path: '/sign-in', element: open(page(() => import('@/pages/public/SignInPage'))) },
  { path: '/register', element: open(page(() => import('@/pages/public/RegisterPage'))) },
  { path: '/status/:ref', element: open(page(() => import('@/pages/public/PublicStatusPage'))) },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      { index: true, element: gated('overview', page(() => import('@/pages/dashboard/OverviewPage'))) },
      { path: 'tasks', element: gated('tasks', page(() => import('@/pages/workspace/TasksPage'))) },
      { path: 'notifications', element: gated('notifications', page(() => import('@/pages/workspace/NotificationsPage'))) },
      { path: 'my-application', element: gated('application', page(() => import('@/pages/customers/MyApplicationPage'))) },
      { path: 'customers', element: gated('customers', page(() => import('@/pages/customers/CustomersPage'))) },
      { path: 'customers/applications/:id', element: gated('customers', page(() => import('@/pages/customers/ApplicationReviewPage'))) },
      { path: 'customers/:id', element: gated('customers', page(() => import('@/pages/customers/CustomerDetailPage'))) },
      { path: 'catalog', element: gated('catalog', page(() => import('@/pages/catalog/CatalogPage'))) },
      { path: 'requests', element: gated('requests', page(() => import('@/pages/orders/RequestsPage'))) },
      { path: 'requests/new', element: gated('requests', page(() => import('@/pages/orders/RequestWizardPage'))) },
      { path: 'requests/:id', element: gated('orders', page(() => import('@/pages/orders/RequestDetailPage'))) },
      { path: 'orders', element: gated('orders', page(() => import('@/pages/orders/OrdersPage'))) },
      { path: 'approvals', element: gated('approvals', page(() => import('@/pages/approvals/ApprovalWorkbenchPage'))) },
      { path: 'approvals/:id', element: gated('approvals', page(() => import('@/pages/orders/RequestDetailPage'))) },
      { path: 'invoices', element: gated('invoices', page(() => import('@/pages/finance/InvoicesPage'))) },
      { path: 'invoices/:id', element: gated('invoices', page(() => import('@/pages/finance/InvoiceDetailPage'))) },
      { path: 'payments', element: gated('payments', page(() => import('@/pages/finance/PaymentsPage'))) },
      { path: 'shipments', element: gated('shipments', page(() => import('@/pages/logistics/ShipmentsPage'))) },
      { path: 'shipments/:id', element: gated('shipments', page(() => import('@/pages/logistics/ShipmentDetailPage'))) },
      { path: 'collection', element: gated('collection', page(() => import('@/pages/logistics/CollectionPage'))) },
      { path: 'documents', element: gated('documents', page(() => import('@/pages/logistics/DocumentsPage'))) },
      { path: 'email', element: gated('email', page(() => import('@/pages/communications/EmailPage'))) },
      { path: 'follow-ups', element: gated('followups', page(() => import('@/pages/communications/FollowUpsPage'))) },
      { path: 'admin/users', element: gated('users', page(() => import('@/pages/administration/UsersPage'))) },
      { path: 'admin/territories', element: gated('territories', page(() => import('@/pages/administration/TerritoriesPage'))) },
      { path: 'admin/workflow', element: gated('workflow', page(() => import('@/pages/administration/WorkflowRulesPage'))) },
      { path: 'admin/integration', element: gated('integration', page(() => import('@/pages/administration/IntegrationMonitorPage'))) },
      { path: '*', element: open(page(() => import('@/pages/NotFoundPage'))) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
