import { requireAuthContext, requirePermission } from '../../../../src/lib/auth/guard'
import { PERMISSIONS } from '../../../../src/lib/auth/permissions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { formatINR, formatDate } from '../../../../src/utils/formatters'
import type { Opportunity, OpportunityStage, LeadEstimate } from '../../../../src/types/crm'
import { PageShell, PageHeader } from '../../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../../src/components/ui/Button'
import { Badge } from '../../../../src/components/ui/Badge'
import { ConfidenceBadge } from '../../../../src/components/ui/StatusBadges'
import { cn } from '../../../../src/utils/cn'

type OpportunityPageProps = {
  params: Promise<{ id: string }>
}

async function updateStage(formData: FormData) {
  'use server'

  const oppId = String(formData.get('opp_id') || '').trim()
  const stageId = String(formData.get('stage_id') || '').trim()

  if (!oppId || !stageId) {
    throw new Error('Opportunity and stage are required to update the pipeline.')
  }

  const auth = await requireAuthContext()
  await requirePermission(auth, PERMISSIONS.OPPORTUNITIES_UPDATE)
  const { supabase, user } = auth

  const { data: stage } = await supabase
    .from('opportunity_stages')
    .select('id')
    .eq('id', stageId)
    .eq('organization_id', auth.membership.organization_id)
    .maybeSingle()
  if (!stage) throw new Error('Selected stage does not belong to your organization.')

  const { error } = await supabase
    .from('opportunities')
    .update({ stage_id: stageId, updated_by: user.id })
    .eq('id', oppId)
  if (error) throw new Error(`Unable to update opportunity stage: ${error.message}`)

  revalidatePath(`/dashboard/opportunities/${oppId}`)
  revalidatePath('/dashboard/opportunities')
  revalidatePath('/dashboard')
}

async function toggleCommercialFlag(formData: FormData) {
  'use server'

  const oppId = String(formData.get('opp_id') || '').trim()
  const flag = String(formData.get('flag') || '').trim()
  const value = formData.get('value') === 'true'

  if (!oppId) {
    throw new Error('Opportunity is required.')
  }

  const auth = await requireAuthContext()
  await requirePermission(auth, PERMISSIONS.OPPORTUNITIES_UPDATE)
  const { supabase, user } = auth

  const updatePayload: Record<string, boolean | string> = { updated_by: user.id }
  if (flag === 'contract_signed') updatePayload.contract_signed = value
  if (flag === 'advance_received') updatePayload.advance_received = value

  const { error } = await supabase
    .from('opportunities')
    .update(updatePayload)
    .eq('id', oppId)
  if (error) throw new Error(`Unable to update opportunity status: ${error.message}`)

  revalidatePath(`/dashboard/opportunities/${oppId}`)
  revalidatePath('/dashboard/opportunities')
  revalidatePath('/dashboard/deals')
  revalidatePath('/dashboard')
}

export default async function OpportunityDetailPage({ params }: OpportunityPageProps) {
  const { id } = await params
  const { supabase, hasMoneyAccess } = await requireAuthContext()

  const { data: oppData, error } = await supabase
    .from('opportunities')
    .select(`
      *,
      stage:opportunity_stages (
        id,
        key,
        name,
        is_won,
        is_lost,
        sort_order
      ),
      lead:leads (
        id,
        reference,
        contact_name,
        company_name,
        email,
        phone,
        city
      ),
      owner:profiles!opportunities_owner_id_fkey (
        full_name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (error || !oppData) {
    notFound()
  }

  const opp = oppData as unknown as Opportunity

  const { data: allStagesData } = await supabase
    .from('opportunity_stages')
    .select('*')
    .eq('organization_id', opp.organization_id)
    .order('sort_order', { ascending: true })

  const allStages = (allStagesData || []) as unknown as OpportunityStage[]

  let estimate: LeadEstimate | null = null
  if (opp.lead_id) {
    try {
      const { data: estData } = await supabase
        .from('lead_estimates')
        .select('*')
        .eq('lead_id', opp.lead_id)
        .maybeSingle()
      estimate = estData as unknown as LeadEstimate | null
    } catch {
      // Graceful if estimate permissions not held
    }
  }

  const isWon = Boolean(opp.stage?.is_won || opp.contract_signed)
  const isLost = Boolean(opp.stage?.is_lost)
  const showInvoiceCta = (isWon || opp.contract_signed) && hasMoneyAccess

  return (
    <PageShell>
      <PageHeader
        title={opp.title}
        description={`${opp.lead?.company_name || opp.lead?.contact_name || 'Independent'} · Created ${formatDate(opp.created_at)}`}
        breadcrumb={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/opportunities"
              className="text-xs text-zinc-400 transition hover:text-white"
            >
              ← Back to Opportunities
            </Link>
            <Badge tone="neutral">#{opp.reference}</Badge>
            <Badge tone={isWon ? 'success' : isLost ? 'danger' : 'neutral'}>
              {opp.stage?.name || 'Active'}
            </Badge>
          </div>
        }
        actions={
          <>
            {showInvoiceCta ? (
              <ButtonLink
                href={`/dashboard/invoices?opportunity_id=${opp.id}${estimate ? `&amount_rupees=${estimate.amount_minor / 100}` : ''}`}
                variant="success"
              >
                Create invoice
              </ButtonLink>
            ) : null}
            <ButtonLink href={`/dashboard/opportunities/${opp.id}/edit`} variant="secondary">
              Edit opportunity
            </ButtonLink>
          </>
        }
      />

      <Card>
        <CardHeader
          title="Pipeline progression"
          description="Select a stage to update the opportunity"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {allStages.map((st) => {
            const isCurrent = opp.stage_id === st.id
            const isPassed = (opp.stage?.sort_order || 0) > st.sort_order

            return (
              <form key={st.id} action={updateStage}>
                <input type="hidden" name="opp_id" value={opp.id} />
                <input type="hidden" name="stage_id" value={st.id} />
                <button
                  type="submit"
                  className={cn(
                    'w-full rounded-xl border p-2.5 text-left text-[11px] font-medium transition',
                    isCurrent
                      ? 'border-zinc-500 bg-zinc-800 text-white shadow-sm'
                      : isPassed
                        ? 'border-white/[0.065] bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                        : 'border-zinc-900/80 bg-zinc-950/40 text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  <span className="block text-[9px] uppercase tracking-wider text-zinc-500">
                    Step {st.sort_order}
                  </span>
                  <span className="mt-0.5 block truncate">{st.name}</span>
                </button>
              </form>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Scope & proposed solution" />
            <div className="space-y-4 text-xs">
              <NoteBlock
                title="Service of interest"
                body={opp.service_of_interest || 'General web design & development'}
              />
              <NoteBlock title="Detailed scope" body={opp.scope || 'No detailed scope documented yet.'} />
              <NoteBlock
                title="Proposed solution"
                body={opp.proposed_solution || 'No solution design documented yet.'}
              />
              <NoteBlock title="Problem solved" body={opp.problem_solved || 'None specified.'} />
            </div>
          </Card>

          {opp.lead ? (
            <Card>
              <CardHeader
                title="Originating lead"
                action={
                  <ButtonLink href={`/dashboard/leads/${opp.lead.id}`} variant="ghost" size="sm">
                    View lead →
                  </ButtonLink>
                }
              />
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <InfoCell label="Contact person" value={opp.lead.contact_name} />
                <InfoCell label="Company / brand" value={opp.lead.company_name || '—'} />
                <InfoCell label="Phone" value={opp.lead.phone || '—'} />
                <InfoCell label="Email" value={opp.lead.email || '—'} />
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Commercial milestones" />
            <div className="space-y-3">
              <form
                action={toggleCommercialFlag}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.065]/60 bg-zinc-950 p-3"
              >
                <input type="hidden" name="opp_id" value={opp.id} />
                <input type="hidden" name="flag" value="contract_signed" />
                <input type="hidden" name="value" value={opp.contract_signed ? 'false' : 'true'} />
                <div>
                  <p className="text-xs font-medium text-white">Contract signed</p>
                  <p className="text-[11px] text-zinc-500">Formal agreement executed</p>
                </div>
                <Button type="submit" variant={opp.contract_signed ? 'success' : 'secondary'} size="sm">
                  {opp.contract_signed ? 'Signed' : 'Mark signed'}
                </Button>
              </form>

              <form
                action={toggleCommercialFlag}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.065]/60 bg-zinc-950 p-3"
              >
                <input type="hidden" name="opp_id" value={opp.id} />
                <input type="hidden" name="flag" value="advance_received" />
                <input type="hidden" name="value" value={opp.advance_received ? 'false' : 'true'} />
                <div>
                  <p className="text-xs font-medium text-white">Advance received</p>
                  <p className="text-[11px] text-zinc-500">Kickoff payment collected</p>
                </div>
                <Button
                  type="submit"
                  variant={opp.advance_received ? 'success' : 'secondary'}
                  size="sm"
                >
                  {opp.advance_received ? 'Received' : 'Mark received'}
                </Button>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader title="Valuation & target date" />
            <div className="space-y-4 text-xs">
              <div>
                <span className="block text-[11px] text-zinc-500">Estimated value</span>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {estimate ? formatINR(estimate.amount_minor) : 'Not estimated'}
                </p>
                {estimate?.confidence ? (
                  <div className="mt-2">
                    <ConfidenceBadge confidence={estimate.confidence} />
                  </div>
                ) : null}
                {estimate?.basis ? (
                  <p className="mt-2 text-[11px] text-zinc-400">{estimate.basis}</p>
                ) : null}
              </div>
              <div className="border-t border-white/[0.065]/60 pt-3">
                <span className="block text-[11px] text-zinc-500">Target close date</span>
                <p className="mt-0.5 font-medium text-zinc-200">
                  {opp.expected_close_date ? formatDate(opp.expected_close_date) : 'No date set'}
                </p>
              </div>
              <div className="border-t border-white/[0.065]/60 pt-3">
                <span className="block text-[11px] text-zinc-500">Next action</span>
                <p className="mt-0.5 font-medium text-zinc-200">
                  {opp.next_action || 'No action scheduled'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}

function NoteBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</p>
      <p className="whitespace-pre-wrap rounded-xl border border-white/[0.065]/60 bg-zinc-950 p-3 text-zinc-200">
        {body}
      </p>
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[11px] text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-200">{value}</span>
    </div>
  )
}
