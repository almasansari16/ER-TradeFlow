import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BadgeCheck, Plus, Users } from 'lucide-react'
import { requestTotal, useLookups, useStore } from '@/app/store'
import { useScope } from '@/hooks/useScope'
import { useSimulatedLoading } from '@/hooks/misc'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { FilterBar, FilterSelect, SearchInput } from '@/components/data-display/FilterBar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Avatar, EmptyState, SkeletonRows } from '@/components/ui/misc'
import { ButtonLink } from '@/components/ui/Button'
import { brands } from '@/data/catalog'
import { toUsd } from '@/utils/fx'
import { date, money, relative } from '@/utils/format'
import type { Customer, RegistrationApplication } from '@/types/domain'

type TabKey = 'customers' | 'applications'

export default function CustomersPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabKey) ?? 'customers'
  const scope = useScope()
  const { user } = useStore()
  const loading = useSimulatedLoading(350, tab)
  const pendingApps = scope.applications.filter((a) => ['Submitted', 'Under Review', 'Information Requested'].includes(a.status)).length

  return (
    <>
      <PageHeader
        title="Customers"
        description="Distributor accounts, onboarding applications and territory assignments."
        breadcrumbs={[{ label: 'Sales' }, { label: 'Customers' }]}
        actions={user.role === 'sales_coordinator' || user.role === 'admin' ? <ButtonLink to="/register" variant="secondary" icon={<Plus className="size-4" />}>New registration</ButtonLink> : undefined}
      />
      <Card>
        <Tabs
          className="px-3"
          value={tab}
          onChange={(k) => setParams(k === 'customers' ? {} : { tab: k })}
          items={[
            { key: 'customers', label: 'Customer accounts', count: scope.customers.length },
            { key: 'applications', label: 'Registration applications', count: pendingApps },
          ]}
        />
        {loading ? <SkeletonRows rows={7} /> : tab === 'customers' ? <CustomerTable /> : <ApplicationTable apps={scope.applications} />}
      </Card>
    </>
  )
}

function CustomerTable() {
  const scope = useScope()
  const { state } = useStore()
  const lookups = useLookups()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [territory, setTerritory] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(
    () =>
      scope.customers.filter(
        (c) =>
          (!q || `${c.name} ${c.code} ${c.city} ${c.country}`.toLowerCase().includes(q.toLowerCase())) &&
          (!territory || c.territoryId === territory) &&
          (!status || c.status === status),
      ),
    [scope.customers, q, territory, status],
  )

  const stats = (c: Customer) => {
    const reqs = state.requests.filter((r) => r.customerId === c.id)
    return {
      open: reqs.filter((r) => ['In Approval', 'Changes Requested', 'Approved', 'Awaiting Payment', 'Payment Verified', 'In Fulfillment', 'Ready for Collection'].includes(r.status)).length,
      value: reqs.filter((r) => !['Draft', 'Rejected', 'Cancelled'].includes(r.status)).reduce((s, r) => s + toUsd(requestTotal(r), r.currency), 0),
    }
  }

  const columns: Column<Customer>[] = [
    {
      key: 'name', header: 'Customer', primary: true, sortValue: (c) => c.name,
      cell: (c) => (
        <span className="flex items-center gap-3">
          <Avatar name={c.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{c.name}</span>
            <span className="block text-xs text-muted">{c.code}</span>
          </span>
        </span>
      ),
    },
    { key: 'territory', header: 'Territory', sortValue: (c) => lookups.territory(c.territoryId)?.name ?? '', cell: (c) => lookups.territory(c.territoryId)?.name },
    { key: 'location', header: 'Location', hideOnMobile: true, cell: (c) => <span className="text-muted">{c.city}, {c.country}</span> },
    { key: 'tier', header: 'Tier', sortValue: (c) => c.tier, cell: (c) => <Badge tone={c.tier === 'Platinum' ? 'dark' : c.tier === 'Gold' ? 'warning' : c.tier === 'New' ? 'primary' : 'neutral'}>{c.tier}</Badge> },
    { key: 'open', header: 'Open requests', align: 'right', sortValue: (c) => stats(c).open, cell: (c) => <span className="tabular">{stats(c).open}</span> },
    { key: 'value', header: 'Order value (USD)', align: 'right', sortValue: (c) => stats(c).value, cell: (c) => <span className="font-medium tabular">{money(stats(c).value, 'USD', { compact: true })}</span> },
    { key: 'status', header: 'Status', sortValue: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
  ]

  return (
    <>
      <FilterBar active={!!(q || territory || status)} onReset={() => { setQ(''); setTerritory(''); setStatus('') }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, code, city…" className="w-full sm:w-72" />
        <FilterSelect label="Territory" value={territory} onChange={setTerritory} options={state.territories.filter((t) => scope.customers.some((c) => c.territoryId === t.id)).map((t) => ({ value: t.id, label: t.name }))} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={['Active', 'Pending Review', 'On Hold', 'Blocked'].map((s) => ({ value: s, label: s }))} />
      </FilterBar>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/app/customers/${c.id}`)}
        initialSort={{ key: 'value', dir: 'desc' }}
        caption="Customer accounts"
        empty={<EmptyState icon={<Users className="size-5" />} title="No customers match" description="Try a different search or clear the filters." />}
      />
    </>
  )
}

function ApplicationTable({ apps }: { apps: RegistrationApplication[] }) {
  const lookups = useLookups()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const rows = apps.filter((a) => !status || a.status === status)
  const columns: Column<RegistrationApplication>[] = [
    {
      key: 'company', header: 'Applicant', primary: true, sortValue: (a) => a.companyName,
      cell: (a) => (
        <span className="min-w-0">
          <span className="block font-medium">{a.companyName}</span>
          <span className="block font-mono text-xs text-muted">{a.ref}</span>
        </span>
      ),
    },
    { key: 'loc', header: 'Country', sortValue: (a) => a.country, cell: (a) => <span>{a.city}, {a.country}</span> },
    { key: 'territory', header: 'Territory', hideOnMobile: true, cell: (a) => lookups.territory(a.territoryId)?.name },
    { key: 'brands', header: 'Brands', hideOnMobile: true, cell: (a) => <span className="text-muted">{a.requestedBrandIds.map((id) => brands.find((b) => b.id === id)?.name).join(', ')}</span> },
    { key: 'submitted', header: 'Submitted', sortValue: (a) => a.submittedAt, cell: (a) => <span title={date(a.submittedAt)}>{relative(a.submittedAt)}</span> },
    { key: 'status', header: 'Status', sortValue: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
  ]
  return (
    <>
      <FilterBar active={!!status} onReset={() => setStatus('')}>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={['Submitted', 'Under Review', 'Information Requested', 'Approved', 'Rejected'].map((s) => ({ value: s, label: s }))} />
      </FilterBar>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        onRowClick={(a) => navigate(`/app/customers/applications/${a.id}`)}
        initialSort={{ key: 'submitted', dir: 'desc' }}
        empty={<EmptyState icon={<BadgeCheck className="size-5" />} title="No applications" description="New distributor registrations will appear here." />}
      />
    </>
  )
}
