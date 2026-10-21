import { useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, FlaskConical, Send, XCircle } from 'lucide-react'
import type { RegistrationApplication } from '@/types/domain'
import { useLookups, useStore } from '@/app/store'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { KeyValue, Notice } from '@/components/ui/misc'
import { FileDrop, type LocalFile } from '@/components/forms/FileDrop'
import { TextareaField } from '@/components/forms/Field'
import { useToast } from '@/components/ui/Toast'
import { brands } from '@/data/catalog'
import { cn } from '@/utils/cn'
import { dateTime, fileSize } from '@/utils/format'

export function ApplicationStatusView({ app, allowRespond }: { app: RegistrationApplication; allowRespond?: boolean }) {
  const lookups = useLookups()
  const { respondToInformationRequest } = useStore()
  const toast = useToast()
  const [files, setFiles] = useState<LocalFile[]>([])
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string>()

  const done = app.steps.filter((s) => s.status === 'done').length
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Application {app.ref}</p>
              <h2 className="mt-1 text-lg font-semibold">{app.companyName}</h2>
              <p className="text-[13px] text-muted">Submitted {dateTime(app.submittedAt)} · {lookups.territory(app.territoryId)?.name}</p>
            </div>
            <div className="text-right">
              <StatusBadge status={app.status} />
              <p className="mt-1 text-xs text-muted">{done} of {app.steps.length} stages complete</p>
            </div>
          </div>
          <CardBody>
            {app.status === 'Rejected' && (
              <Notice tone="danger" icon={<XCircle className="size-4" />} title="Application not approved" className="mb-5">
                {app.rejectionReason}
              </Notice>
            )}
            {app.status === 'Approved' && (
              <Notice tone="success" icon={<CheckCircle2 className="size-4" />} title="Approved — welcome aboard" className="mb-5">
                Your distributor account is active. Sign in to browse the catalogue and submit order requests.
              </Notice>
            )}
            <ol className="space-y-0">
              {app.steps.map((s, i) => (
                <li key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < app.steps.length - 1 && <span aria-hidden className={cn('absolute left-[13px] top-7 bottom-0 w-0.5', s.status === 'done' ? 'bg-success' : 'bg-line')} />}
                  <span
                    className={cn(
                      'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      s.status === 'done' && 'bg-success text-white',
                      s.status === 'current' && 'bg-primary text-white ring-4 ring-primary-100',
                      s.status === 'upcoming' && 'bg-slate-100 text-muted',
                      s.status === 'blocked' && (app.status === 'Rejected' ? 'bg-danger text-white' : 'bg-warning text-white'),
                    )}
                  >
                    {s.status === 'done' ? <CheckCircle2 className="size-4" /> : s.status === 'blocked' ? <AlertTriangle className="size-3.5" /> : i + 1}
                  </span>
                  <div className="pt-0.5">
                    <p className={cn('text-[13px] font-medium', s.status === 'upcoming' && 'text-muted')}>{s.label}</p>
                    <p className="text-xs text-muted">
                      {s.status === 'current' ? 'In progress' : s.at ? `${dateTime(s.at)}${s.by ? ` · ${s.by}` : ''}` : 'Not started'}
                    </p>
                    {s.note && <p className="mt-1 text-xs font-medium text-warning-700">{s.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        {app.status === 'Information Requested' && (
          <Card className="border-amber-200">
            <CardHeader title="Information requested" description="Please provide the following so review can continue." icon={<AlertTriangle className="size-5 text-warning" />} />
            <CardBody className="space-y-4">
              <ul className="space-y-2">
                {app.pendingItems.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[13px]"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />{p}</li>
                ))}
              </ul>
              {allowRespond ? (
                <>
                  <FileDrop files={files} onChange={(f) => { setFiles(f); setError(undefined) }} error={error} />
                  <TextareaField label="Message to reviewer (optional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted"><FlaskConical className="size-3.5" /> Files stay in this browser.</span>
                    <Button
                      icon={<Send className="size-4" />}
                      onClick={() => {
                        if (!files.length) return setError('Attach at least one document.')
                        respondToInformationRequest(app.id, files, comment)
                        setFiles([])
                        setComment('')
                        toast.success('Information sent (demo)', 'Your application is back under review.')
                      }}
                    >
                      Submit documents
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted">Sign in as the applicant (Distributor role) to respond.</p>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Submitted details" />
          <CardBody>
            <KeyValue
              cols={1}
              items={[
                { label: 'Legal name', value: app.legalName },
                { label: 'Commercial registration', value: app.crNumber },
                { label: 'Contact', value: `${app.contact.name} · ${app.contact.email}` },
                { label: 'Requested brands', value: app.requestedBrandIds.map((id) => brands.find((b) => b.id === id)?.name).join(', ') },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Documents" description={`${app.documents.length} file(s)`} />
          <ul className="divide-y divide-line">
            {app.documents.map((d, i) => (
              <li key={`${d.name}-${i}`} className="flex items-center gap-3 px-5 py-3">
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{d.name}</span>
                  <span className="block text-xs text-muted">{d.type} · {fileSize(d.sizeKb)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
