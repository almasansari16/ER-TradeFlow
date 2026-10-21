import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  FlaskConical,
  HelpCircle,
  Keyboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  Receipt,
  RotateCcw,
  Search,
  Truck,
  Users,
} from 'lucide-react'
import { ROLES, roleLabel } from '@/config/navigation'
import { BRAND } from '@/config/brand'
import { useLookups, useStore } from '@/app/store'
import { useScope } from '@/hooks/useScope'
import { Popover, MenuItem, MenuDivider } from '@/components/ui/Menu'
import { Avatar } from '@/components/ui/misc'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/utils/cn'
import { relative } from '@/utils/format'
import type { RoleId } from '@/types/domain'

function GlobalSearch() {
  const { state } = useStore()
  const scope = useScope()
  const lookups = useLookups()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 2) return []
    const hit = (s: string) => s.toLowerCase().includes(term)
    const out: { key: string; icon: ReactNode; title: string; sub: string; to: string }[] = []
    scope.requests.filter((r) => hit(`${r.ref} ${r.customerPo ?? ''} ${lookups.customer(r.customerId)?.name}`)).slice(0, 4).forEach((r) =>
      out.push({ key: r.id, icon: <ClipboardList className="size-4" />, title: r.ref, sub: `${lookups.customer(r.customerId)?.name} · ${r.status}`, to: `/app/requests/${r.id}` }),
    )
    if (state.role !== 'distributor')
      scope.customers.filter((c) => hit(`${c.name} ${c.code} ${c.city}`)).slice(0, 3).forEach((c) =>
        out.push({ key: c.id, icon: <Users className="size-4" />, title: c.name, sub: `${c.code} · ${c.city}`, to: `/app/customers/${c.id}` }),
      )
    state.products.filter((p) => hit(`${p.name} ${p.sku}`)).slice(0, 3).forEach((p) =>
      out.push({ key: p.id, icon: <Package className="size-4" />, title: p.name, sub: `${p.sku} · ${lookups.brand(p.brandId)?.name}`, to: `/app/catalog?q=${encodeURIComponent(p.sku)}` }),
    )
    scope.invoices.filter((i) => hit(i.number)).slice(0, 2).forEach((i) =>
      out.push({ key: i.id, icon: <Receipt className="size-4" />, title: i.number, sub: `Proforma · ${i.status}`, to: `/app/invoices/${i.id}` }),
    )
    scope.shipments.filter((s) => hit(`${s.ref} ${s.collectionRef ?? ''}`)).slice(0, 2).forEach((s) =>
      out.push({ key: s.id, icon: <Truck className="size-4" />, title: s.ref, sub: `Shipment · ${s.status}`, to: `/app/shipments/${s.id}` }),
    )
    return out
  }, [q, scope, state.products, state.role, lookups])

  const go = (to: string) => {
    navigate(to)
    setOpen(false)
    setQ('')
  }

  return (
    <div ref={root} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        ref={input}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && results[active]) go(results[active]!.to)
          else if (e.key === 'Escape') {
            setOpen(false)
            input.current?.blur()
          }
        }}
        placeholder="Search requests, customers, SKUs…"
        aria-label="Global search"
        role="combobox"
        aria-expanded={open && q.length >= 2}
        aria-controls="global-search-results"
        className="h-9 w-full rounded-lg border border-line bg-canvas pl-9 pr-10 text-[13px] placeholder:text-muted/80 focus:border-primary focus:bg-surface focus:outline-none focus:ring-3 focus:ring-primary/15"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 font-mono text-[10px] text-muted sm:block">/</kbd>
      {open && q.trim().length >= 2 && (
        <div id="global-search-results" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 animate-slide-up overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-pop)]">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted">No matches for “{q}”.</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.key}
                role="option"
                aria-selected={i === active}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.to)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', i === active && 'bg-primary-50')}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted ring-1 ring-line">{r.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-muted">{r.sub}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const { state, setRole } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  return (
    <Popover
      align="right"
      className="w-80"
      trigger={(p) => (
        <button
          type="button"
          onClick={p.toggle}
          aria-expanded={p['aria-expanded']}
          aria-haspopup="menu"
          className="flex h-9 items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary-50/70 px-2.5 text-[13px] font-medium text-primary-700 hover:bg-primary-50"
        >
          <FlaskConical className="size-4" />
          {!compact && <span className="hidden text-primary-700/70 xl:inline">Demo role:</span>}
          <span className="max-w-32 truncate">{roleLabel(state.role)}</span>
          <ChevronDown className="size-3.5" />
        </button>
      )}
    >
      {(close) => (
        <div role="menu">
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="text-xs font-semibold text-ink">Preview as role</p>
            <p className="text-[11px] text-muted">Demo switcher — not real authentication or authorization.</p>
          </div>
          <MenuDivider />
          {ROLES.map((r) => (
            <MenuItem
              key={r.id}
              active={r.id === state.role}
              description={r.description}
              icon={r.id === state.role ? <Check className="size-4 text-primary" /> : <span className="block size-4" />}
              onClick={() => {
                setRole(r.id as RoleId)
                close()
                navigate('/app')
                toast.info(`Now previewing as ${r.label}`)
              }}
            >
              {r.label}
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  )
}

function NotificationsMenu() {
  const scope = useScope()
  const { markNotificationRead, markAllNotificationsRead } = useStore()
  const navigate = useNavigate()
  const unread = scope.notifications.filter((n) => !n.read).length
  const recent = [...scope.notifications].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)
  return (
    <Popover
      className="w-[min(92vw,380px)] p-0"
      trigger={(p) => (
        <button type="button" onClick={p.toggle} aria-expanded={p['aria-expanded']} aria-label={`Notifications (${unread} unread)`} className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink">
          <Bell className="size-[18px]" />
          {unread > 0 && <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-surface">{unread}</span>}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button type="button" disabled={unread === 0} onClick={markAllNotificationsRead} className="text-xs font-medium text-primary hover:underline disabled:text-muted disabled:no-underline">
              Mark all as read
            </button>
          </div>
          <ul className="scroll-thin max-h-96 overflow-y-auto">
            {recent.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-muted">You’re all caught up.</li>}
            {recent.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    markNotificationRead(n.id)
                    close()
                    if (n.link) navigate(n.link)
                  }}
                  className={cn('flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-canvas', !n.read && 'bg-primary-50/40')}
                >
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">{n.title}</span>
                    <span className="mt-0.5 block text-xs text-muted line-clamp-2">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-muted">{relative(n.at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-1.5">
            <button type="button" onClick={() => { close(); navigate('/app/notifications') }} className="w-full rounded-lg py-2 text-center text-[13px] font-medium text-primary hover:bg-primary-50">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </Popover>
  )
}

function HelpMenu() {
  const toast = useToast()
  const [dialog, setDialog] = useState<'tour' | 'keys' | null>(null)
  return (
    <>
      <Popover
        className="w-64"
        trigger={(p) => (
          <button type="button" onClick={p.toggle} aria-expanded={p['aria-expanded']} aria-label="Help and support" className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink">
            <HelpCircle className="size-[18px]" />
          </button>
        )}
      >
        {(close) => (
          <div role="menu">
            <MenuItem icon={<BookOpen className="size-4" />} description="Suggested end-to-end walkthrough" onClick={() => { close(); setDialog('tour') }}>Demo guide</MenuItem>
            <MenuItem icon={<Keyboard className="size-4" />} onClick={() => { close(); setDialog('keys') }}>Keyboard shortcuts</MenuItem>
            <MenuDivider />
            <MenuItem
              icon={<Copy className="size-4" />}
              description={BRAND.supportEmail}
              onClick={() => {
                close()
                navigator.clipboard?.writeText(BRAND.supportEmail).catch(() => undefined)
                toast.info('Support address copied', 'Placeholder address for the prototype.')
              }}
            >
              Copy support email
            </MenuItem>
          </div>
        )}
      </Popover>
      <Dialog open={dialog === 'tour'} onClose={() => setDialog(null)} title="Demo guide" description="A suggested path through the prototype. Switch roles from the purple “Demo role” control.">
        <ol className="space-y-3 text-[13px]">
          {[
            ['Public site', 'Start at the landing page and submit a distributor registration.'],
            ['Sales Coordinator', 'Customers › Applications — verify documents and approve the new distributor.'],
            ['Distributor', 'Browse the Product Catalog, add items and create a Sales Order Request. Watch the tester/sample calculation.'],
            ['Territory / Regional / General Manager', 'Approval Workbench — approve, reject or request changes. Value bands decide how many levels apply.'],
            ['Finance Officer', 'Issue the proforma invoice from the approved request, then verify the payment receipt.'],
            ['Distributor', 'Open the proforma invoice and upload a payment receipt (local file only).'],
            ['Logistics Coordinator', 'Advance the shipment to Ready for Collection and Collected.'],
            ['Administrator', 'Tune approval bands, tester/sample rules and inspect the simulated integration monitor.'],
          ].map(([who, what], i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary">{i + 1}</span>
              <span><span className="font-semibold">{who}.</span> <span className="text-muted">{what}</span></span>
            </li>
          ))}
        </ol>
      </Dialog>
      <Dialog open={dialog === 'keys'} onClose={() => setDialog(null)} title="Keyboard shortcuts" size="sm">
        <dl className="space-y-2 text-[13px]">
          {[
            ['/', 'Focus global search'],
            ['↑ ↓ Enter', 'Navigate search results'],
            ['← →', 'Switch tabs'],
            ['Esc', 'Close dialogs and menus'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <dt className="text-muted">{v}</dt>
              <dd><kbd className="rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-[11px]">{k}</kbd></dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </>
  )
}

function ProfileMenu() {
  const { user, resetDemo } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <Popover
        className="w-64"
        trigger={(p) => (
          <button type="button" onClick={p.toggle} aria-expanded={p['aria-expanded']} aria-label="Profile menu" className="flex items-center gap-2 rounded-lg p-1 hover:bg-canvas">
            <Avatar name={user.name} size="sm" />
            <span className="hidden text-left leading-tight 2xl:block">
              <span className="block text-[13px] font-medium">{user.name}</span>
              <span className="block text-[11px] text-muted">{roleLabel(user.role)}</span>
            </span>
            <ChevronDown className="hidden size-3.5 text-muted 2xl:block" />
          </button>
        )}
      >
        {(close) => (
          <div role="menu">
            <div className="flex items-center gap-3 px-2.5 py-2">
              <Avatar name={user.name} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.title}</p>
              </div>
            </div>
            <MenuDivider />
            <MenuItem icon={<RotateCcw className="size-4" />} description="Restore all seeded records" onClick={() => { close(); setConfirm(true) }}>Reset demo data</MenuItem>
            <MenuItem icon={<LogOut className="size-4" />} onClick={() => { close(); navigate('/') }}>Sign out</MenuItem>
          </div>
        )}
      </Popover>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          resetDemo()
          setConfirm(false)
          toast.success('Demo data reset', 'All records restored to their seeded state.')
          navigate('/app')
        }}
        title="Reset demo data?"
        description="Every change you made in this prototype (requests, approvals, uploads, emails, settings) will be discarded."
        confirmLabel="Reset"
        tone="danger"
      />
    </>
  )
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button type="button" onClick={onOpenMobileNav} aria-label="Open navigation" className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-canvas lg:hidden">
        <MenuIcon className="size-5" />
      </button>
      <div className="hidden min-w-0 flex-1 sm:block">
        <GlobalSearch />
      </div>
      <div className="flex-1 sm:hidden" />
      <div className="flex items-center gap-1 sm:gap-1.5">
        <RoleSwitcher />
        <HelpMenu />
        <NotificationsMenu />
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <ProfileMenu />
      </div>
    </header>
  )
}

export { GlobalSearch }
