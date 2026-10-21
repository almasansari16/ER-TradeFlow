import { useState } from 'react'
import { Check, Minus, Pencil, Users } from 'lucide-react'
import { useLookups, useStore } from '@/app/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, DemoTag } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Dialog'
import { Avatar, EmptyState } from '@/components/ui/misc'
import { Checkbox, TextField, Toggle } from '@/components/forms/Field'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { FilterBar, FilterSelect, SearchInput } from '@/components/data-display/FilterBar'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { ROLES, roleLabel } from '@/config/navigation'
import { relative } from '@/utils/format'
import type { DemoUser, RoleId } from '@/types/domain'

const CAPABILITIES: [string, RoleId[]][] = [
  ['Browse catalogue & create requests', ['distributor', 'sales_coordinator', 'admin']],
  ['Review distributor applications', ['sales_coordinator', 'territory_manager', 'admin']],
  ['Approve — territory level', ['territory_manager']],
  ['Approve — regional level', ['regional_manager']],
  ['Approve — final (strategic orders)', ['general_manager']],
  ['Issue proforma & verify payments', ['finance']],
  ['Update shipment status', ['logistics', 'admin']],
  ['Configure workflow & territories', ['admin']],
  ['View integration monitor', ['admin', 'finance']],
]

export default function UsersPage() {
  const { state, updateUser } = useStore()
  const lookups = useLookups()
  const toast = useToast()
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [editing, setEditing] = useState<DemoUser | null>(null)
  const [draft, setDraft] = useState<Pick<DemoUser, 'title' | 'active' | 'territoryIds'>>({ title: '', active: true })

  const users = state.users.filter((u) => u.id !== 'u-system' && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())) && (!role || u.role === role))

  const scopeText = (u: DemoUser) =>
    u.role === 'territory_manager'
      ? u.territoryIds?.map((t) => lookups.territory(t)?.name).join(', ')
      : u.role === 'regional_manager'
        ? `${lookups.region(u.regionId)?.name} region`
        : u.role === 'distributor'
          ? lookups.customer(u.customerId)?.name
          : 'All territories'

  const columns: Column<DemoUser>[] = [
    {
      key: 'name', header: 'User', primary: true, sortValue: (u) => u.name,
      cell: (u) => (
        <span className="flex items-center gap-3">
          <Avatar name={u.name} size="sm" />
          <span className="min-w-0"><span className="block font-medium">{u.name}</span><span className="block truncate text-xs text-muted">{u.email}</span></span>
        </span>
      ),
    },
    { key: 'role', header: 'Role', sortValue: (u) => roleLabel(u.role), cell: (u) => <Badge tone={u.role === 'admin' ? 'dark' : u.role === 'distributor' ? 'info' : 'primary'}>{roleLabel(u.role)}</Badge> },
    { key: 'scope', header: 'Scope', hideOnMobile: true, cell: (u) => <span className="text-muted">{scopeText(u)}</span> },
    { key: 'last', header: 'Last active', sortValue: (u) => u.lastActiveAt, cell: (u) => relative(u.lastActiveAt) },
    { key: 'status', header: 'Status', sortValue: (u) => (u.active ? 1 : 0), cell: (u) => <Badge tone={u.active ? 'success' : 'neutral'} dot>{u.active ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'edit', header: '', align: 'right',
      cell: (u) => (
        <Button size="xs" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={(e) => { e.stopPropagation(); setEditing(u); setDraft({ title: u.title, active: u.active, territoryIds: u.territoryIds }) }}>Edit</Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Users and roles" description="Demo users that back the role switcher, their scope and role capabilities." breadcrumbs={[{ label: 'Administration' }, { label: 'User and Role Management' }]} meta={<DemoTag>No identity provider connected</DemoTag>} />
      <Card>
        <Tabs className="px-3" value={tab} onChange={setTab} items={[{ key: 'users', label: 'Users', count: users.length }, { key: 'roles', label: 'Role capabilities', count: ROLES.length }]} />
        {tab === 'users' ? (
          <>
            <FilterBar active={!!(q || role)} onReset={() => { setQ(''); setRole('') }}>
              <SearchInput value={q} onChange={setQ} placeholder="Name or email…" className="w-full sm:w-64" />
              <FilterSelect label="Role" value={role} onChange={setRole} options={ROLES.map((r) => ({ value: r.id, label: r.label }))} />
            </FilterBar>
            <DataTable rows={users} columns={columns} rowKey={(u) => u.id} initialSort={{ key: 'role', dir: 'asc' }} pageSize={20} empty={<EmptyState icon={<Users className="size-5" />} title="No users match" />} />
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-canvas/70">
                  <th className="sticky left-0 bg-canvas px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Capability</th>
                  {ROLES.map((r) => <th key={r.id} className="px-3 py-3 text-center text-[11px] font-semibold text-muted">{r.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map(([cap, roles]) => (
                  <tr key={cap} className="border-b border-line">
                    <td className="sticky left-0 bg-surface px-5 py-3 font-medium">{cap}</td>
                    {ROLES.map((r) => (
                      <td key={r.id} className="px-3 py-3 text-center">
                        {roles.includes(r.id) ? <Check className="mx-auto size-4 text-success" aria-label="Yes" /> : <Minus className="mx-auto size-4 text-line-strong" aria-label="No" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-5 py-3 text-xs text-muted">Illustrative capability matrix used by the prototype’s navigation and action gating. Not enforced security.</p>
          </div>
        )}
      </Card>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name ?? ''}
        description={editing ? `${roleLabel(editing.role)} · ${editing.email}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editing) return
                if (editing.role === 'territory_manager' && !draft.territoryIds?.length) return toast.error('Assign at least one territory')
                updateUser(editing.id, draft)
                toast.success('User updated', 'Saved in the prototype.')
                setEditing(null)
              }}
            >
              Save changes
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <TextField label="Job title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <div className="flex items-center justify-between rounded-xl border border-line p-4">
              <div><p className="text-[13px] font-medium">Active</p><p className="text-xs text-muted">Inactive users keep history but receive no tasks.</p></div>
              <Toggle label="Active" checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} />
            </div>
            {editing.role === 'territory_manager' && (
              <fieldset className="space-y-2.5">
                <legend className="label">Territory assignments</legend>
                {state.territories.map((t) => (
                  <Checkbox
                    key={t.id}
                    label={t.name}
                    description={`${lookups.region(t.regionId)?.name} · current manager: ${lookups.user(t.managerId)?.name}`}
                    checked={draft.territoryIds?.includes(t.id) ?? false}
                    onChange={() => setDraft({ ...draft, territoryIds: draft.territoryIds?.includes(t.id) ? draft.territoryIds.filter((x) => x !== t.id) : [...(draft.territoryIds ?? []), t.id] })}
                  />
                ))}
                <p className="text-xs text-muted">Controls which requests appear in this user’s workbench. Approver routing follows the territory’s manager (see Territories and Regions).</p>
              </fieldset>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}
