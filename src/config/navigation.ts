import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BadgeCheck,
  Bell,
  BookOpen,
  Boxes,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  Mail,
  MapPinned,
  PackageCheck,
  Receipt,
  ShoppingCart,
  Truck,
  Users,
  UserCog,
} from 'lucide-react'
import type { RoleDefinition, RoleId } from '@/types/domain'

export const ROLES: RoleDefinition[] = [
  { id: 'distributor', label: 'Distributor', description: 'Orders, invoices and shipments for one customer account' },
  { id: 'sales_coordinator', label: 'Sales Coordinator', description: 'Creates requests, reviews customers, coordinates follow-ups' },
  { id: 'territory_manager', label: 'Territory Manager', description: 'First-level approver for assigned territories', approvalStage: 'Territory Manager' },
  { id: 'regional_manager', label: 'Regional Manager', description: 'Second-level approver for a region', approvalStage: 'Regional Manager' },
  { id: 'general_manager', label: 'General Manager', description: 'Final approver for high-value requests', approvalStage: 'General Manager' },
  { id: 'finance', label: 'Finance Officer', description: 'Proforma invoices and payment verification' },
  { id: 'logistics', label: 'Logistics Coordinator', description: 'Warehouse preparation, documents and collection' },
  { id: 'admin', label: 'Administrator', description: 'Users, territories, workflow rules and integrations' },
]

export const roleLabel = (id: RoleId) => ROLES.find((r) => r.id === id)?.label ?? id

export interface NavItem {
  key: string
  label: string
  to: string
  icon: LucideIcon
  roles: RoleId[] | 'all'
  /** Optional key used by the shell to render a count badge. */
  badge?: 'tasks' | 'notifications' | 'approvals' | 'email'
}

export interface NavSection {
  title: string
  items: NavItem[]
}

const INTERNAL: RoleId[] = [
  'sales_coordinator',
  'territory_manager',
  'regional_manager',
  'general_manager',
  'finance',
  'logistics',
  'admin',
]
const SALES_SIDE: RoleId[] = ['sales_coordinator', 'territory_manager', 'regional_manager', 'general_manager', 'admin']
const APPROVERS: RoleId[] = ['territory_manager', 'regional_manager', 'general_manager', 'sales_coordinator', 'admin']

export const NAVIGATION: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { key: 'overview', label: 'Overview', to: '/app', icon: LayoutDashboard, roles: 'all' },
      { key: 'tasks', label: 'My Tasks', to: '/app/tasks', icon: CheckSquare, roles: 'all', badge: 'tasks' },
      { key: 'notifications', label: 'Notifications', to: '/app/notifications', icon: Bell, roles: 'all', badge: 'notifications' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { key: 'application', label: 'My Application', to: '/app/my-application', icon: BadgeCheck, roles: ['distributor'] },
      { key: 'customers', label: 'Customers', to: '/app/customers', icon: Users, roles: [...SALES_SIDE, 'finance'] },
      { key: 'catalog', label: 'Product Catalog', to: '/app/catalog', icon: BookOpen, roles: ['distributor', ...SALES_SIDE] },
      { key: 'requests', label: 'Sales Order Requests', to: '/app/requests', icon: ClipboardList, roles: ['distributor', ...SALES_SIDE] },
      { key: 'orders', label: 'Orders', to: '/app/orders', icon: ShoppingCart, roles: 'all' },
      { key: 'invoices', label: 'Proforma Invoices', to: '/app/invoices', icon: Receipt, roles: ['distributor', 'sales_coordinator', 'finance', 'general_manager', 'regional_manager', 'admin'] },
      { key: 'payments', label: 'Payments', to: '/app/payments', icon: CreditCard, roles: ['distributor', 'sales_coordinator', 'finance', 'admin'] },
    ],
  },
  {
    title: 'Fulfillment',
    items: [
      { key: 'shipments', label: 'Shipment Tracking', to: '/app/shipments', icon: Truck, roles: 'all' },
      { key: 'collection', label: 'Collection Readiness', to: '/app/collection', icon: PackageCheck, roles: ['distributor', 'sales_coordinator', 'logistics', 'admin'] },
      { key: 'documents', label: 'Documents', to: '/app/documents', icon: FolderOpen, roles: 'all' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { key: 'email', label: 'Email Conversations', to: '/app/email', icon: Mail, roles: 'all', badge: 'email' },
      { key: 'followups', label: 'Follow-ups', to: '/app/follow-ups', icon: CalendarClock, roles: INTERNAL },
    ],
  },
  {
    title: 'Administration',
    items: [
      { key: 'approvals', label: 'Approval Workbench', to: '/app/approvals', icon: GitBranch, roles: APPROVERS, badge: 'approvals' },
      { key: 'users', label: 'User and Role Management', to: '/app/admin/users', icon: UserCog, roles: ['admin'] },
      { key: 'territories', label: 'Territories and Regions', to: '/app/admin/territories', icon: MapPinned, roles: ['admin', 'general_manager'] },
      { key: 'workflow', label: 'Workflow Rules', to: '/app/admin/workflow', icon: Boxes, roles: ['admin'] },
      { key: 'integration', label: 'Integration Monitor', to: '/app/admin/integration', icon: Activity, roles: ['admin', 'finance'] },
    ],
  },
]

export function navigationFor(role: RoleId): NavSection[] {
  return NAVIGATION.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.roles === 'all' || i.roles.includes(role)),
  })).filter((s) => s.items.length > 0)
}

/** Flattened lookup used for breadcrumbs and access checks. */
export const ALL_NAV_ITEMS = NAVIGATION.flatMap((s) => s.items)

