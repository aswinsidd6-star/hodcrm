import { createClient } from '../../../../src/utils/supabase/server'
import { requireAuthContext, requirePermission } from '../../../../src/lib/auth/guard'
import { PERMISSIONS } from '../../../../src/lib/auth/permissions'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import {
  formatINR,
  formatDate,
  formatDateTime,
  isPastDate,
  requireNonNegativeMinor,
} from '../../../../src/utils/formatters'
import type { Lead, LeadEstimate } from '../../../../src/types/crm'
import { PageShell, PageHeader } from '../../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../../src/components/ui/Button'
import { Field, Input, Select } from '../../../../src/components/ui/Field'
import { Badge, Alert } from '../../../../src/components/ui/Badge'
import { PriorityBadge, ConfidenceBadge } from '../../../../src/components/ui/StatusBadges'
import { cn } from '../../../../src/utils/cn'

type LeadPageProps = {
  params: Promise<{ id: string }>
}

async function convertToOpportunity(formData: FormData) {
  'use server'

  const leadId = String(formData.get('lead_id') || '').trim()
  const title = String(formData.get('title') || '').trim()

  if (!leadId) throw new Error('Missing lead ID')

  const auth = await requireAuthContext()
  await requirePermission(auth, PERMISSIONS.OPPORTUNITIES_CREATE)
  const { supabase, user, membership } = auth

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*, estimate:lead_estimates(*)')
    .eq('id', leadId)
    .single()

  if (leadErr || !lead) throw new Error('Lead not found')

  if (lead.organization_id !== membership.organization_id) {
    throw new Error('Lead does not belong to your active organization.')
  }

  const { data: existingOpp, error: existingOppError } = await supabase
    .from('opportunities')
    .select('id')
    .eq('lead_id', leadId)
    .limit(1)
  if (existingOppError) throw new Error(`Unable to check existing opportunity: ${existingOppError.message}`)
  if (existingOpp?.[0]?.id) {
    redirect(`/dashboard/opportunities/${existingOpp[0].id}`)
  }

  const { data: defaultStage } = await supabase
    .from('opportunity_stages')
    .select('id')
    .eq('organization_id', lead.organization_id)
    .eq('key', 'discovery')
    .maybeSingle()

  const oppData = {
    organization_id: lead.organization_id,
    lead_id: lead.id,
    company_id: lead.company_id,
    title: title || `${lead.contact_name} — Web Project`,
    service_of_interest: lead.service_of_interest,
    problem_solved: lead.problem_need,
    proposed_solution: lead.desired_outcome,
    stage_id: defaultStage?.id || null,
    owner_id: user.id,
    created_by: user.id,
  }

  const { data: newOpp, error: oppErr } = await supabase
    .from('opportunities')
    .insert(oppData)
    .select('id')
    .single()

  if (oppErr) throw new Error(`Could not convert lead: ${oppErr.message}`)

  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard/opportunities')
  redirect(`/dashboard/opportunities/${newOpp.id}`)
}

async function saveLeadEstimate(formData: FormData) {
  'use server'

  const leadId = String(formData.get('lead_id') || '').trim()
  const amountMinor = requireNonNegativeMinor(String(formData.get('amount') || ''), 'Estimated deal value')
  const confidence = String(formData.get('confidence') || 'medium')
  const basis = String(formData.get('basis') || '').trim() || null

  if (!leadId) throw new Error('Missing lead ID')

  const auth = await requireAuthContext()
  await requirePermission(auth, PERMISSIONS.LEADS_EDIT_ESTIMATE)
  const { supabase, user } = auth

  const { data: lead } = await supabase
    .from('leads')
    .select('organization_id')
    .eq('id', leadId)
    .single()

  if (!lead) throw new Error('Lead not found')

  const estimatePayload = {
    lead_id: leadId,
    organization_id: lead.organization_id,
    amount_minor: amountMinor,
    currency: 'INR',
    confidence: ['low', 'medium', 'high'].includes(confidence) ? confidence : 'medium',
    basis,
    updated_by: user.id,
  }

  const { error } = await supabase.from('lead_estimates').upsert(estimatePayload)

  if (error) throw new Error(`Unable to save estimate: ${error.message}`)

  revalidatePath(`/dashboard/leads/${leadId}`)
  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard/estimates')
}

export default async function LeadDetailPage({ params }: LeadPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Keep the lead detail lookup intentionally simple and resilient.
  // The list view already proves the lead is visible under the current RLS
  // context; optional company/contact embeds can make PostgREST reject the
  // whole record when a relationship is missing or ambiguous.
  const { data: leadData, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !leadData) {
    notFound()
  }

  const lead = leadData as unknown as Lead

  let estimate: LeadEstimate | null = null
  try {
    const { data: estData } = await supabase
      .from('lead_estimates')
      .select('*')
      .eq('lead_id', id)
      .maybeSingle()
    estimate = estData as unknown as LeadEstimate | null
  } catch {
    // Graceful if leads.view_estimate is revoked
  }

  const { data: existingOpp } = await supabase
    .from('opportunities')
    .select('id, reference, title, stage:opportunity_stages(name)')
    .eq('lead_id', id)
    .maybeSingle()

  const isOverdue = isPastDate(lead.next_followup_at)

  return (
    <PageShell>
      <PageHeader
        title={lead.contact_name}
        description={`${lead.company_name ? `${lead.company_name} · ` : ''}Created ${formatDate(lead.created_at)}`}
        breadcrumb={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/leads" className="text-xs text-zinc-400 transition hover:text-white">
              ← Back to Leads
            </Link>
            <Badge tone="neutral">#{lead.reference}</Badge>
            <PriorityBadge priority={lead.priority} />
            {lead.do_not_contact ? <Badge tone="danger">Do not contact</Badge> : null}
          </div>
        }
        actions={
          <>
            {existingOpp ? (
              <ButtonLink href={`/dashboard/opportunities/${existingOpp.id}`} variant="secondary">
                View opportunity →
              </ButtonLink>
            ) : (
              <form action={convertToOpportunity}>
                <input type="hidden" name="lead_id" value={lead.id} />
                <input type="hidden" name="title" value={`${lead.contact_name} — Web Project`} />
                <Button type="submit" variant="success">
                  Convert to opportunity
                </Button>
              </form>
            )}
            <ButtonLink href={`/dashboard/leads/${lead.id}/edit`} variant="secondary">
              Edit lead
            </ButtonLink>
          </>
        }
      />

      {isOverdue ? (
        <Alert tone="warning" title="Follow-up overdue">
          Scheduled for {formatDateTime(lead.next_followup_at)}
          {lead.next_action ? ` — ${lead.next_action}` : ''}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader title="Contact profile" />
              <div className="space-y-2.5 text-xs">
                <InfoRow label="Full name" value={lead.contact_name} />
                <InfoRow label="Designation" value={lead.designation} />
                <InfoRow
                  label="Email"
                  value={lead.email}
                  isLink={lead.email ? `mailto:${lead.email}` : undefined}
                />
                <InfoRow
                  label="Phone"
                  value={lead.phone}
                  isLink={lead.phone ? `tel:${lead.phone}` : undefined}
                />
                <InfoRow label="WhatsApp" value={lead.whatsapp} />
              </div>
            </Card>

            <Card>
              <CardHeader title="Business & location" />
              <div className="space-y-2.5 text-xs">
                <InfoRow label="Company" value={lead.company_name || (lead as { company?: { name?: string } }).company?.name} />
                <InfoRow
                  label="Linked contact"
                  value={(lead as { contact?: { full_name?: string | null } }).contact?.full_name}
                />
                <InfoRow label="Industry" value={lead.industry} />
                <InfoRow label="Business type" value={lead.business_type} />
                <InfoRow label="Service needed" value={lead.service_of_interest} />
                <InfoRow
                  label="Location"
                  value={[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '—'}
                />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Qualification & need analysis" />
            <div className="grid gap-4 text-xs sm:grid-cols-2">
              <InfoRow label="Urgency / timeline" value={lead.urgency} />
              <InfoRow label="Decision maker" value={lead.decision_maker_status} />
              <InfoRow label="Next action" value={lead.next_action} />
              <div>
                <span className="block text-[11px] text-zinc-500">Follow-up scheduled</span>
                <span className={cn('font-medium', isOverdue ? 'text-red-300' : 'text-zinc-200')}>
                  {lead.next_followup_at ? formatDateTime(lead.next_followup_at) : '—'}
                  {isOverdue ? ' (overdue)' : ''}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3 border-t border-white/[0.065]/60 pt-4">
              <NoteBlock title="Observed problem / need" body={lead.problem_need} />
              <NoteBlock title="Desired outcome" body={lead.desired_outcome} />
              {lead.qualification_notes ? (
                <NoteBlock title="Qualification notes" body={lead.qualification_notes} />
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Estimated deal value"
              description="Sales qualification estimate"
              action={<Badge tone="neutral">INR</Badge>}
            />

            {estimate ? (
              <div className="rounded-xl border border-white/[0.065] bg-zinc-950 p-4">
                <p className="text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {formatINR(estimate.amount_minor)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500">Confidence</span>
                  <ConfidenceBadge confidence={estimate.confidence} />
                </div>
                {estimate.basis ? (
                  <p className="mt-3 border-t border-white/[0.065]/60 pt-2 text-xs text-zinc-300">
                    <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      Basis
                    </span>
                    {estimate.basis}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.065] bg-zinc-950/40 px-4 py-6 text-center">
                <p className="text-xs text-zinc-500">No estimated value recorded yet.</p>
              </div>
            )}

            <form action={saveLeadEstimate} className="mt-4 space-y-3 border-t border-white/[0.055] pt-4">
              <input type="hidden" name="lead_id" value={lead.id} />
              <Field
                label={estimate ? 'Update value (INR ₹)' : 'Set value (INR ₹)'}
                htmlFor="lead-estimate-amount"
              >
                <Input
                  id="lead-estimate-amount"
                  type="number"
                  name="amount"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  defaultValue={estimate ? estimate.amount_minor / 100 : ''}
                  placeholder="25000"
                  required
                />
              </Field>
              <Field label="Confidence" htmlFor="lead-estimate-confidence">
                <Select
                  id="lead-estimate-confidence"
                  name="confidence"
                  defaultValue={estimate?.confidence || 'medium'}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </Field>
              <Field label="Basis / scope" htmlFor="lead-estimate-basis">
                <Input
                  id="lead-estimate-basis"
                  type="text"
                  name="basis"
                  defaultValue={estimate?.basis || ''}
                  placeholder="Scope or pricing notes"
                />
              </Field>
              <Button type="submit" variant="secondary" className="w-full">
                {estimate ? 'Update estimate' : 'Save estimate'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}

function InfoRow({
  label,
  value,
  isLink,
}: {
  label: string
  value: string | null | undefined
  isLink?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-[11px] text-zinc-500">{label}</span>
      {isLink ? (
        <a href={isLink} className="truncate text-right font-medium text-white hover:underline">
          {value || '—'}
        </a>
      ) : (
        <span className="truncate text-right font-medium text-zinc-200">{value || '—'}</span>
      )}
    </div>
  )
}

function NoteBlock({ title, body }: { title: string; body: string | null | undefined }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</p>
      <p className="whitespace-pre-wrap rounded-xl border border-white/[0.065]/60 bg-zinc-950 p-3 text-xs text-zinc-200">
        {body || 'None specified.'}
      </p>
    </div>
  )
}
