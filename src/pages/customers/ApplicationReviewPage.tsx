import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ExternalLink, Eye, FileSearch, FileText, FlaskConical, HelpCircle, X } from 'lucide-react'
import { useLookups, useStore } from '@/app/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState, KeyValue, Notice } from '@/components/ui/misc'
import { Checkbox, TextareaField, TextField } from '@/components/forms/Field'
import { ActivityTimeline, ProgressSteps } from '@/components/data-display/Timeline'
import { DocumentPreview } from '@/components/data-display/DocumentPreview'
import { useToast } from '@/components/ui/Toast'
import { brands } from '@/data/catalog'
import { dateTime, fileSize } from '@/utils/format'
import type { ApplicationDecision } from '@/app/store'

const INFO_ITEMS = [
  'Valid tax registration certificate',
  'Bank reference letter dated within the last 3 months',
  'Commercial registration with current expiry date',
  'Proof of warehouse / delivery address',
  'Authorised signatory ID',
]

export default function ApplicationReviewPage() {
  const { id } = useParams()
  const { state, user, decideApplication } = useStore()
  const lookups = useLookups()
  const toast = useToast()
  const app = state.applications.find((a) => a.id === id)
  const [dialog, setDialog] = useState<ApplicationDecision | null>(null)
  const [comment, setComment] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [error, setError] = useState<string>()
  const [preview, setPreview] = useState<{ name: string; type: string; sizeKb: number } | null>(null)

  if (!app)
    return (
      <div className="card">
        <EmptyState icon={<FileSearch className="size-5" />} title="Application not found" action={<ButtonLink to="/app/customers?tab=applications" variant="secondary">Back to applications</ButtonLink>} />
      </div>
    )

  const canReview = ['sales_coordinator', 'admin', 'territory_manager'].includes(user.role)
  const nameOf = (uid: string) => state.users.find((u) => u.id === uid)?.name ?? app.contact.name

  const close = () => {
    setDialog(null)
    setComment('')
    setItems([])
    setCustom('')
    setError(undefined)
  }
  const confirm = () => {
    if (!dialog) return
    if (dialog === 'reject' && comment.trim().length < 10) return setError('Give the applicant a clear reason (at least 10 characters).')
    const all = [...items, ...(custom.trim() ? [custom.trim()] : [])]
    if (dialog === 'request_info' && all.length === 0) return setError('Select or enter at least one item.')
    decideApplication(app.id, dialog, comment.trim(), all)
    const msg = { start: 'Documents verified', approve: 'Application approved — customer account created (demo)', request_info: 'Information requested from applicant', reject: 'Application rejected' }[dialog]
    toast.success(msg, 'Recorded locally in the prototype.')
    close()
  }

  const titles: Record<ApplicationDecision, string> = {
    start: 'Mark documents as verified',
    approve: 'Approve distributor application',
    request_info: 'Request additional information',
    reject: 'Reject application',
  }

  return (
    <>
      <PageHeader
        title={app.companyName}
        meta={<StatusBadge status={app.status} />}
        description={`${app.ref} · submitted ${dateTime(app.submittedAt)} · ${lookups.territory(app.territoryId)?.name}`}
        breadcrumbs={[{ label: 'Customers', to: '/app/customers' }, { label: 'Applications', to: '/app/customers?tab=applications' }, { label: app.ref }]}
        actions={
          canReview && (
            <>
              {app.status === 'Submitted' && <Button icon={<Check className="size-4" />} onClick={() => setDialog('start')}>Verify documents</Button>}
              {(app.status === 'Under Review' || app.status === 'Submitted') && (
                <Button variant="secondary" icon={<HelpCircle className="size-4" />} onClick={() => setDialog('request_info')}>Request info</Button>
              )}
              {['Submitted', 'Under Review', 'Information Requested'].includes(app.status) && (
                <Button variant="secondary" className="text-danger-700" icon={<X className="size-4" />} onClick={() => setDialog('reject')}>Reject</Button>
              )}
              {app.status === 'Under Review' && <Button variant="success" icon={<Check className="size-4" />} onClick={() => setDialog('approve')}>Approve</Button>}
              {app.status === 'Approved' && app.customerId && (
                <ButtonLink to={`/app/customers/${app.customerId}`} variant="secondary" icon={<ExternalLink className="size-4" />}>Open customer</ButtonLink>
              )}
            </>
          )
        }
      />

      <Card className="mb-6">
        <CardBody>
          <ProgressSteps steps={app.steps.map((s) => ({ label: s.label, state: s.status, sub: s.at ? dateTime(s.at) : s.status === 'current' ? 'In progress' : undefined }))} />
        </CardBody>
      </Card>

      {app.status === 'Information Requested' && (
        <Notice tone="warning" className="mb-6" title="Waiting for applicant">
          Requested: {app.pendingItems.join('; ')}
        </Notice>
      )}
      {app.status === 'Rejected' && <Notice tone="danger" className="mb-6" title="Rejection reason">{app.rejectionReason}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Company information" />
            <CardBody>
              <KeyValue
                cols={3}
                items={[
                  { label: 'Legal name', value: app.legalName },
                  { label: 'Commercial registration', value: <span className="font-mono">{app.crNumber}</span> },
                  { label: 'Tax / VAT number', value: <span className="font-mono">{app.taxNumber}</span> },
                  { label: 'Business type', value: app.businessType },
                  { label: 'Expected volume', value: app.annualVolumeBand },
                  { label: 'Website', value: app.website ?? '—' },
                  { label: 'Country / city', value: `${app.city}, ${app.country}` },
                  { label: 'Territory', value: lookups.territory(app.territoryId)?.name },
                  { label: 'Requested brands', value: app.requestedBrandIds.map((b) => brands.find((x) => x.id === b)?.name).join(', ') },
                ]}
              />
            </CardBody>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Primary contact" />
              <CardBody>
                <KeyValue cols={1} items={[{ label: 'Name', value: `${app.contact.name} — ${app.contact.role}` }, { label: 'Email', value: app.contact.email }, { label: 'Phone', value: app.contact.phone }]} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Addresses" />
              <CardBody>
                <KeyValue cols={1} items={[{ label: 'Billing', value: `${app.billingAddress.line1}, ${app.billingAddress.city}` }, { label: 'Delivery', value: `${app.deliveryAddress.line1}, ${app.deliveryAddress.city}` }]} />
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader title="Registration documents" description="Click to preview (placeholder rendering)" />
            <ul className="divide-y divide-line">
              {app.documents.map((d, i) => (
                <li key={`${d.name}-${i}`} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary"><FileText className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{d.name}</span>
                    <span className="block text-xs text-muted">{d.type} · {fileSize(d.sizeKb)}</span>
                  </span>
                  <Button size="sm" variant="ghost" icon={<Eye className="size-4" />} onClick={() => setPreview(d)}>Preview</Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader title="Review activity" />
          <div className="p-5"><ActivityTimeline entries={app.activity} nameOf={nameOf} /></div>
          {app.customerId && (
            <div className="border-t border-line px-5 py-3 text-[13px]">
              Customer account: <Link to={`/app/customers/${app.customerId}`} className="font-medium text-primary hover:underline">{lookups.customer(app.customerId)?.code}</Link>
            </div>
          )}
        </Card>
      </div>

      <Dialog
        open={!!dialog}
        onClose={close}
        title={dialog ? titles[dialog] : ''}
        description={dialog === 'approve' ? 'Creates an active customer account in the prototype and queues a simulated business-partner sync.' : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button variant={dialog === 'reject' ? 'danger' : dialog === 'approve' ? 'success' : 'primary'} onClick={confirm}>
              {dialog === 'reject' ? 'Reject application' : dialog === 'approve' ? 'Approve & create account' : dialog === 'request_info' ? 'Send request' : 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {dialog === 'request_info' && (
            <fieldset className="space-y-2.5">
              <legend className="label">Items to request</legend>
              {INFO_ITEMS.map((it) => (
                <Checkbox key={it} label={it} checked={items.includes(it)} onChange={() => { setError(undefined); setItems(items.includes(it) ? items.filter((x) => x !== it) : [...items, it]) }} />
              ))}
              <TextField aria-label="Other item" placeholder="Other item…" value={custom} onChange={(e) => setCustom(e.target.value)} />
            </fieldset>
          )}
          <TextareaField
            label={dialog === 'reject' ? 'Reason shared with applicant' : 'Comment'}
            required={dialog === 'reject'}
            error={dialog === 'reject' ? error : undefined}
            value={comment}
            onChange={(e) => { setComment(e.target.value); setError(undefined) }}
            rows={3}
          />
          {dialog === 'request_info' && error && <p role="alert" className="text-xs font-medium text-danger-700">{error}</p>}
          <p className="flex items-center gap-1.5 text-xs text-muted"><FlaskConical className="size-3.5" /> Recorded as {user.name} · demo action, no email sent.</p>
        </div>
      </Dialog>
      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />
    </>
  )
}
