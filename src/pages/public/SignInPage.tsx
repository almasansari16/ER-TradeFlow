import { useNavigate } from 'react-router-dom'
import { ArrowRight, FlaskConical } from 'lucide-react'
import { ROLES } from '@/config/navigation'
import { DEMO_USER_BY_ROLE } from '@/data/org'
import { useStore } from '@/app/store'
import { Logo } from '@/components/layout/Logo'
import { Avatar } from '@/components/ui/misc'
import { BRAND } from '@/config/brand'
import { Link } from 'react-router-dom'

export default function SignInPage() {
  const { state, setRole } = useStore()
  const navigate = useNavigate()
  return (
    <div className="grid min-h-dvh lg:grid-cols-[420px_1fr]">
      <aside className="hidden flex-col justify-between bg-midnight p-10 text-white lg:flex">
        <Link to="/"><Logo dark /></Link>
        <div>
          <p className="text-2xl font-semibold leading-snug tracking-tight">{BRAND.tagline}</p>
          <p className="mt-3 text-sm text-slate-400">Pick a role to preview its workspace. You can switch at any time from the top bar.</p>
        </div>
        <p className="text-xs text-slate-500">{BRAND.demoNotice}</p>
      </aside>
      <main className="flex items-center justify-center bg-canvas px-5 py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-8 lg:hidden"><Link to="/"><Logo /></Link></div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to the demo</h1>
          <p className="mt-1 text-[13px] text-muted">No password needed — this is a role preview, not authentication.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary-50/70 px-3 py-2 text-xs text-primary-700">
            <FlaskConical className="size-4" /> Demo sign-in · roles are simulated and grant no real access.
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => {
              const u = state.users.find((x) => x.id === DEMO_USER_BY_ROLE[r.id])!
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setRole(r.id)
                      navigate('/app')
                    }}
                    className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left transition-all hover:border-primary/50 hover:shadow-[var(--shadow-pop)]"
                  >
                    <Avatar name={u.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{r.label}</span>
                      <span className="block truncate text-xs text-muted">{u.name} · {r.description}</span>
                    </span>
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-8 text-[13px] text-muted">
            New distributor? <Link to="/register" className="font-medium text-primary hover:underline">Submit a registration</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
