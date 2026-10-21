import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ApplicationStatusView } from '@/components/data-display/ApplicationStatusView'
import { useScope } from '@/hooks/useScope'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/misc'
import { ButtonLink } from '@/components/ui/Button'

export default function MyApplicationPage() {
  const { applications } = useScope()
  const sorted = [...applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const [active, setActive] = useState(sorted[0]?.id ?? '')
  const app = sorted.find((a) => a.id === active)
  return (
    <>
      <PageHeader title="My application" description="Registration history and review progress for your company." breadcrumbs={[{ label: 'My application' }]} />
      {sorted.length > 1 && <Tabs className="mb-6" value={active} onChange={setActive} items={sorted.map((a) => ({ key: a.id, label: a.ref }))} />}
      {app ? (
        <ApplicationStatusView app={app} allowRespond />
      ) : (
        <div className="card">
          <EmptyState icon={<BadgeCheck className="size-5" />} title="No applications yet" action={<ButtonLink to="/register">Start registration</ButtonLink>} />
        </div>
      )}
    </>
  )
}
