import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, FileText, FlaskConical, MapPin, Package, UserRound } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Checkbox, SelectField, TextField } from '@/components/forms/Field'
import { FileDrop, type LocalFile } from '@/components/forms/FileDrop'
import { zodResolver } from '@/components/forms/zodResolver'
import { Notice } from '@/components/ui/misc'
import { useStore } from '@/app/store'
import { brands } from '@/data/catalog'
import { COUNTRIES } from '@/data/org'
import { services } from '@/services'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/utils/cn'
import { fileSize } from '@/utils/format'
import type { DocumentType } from '@/types/domain'

const schema = z
  .object({
    companyName: z.string().trim().min(2, 'Enter the trading name'),
    legalName: z.string().trim().min(2, 'Enter the registered legal name'),
    crNumber: z.string().trim().min(4, 'Commercial registration number is required'),
    taxNumber: z.string().trim().min(3, 'Tax / VAT number is required (enter “N/A” if exempt)'),
    businessType: z.string().min(1, 'Select a business type'),
    annualVolumeBand: z.string().min(1, 'Select an expected annual volume'),
    website: z.string().trim().optional(),
    country: z.string().min(1, 'Select a country'),
    city: z.string().trim().min(2, 'Enter a city'),
    contactName: z.string().trim().min(2, 'Enter the contact’s full name'),
    contactRole: z.string().trim().min(2, 'Enter the contact’s job title'),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number with country code'),
    requestedBrandIds: z.array(z.string()).min(1, 'Select at least one brand'),
    billingLine1: z.string().trim().min(4, 'Enter the billing street address'),
    billingCity: z.string().trim().min(2, 'Enter the billing city'),
    billingPostal: z.string().trim().optional(),
    sameAsBilling: z.boolean(),
    deliveryLine1: z.string().trim().optional(),
    deliveryCity: z.string().trim().optional(),
    confirmAccuracy: z.boolean().refine((v) => v, 'Please confirm the information is accurate'),
  })
  .superRefine((v, ctx) => {
    if (!v.sameAsBilling) {
      if (!v.deliveryLine1 || v.deliveryLine1.length < 4) ctx.addIssue({ code: 'custom', path: ['deliveryLine1'], message: 'Enter the delivery street address' })
      if (!v.deliveryCity || v.deliveryCity.length < 2) ctx.addIssue({ code: 'custom', path: ['deliveryCity'], message: 'Enter the delivery city' })
    }
  })

type FormValues = z.infer<typeof schema>

const STEPS = [
  { key: 'company', label: 'Company', icon: Building2, fields: ['companyName', 'legalName', 'crNumber', 'taxNumber', 'businessType', 'annualVolumeBand', 'website'] },
  { key: 'contact', label: 'Contact & territory', icon: UserRound, fields: ['country', 'city', 'contactName', 'contactRole', 'email', 'phone'] },
  { key: 'brands', label: 'Brands & addresses', icon: MapPin, fields: ['requestedBrandIds', 'billingLine1', 'billingCity', 'billingPostal', 'sameAsBilling', 'deliveryLine1', 'deliveryCity'] },
  { key: 'documents', label: 'Documents', icon: FileText, fields: [] },
  { key: 'review', label: 'Review & submit', icon: CheckCircle2, fields: ['confirmAccuracy'] },
] as const

const DOC_TYPES: DocumentType[] = ['Commercial Registration', 'Trade License', 'Tax Certificate', 'Bank Reference Letter']

export default function RegisterPage() {
  const { state, submitApplication } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [docs, setDocs] = useState<(LocalFile & { type: DocumentType })[]>([])
  const [docError, setDocError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ ref: string; id: string }>()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      companyName: '', legalName: '', crNumber: '', taxNumber: '', businessType: '', annualVolumeBand: '', website: '',
      country: '', city: '', contactName: '', contactRole: '', email: '', phone: '',
      requestedBrandIds: [], billingLine1: '', billingCity: '', billingPostal: '', sameAsBilling: true, deliveryLine1: '', deliveryCity: '',
      confirmAccuracy: false,
    },
  })
  const { register, formState, trigger, getValues, setValue, control } = form
  const errors = formState.errors
  const country = useWatch({ control, name: 'country' })
  const sameAsBilling = useWatch({ control, name: 'sameAsBilling' })
  const selectedBrands = useWatch({ control, name: 'requestedBrandIds' })

  const territory = useMemo(() => {
    const tId = COUNTRIES.find((c) => c.country === country)?.territoryId
    return state.territories.find((t) => t.id === tId)
  }, [country, state.territories])
  const availableBrands = brands.filter((b) => !territory || territory.visibleBrandIds.includes(b.id))

  const validateDocs = () => {
    const hasReg = docs.some((d) => d.type === 'Commercial Registration' || d.type === 'Trade License')
    const hasTax = docs.some((d) => d.type === 'Tax Certificate')
    const msg = !hasReg ? 'Attach a commercial registration or trade license.' : !hasTax ? 'Attach a tax / VAT registration certificate.' : undefined
    setDocError(msg)
    return !msg
  }

  const next = async () => {
    const fields = STEPS[step]!.fields as unknown as (keyof FormValues)[]
    const ok = fields.length ? await trigger(fields, { shouldFocus: true }) : true
    if (!ok) return
    if (STEPS[step]!.key === 'documents' && !validateDocs()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = form.handleSubmit(async (v) => {
    if (!territory) return
    setSubmitting(true)
    const input = {
      companyName: v.companyName,
      legalName: v.legalName,
      crNumber: v.crNumber,
      taxNumber: v.taxNumber,
      country: v.country,
      city: v.city,
      territoryId: territory.id,
      website: v.website || undefined,
      businessType: v.businessType,
      annualVolumeBand: v.annualVolumeBand,
      contact: { name: v.contactName, role: v.contactRole, email: v.email, phone: v.phone },
      requestedBrandIds: v.requestedBrandIds,
      billingAddress: { line1: v.billingLine1, city: v.billingCity, postalCode: v.billingPostal, country: v.country },
      deliveryAddress: v.sameAsBilling
        ? { line1: v.billingLine1, city: v.billingCity, postalCode: v.billingPostal, country: v.country }
        : { line1: v.deliveryLine1!, city: v.deliveryCity!, country: v.country },
      documents: docs.map((d) => ({ name: d.name, type: d.type, sizeKb: d.sizeKb })),
    }
    try {
      const receipt = await services.customers.submitRegistration(input)
      submitApplication(input, receipt)
      setDone(receipt)
      toast.success('Application submitted (demo)', `Reference ${receipt.ref}`)
    } catch {
      toast.error('Submission failed', 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  })

  if (done)
    return (
      <Shell>
        <div className="card mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-50 text-success-700 ring-8 ring-success-50/50">
            <Check className="size-7" />
          </span>
          <h1 className="mt-5 text-xl font-semibold">Application received</h1>
          <p className="mt-2 text-[13px] text-muted">
            Your reference is <span className="font-mono font-medium text-ink">{done.ref}</span>. Our sales coordination team verifies documents first, then a commercial and territory review follows.
          </p>
          <Notice tone="demo" className="mt-5 text-left" icon={<FlaskConical className="size-4" />}>
            Demo only — the application is stored in this browser. No email is sent and no customer is created in any ERP.
          </Notice>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <ButtonLink to={`/status/${done.ref}`}>Track application status</ButtonLink>
            <Button variant="secondary" onClick={() => navigate('/sign-in')}>Review it as Sales Coordinator</Button>
          </div>
        </div>
      </Shell>
    )

  const v = getValues()
  return (
    <Shell>
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[230px_1fr]">
        <aside>
          <h1 className="text-xl font-semibold tracking-tight">Distributor registration</h1>
          <p className="mt-1 text-[13px] text-muted">About 5 minutes. Fields marked * are required.</p>
          <ol className="mt-6 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {STEPS.map((s, i) => (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => setStep(i)}
                  className={cn(
                    'flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] font-medium',
                    i === step ? 'bg-surface text-primary shadow-sm ring-1 ring-line' : i < step ? 'text-ink hover:bg-surface' : 'text-muted',
                  )}
                >
                  <span className={cn('flex size-6 items-center justify-center rounded-full text-[11px]', i < step ? 'bg-success text-white' : i === step ? 'bg-primary text-white' : 'bg-slate-200 text-muted')}>
                    {i < step ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <form onSubmit={onSubmit} noValidate className="card">
          <div className="border-b border-line px-6 py-4">
            <p className="eyebrow">Step {step + 1} of {STEPS.length}</p>
            <h2 className="mt-0.5 text-base font-semibold">{STEPS[step]!.label}</h2>
          </div>
          <div className="space-y-5 p-6">
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Trading name" required error={errors.companyName?.message} {...register('companyName')} />
                <TextField label="Registered legal name" required error={errors.legalName?.message} {...register('legalName')} />
                <TextField label="Commercial registration no." required error={errors.crNumber?.message} hint="As printed on your CR / trade license" {...register('crNumber')} />
                <TextField label="Tax / VAT number" required error={errors.taxNumber?.message} {...register('taxNumber')} />
                <SelectField label="Business type" required placeholder="Select…" error={errors.businessType?.message} options={['Wholesale distributor', 'Retail chain', 'Online retailer', 'Duty free operator', 'Specialist perfumery'].map((x) => ({ value: x, label: x }))} {...register('businessType')} />
                <SelectField label="Expected annual volume" required placeholder="Select…" error={errors.annualVolumeBand?.message} options={['Below USD 100k', 'USD 100k – 500k', 'USD 500k – 1M', 'Above USD 1M'].map((x) => ({ value: x, label: x }))} {...register('annualVolumeBand')} />
                <TextField label="Website" placeholder="example.com" className="sm:col-span-2" {...register('website')} />
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField label="Country" required placeholder="Select country…" error={errors.country?.message} options={COUNTRIES.map((c) => ({ value: c.country, label: c.country }))} {...register('country')} />
                <TextField label="City" required error={errors.city?.message} {...register('city')} />
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
                    <MapPin className="size-4 text-primary" />
                    <p className="text-[13px]">
                      <span className="text-muted">Assigned territory: </span>
                      <span className="font-medium">{territory ? territory.name : 'Select a country to see your territory'}</span>
                    </p>
                  </div>
                </div>
                <TextField label="Contact full name" required error={errors.contactName?.message} autoComplete="name" {...register('contactName')} />
                <TextField label="Job title" required error={errors.contactRole?.message} {...register('contactRole')} />
                <TextField label="Business email" type="email" required error={errors.email?.message} autoComplete="email" {...register('email')} />
                <TextField label="Phone" type="tel" required placeholder="+971 4 555 0100" error={errors.phone?.message} autoComplete="tel" {...register('phone')} />
              </div>
            )}

            {step === 2 && (
              <>
                <fieldset>
                  <legend className="label">Requested brands <span className="text-danger">*</span></legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableBrands.map((b) => {
                      const checked = selectedBrands.includes(b.id)
                      return (
                        <label key={b.id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors', checked ? 'border-primary bg-primary-50/60' : 'border-line hover:border-line-strong')}>
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={checked}
                            onChange={() =>
                              setValue('requestedBrandIds', checked ? selectedBrands.filter((x) => x !== b.id) : [...selectedBrands, b.id], { shouldValidate: true })
                            }
                          />
                          <span className="size-3 rounded-full" style={{ background: `hsl(${b.hue} 55% 55%)` }} aria-hidden />
                          <span>
                            <span className="block text-[13px] font-medium">{b.name}</span>
                            <span className="block text-xs text-muted">{b.origin}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {errors.requestedBrandIds && <p role="alert" className="mt-1.5 text-xs font-medium text-danger-700">{errors.requestedBrandIds.message}</p>}
                  {territory && availableBrands.length < brands.length && <p className="mt-2 text-xs text-muted">Only brands distributed in {territory.name} are listed.</p>}
                </fieldset>
                <div className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
                  <p className="text-sm font-semibold sm:col-span-2">Billing address</p>
                  <TextField label="Street address" required className="" error={errors.billingLine1?.message} {...register('billingLine1')} />
                  <TextField label="City" required error={errors.billingCity?.message} {...register('billingCity')} />
                  <TextField label="Postal code" {...register('billingPostal')} />
                  <TextField label="Country" value={country || '—'} disabled readOnly />
                  <Checkbox className="sm:col-span-2" label="Delivery address is the same as billing" {...register('sameAsBilling')} />
                  {!sameAsBilling && (
                    <>
                      <TextField label="Delivery street address" required error={errors.deliveryLine1?.message} {...register('deliveryLine1')} />
                      <TextField label="Delivery city" required error={errors.deliveryCity?.message} {...register('deliveryCity')} />
                    </>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <Notice tone="info">Required: a commercial registration <em>or</em> trade license, and a tax / VAT certificate. A bank reference letter speeds up review.</Notice>
                <FileDrop
                  files={docs}
                  error={docError}
                  onChange={(files) => {
                    setDocError(undefined)
                    setDocs(files.map((f, i) => ({ ...f, type: docs[i]?.type ?? (DOC_TYPES[Math.min(i, DOC_TYPES.length - 1)] as DocumentType) })))
                  }}
                />
                {docs.length > 0 && (
                  <div className="space-y-2">
                    <p className="label">Document types</p>
                    {docs.map((d, i) => (
                      <div key={`${d.name}-${i}`} className="flex flex-col gap-2 rounded-lg border border-line px-3 py-2 sm:flex-row sm:items-center">
                        <span className="min-w-0 flex-1 truncate text-[13px]">{d.name} <span className="text-muted">· {fileSize(d.sizeKb)}</span></span>
                        <SelectField
                          aria-label={`Type for ${d.name}`}
                          className="h-9 sm:w-60"
                          value={d.type}
                          options={DOC_TYPES.map((t) => ({ value: t, label: t }))}
                          onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, type: e.target.value as DocumentType } : x)))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <ReviewBlock title="Company" onEdit={() => setStep(0)} rows={[['Trading name', v.companyName], ['Legal name', v.legalName], ['CR number', v.crNumber], ['Tax number', v.taxNumber], ['Business type', v.businessType], ['Annual volume', v.annualVolumeBand]]} />
                <ReviewBlock title="Contact & territory" onEdit={() => setStep(1)} rows={[['Location', `${v.city}, ${v.country}`], ['Territory', territory?.name ?? '—'], ['Contact', `${v.contactName} — ${v.contactRole}`], ['Email', v.email], ['Phone', v.phone]]} />
                <ReviewBlock title="Brands & addresses" onEdit={() => setStep(2)} rows={[['Brands', v.requestedBrandIds.map((id) => brands.find((b) => b.id === id)?.name).join(', ')], ['Billing', `${v.billingLine1}, ${v.billingCity}`], ['Delivery', v.sameAsBilling ? 'Same as billing' : `${v.deliveryLine1}, ${v.deliveryCity}`]]} />
                <ReviewBlock title="Documents" onEdit={() => setStep(3)} rows={docs.map((d) => [d.type, d.name] as [string, string])} />
                <Checkbox label="I confirm the information provided is accurate and complete." description="Demo: nothing is sent to a server." {...register('confirmAccuracy')} />
                {errors.confirmAccuracy && <p role="alert" className="-mt-3 text-xs font-medium text-danger-700">{errors.confirmAccuracy.message}</p>}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line bg-canvas/60 px-6 py-4">
            <Button variant="ghost" icon={<ArrowLeft className="size-4" />} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next} iconRight={<ArrowRight className="size-4" />}>Continue</Button>
            ) : (
              <Button type="submit" loading={submitting} icon={<Package className="size-4" />}>Submit application</Button>
            )}
          </div>
        </form>
      </div>
    </Shell>
  )
}

function ReviewBlock({ title, rows, onEdit }: { title: string; rows: [string, string | undefined][]; onEdit: () => void }) {
  return (
    <div className="rounded-xl border border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="text-[13px] font-semibold">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-primary hover:underline">Edit</button>
      </div>
      <dl className="divide-y divide-line">
        {rows.map(([k, val], i) => (
          <div key={i} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2 text-[13px]">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium break-words">{val || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3 text-[13px]">
            <span className="hidden text-muted sm:inline">Already registered?</span>
            <ButtonLink to="/sign-in" variant="secondary" size="sm">Sign in</ButtonLink>
          </div>
        </div>
      </header>
      <main className="px-5 py-10">{children}</main>
    </div>
  )
}
