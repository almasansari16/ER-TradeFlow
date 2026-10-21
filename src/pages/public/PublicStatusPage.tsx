import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useStore } from '@/app/store'
import { Logo } from '@/components/layout/Logo'
import { ApplicationStatusView } from '@/components/data-display/ApplicationStatusView'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/misc'
import { TextField } from '@/components/forms/Field'

export default function PublicStatusPage() {
  const { ref = '' } = useParams()
  const { state } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState(ref)
  const app = state.applications.find((a) => a.ref.toLowerCase() === ref.toLowerCase())

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/"><Logo /></Link>
          <ButtonLink to="/sign-in" variant="secondary" size="sm">Sign in</ButtonLink>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Application status</h1>
            <p className="mt-1 text-[13px] text-muted">Track your distributor registration with its reference number.</p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (q.trim()) navigate(`/status/${q.trim()}`)
            }}
          >
            <TextField aria-label="Application reference" placeholder="APP-2026-0314" value={q} onChange={(e) => setQ(e.target.value)} leading={<Search className="size-4" />} className="w-56" />
            <Button type="submit" variant="dark">Look up</Button>
          </form>
        </div>
        {app ? (
          <ApplicationStatusView app={app} allowRespond />
        ) : (
          <div className="card">
            <EmptyState icon={<Search className="size-5" />} title="No application found" description={`We couldn’t find “${ref}”. Try APP-2026-0306 or APP-2026-0314 from the demo data.`} />
          </div>
        )}
      </main>
    </div>
  )
}
