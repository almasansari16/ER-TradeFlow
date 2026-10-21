import { useMemo } from 'react'
import { canActOn, customerScope, useStore } from '@/app/store'
import type { DemoState } from '@/app/store'
import type { DemoUser } from '@/types/domain'
import { hoursBetween } from '@/utils/format'

/** Data the current demo role is allowed to see. */
export function useScope() {
  const { state, user } = useStore()
  return useMemo(() => scopeFor(state, user), [state, user])
}

export function scopeFor(state: DemoState, user: DemoUser) {
  const ids = customerScope(state, user)
  const inScope = <T extends { customerId: string }>(xs: T[]) => xs.filter((x) => ids.has(x.customerId))
  const isDistributor = user.role === 'distributor'
  return {
    customerIds: ids,
    customers: state.customers.filter((c) => ids.has(c.id)),
    requests: inScope(state.requests).filter((r) => !isDistributor || r.status !== 'Draft' || r.createdById === user.id),
    invoices: inScope(state.invoices),
    payments: inScope(state.payments),
    shipments: inScope(state.shipments),
    threads: inScope(state.threads),
    documents: state.documents.filter((d) => !d.customerId || ids.has(d.customerId)),
    notifications: state.notifications.filter((n) => n.audience.includes(user.role)),
    applications: isDistributor
      ? state.applications.filter((a) => a.customerId === user.customerId || a.contact.email === user.email)
      : state.applications.filter((a) => user.role !== 'territory_manager' || (user.territoryIds ?? []).includes(a.territoryId)),
    approvalQueue: state.requests.filter((r) => canActOn(state, user, r)),
  }
}

export interface Task {
  id: string
  title: string
  description: string
  link: string
  priority: 'high' | 'medium' | 'low'
  category: 'Approval' | 'Order' | 'Finance' | 'Logistics' | 'Customer' | 'Follow-up' | 'System'
  dueAt?: string
}

export function useTasks(): Task[] {
  const { state, user } = useStore()
  const scope = useScope()
  return useMemo(() => {
    const tasks: Task[] = []
    const cname = (id: string) => state.customers.find((c) => c.id === id)?.name ?? ''
    const role = user.role

    if (['territory_manager', 'regional_manager', 'general_manager'].includes(role)) {
      for (const r of scope.approvalQueue) {
        const step = r.approvalSteps.find((s) => s.status === 'Pending')!
        const waited = step.enteredAt ? hoursBetween(step.enteredAt) : 0
        tasks.push({
          id: `t-ap-${r.id}`,
          title: `Review ${r.ref}`,
          description: `${cname(r.customerId)} · ${step.stage} approval`,
          link: `/app/approvals/${r.id}`,
          priority: waited > step.slaHours ? 'high' : waited > step.slaHours * 0.6 ? 'medium' : 'low',
          category: 'Approval',
          dueAt: step.enteredAt ? new Date(new Date(step.enteredAt).getTime() + step.slaHours * 3_600_000).toISOString() : undefined,
        })
      }
    }

    if (role === 'distributor' || role === 'sales_coordinator') {
      for (const r of scope.requests) {
        if (r.status === 'Changes Requested')
          tasks.push({ id: `t-cr-${r.id}`, title: `Revise ${r.ref}`, description: r.approvalSteps.find((s) => s.status === 'Changes Requested')?.comment ?? 'Changes requested by approver', link: `/app/requests/${r.id}`, priority: 'high', category: 'Order' })
        if (r.status === 'Draft' && r.createdById === user.id)
          tasks.push({ id: `t-dr-${r.id}`, title: `Complete draft ${r.ref}`, description: `${cname(r.customerId)} · ${r.lines.length} line(s)`, link: `/app/requests/new?from=${r.id}`, priority: 'low', category: 'Order' })
      }
    }

    if (role === 'distributor') {
      for (const inv of scope.invoices) {
        const pay = state.payments.find((p) => p.invoiceId === inv.id)
        if (inv.status === 'Issued' || pay?.status === 'Rejected')
          tasks.push({ id: `t-pay-${inv.id}`, title: `Pay ${inv.number} and upload receipt`, description: pay?.status === 'Rejected' ? `Receipt rejected: ${pay.note ?? ''}` : 'Proforma invoice awaiting payment', link: `/app/invoices/${inv.id}`, priority: 'high', category: 'Finance', dueAt: inv.dueAt })
      }
      for (const s of scope.shipments)
        if (s.status === 'Ready for Collection')
          tasks.push({ id: `t-col-${s.id}`, title: `Arrange collection for ${s.ref}`, description: `Reference ${s.collectionRef} · ${s.warehouse}`, link: `/app/shipments/${s.id}`, priority: 'medium', category: 'Logistics' })
      for (const a of scope.applications)
        if (a.status === 'Information Requested')
          tasks.push({ id: `t-app-${a.id}`, title: `Provide information for ${a.ref}`, description: a.pendingItems.join('; '), link: '/app/my-application', priority: 'high', category: 'Customer' })
    }

    if (role === 'sales_coordinator' || role === 'admin') {
      for (const a of state.applications)
        if (a.status === 'Submitted' || a.status === 'Under Review')
          tasks.push({ id: `t-rev-${a.id}`, title: `Review application ${a.ref}`, description: `${a.companyName} · ${a.country}`, link: `/app/customers/applications/${a.id}`, priority: a.status === 'Submitted' ? 'medium' : 'low', category: 'Customer' })
    }

    if (role === 'sales_coordinator') {
      for (const t of scope.threads)
        if (t.followUp.status === 'Overdue' || t.followUp.status === 'Due Today')
          tasks.push({ id: `t-fu-${t.id}`, title: `Follow up: ${t.subject}`, description: t.followUp.note ?? cname(t.customerId), link: `/app/email?thread=${t.id}`, priority: t.followUp.status === 'Overdue' ? 'high' : 'medium', category: 'Follow-up', dueAt: t.followUp.dueAt })
    }

    if (role === 'finance') {
      for (const r of state.requests)
        if (r.status === 'Approved' && !r.invoiceId)
          tasks.push({ id: `t-pi-${r.id}`, title: `Issue proforma for ${r.ref}`, description: cname(r.customerId), link: `/app/requests/${r.id}`, priority: 'high', category: 'Finance' })
      for (const p of state.payments)
        if (p.status === 'Receipt Uploaded' || p.status === 'Under Verification')
          tasks.push({ id: `t-vp-${p.id}`, title: `Verify payment ${p.ref}`, description: `${cname(p.customerId)} · receipt uploaded`, link: `/app/payments?verify=${p.id}`, priority: 'high', category: 'Finance' })
    }

    if (role === 'logistics') {
      for (const s of state.shipments) {
        if (['Payment Verified', 'Ready for Warehouse Preparation', 'Documents in Progress'].includes(s.status))
          tasks.push({ id: `t-sh-${s.id}`, title: `Advance ${s.ref}`, description: `${cname(s.customerId)} · currently ${s.status}`, link: `/app/shipments/${s.id}`, priority: s.status === 'Payment Verified' ? 'high' : 'medium', category: 'Logistics' })
        if (s.status === 'Ready for Collection')
          tasks.push({ id: `t-cc-${s.id}`, title: `Confirm collection of ${s.ref}`, description: `${cname(s.customerId)} · ${s.collectionRef}`, link: `/app/shipments/${s.id}`, priority: 'low', category: 'Logistics' })
      }
    }

    if (role === 'admin' || role === 'finance') {
      for (const e of state.integrationEvents)
        if (e.status === 'Failed')
          tasks.push({ id: `t-ie-${e.id}`, title: `Resolve sync failure: ${e.objectRef}`, description: e.message, link: `/app/admin/integration?event=${e.id}`, priority: 'medium', category: 'System' })
    }

    const order = { high: 0, medium: 1, low: 2 }
    return tasks.sort((a, b) => order[a.priority] - order[b.priority])
  }, [state, user, scope])
}
