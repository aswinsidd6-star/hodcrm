import { createClient } from '../../../../src/utils/supabase/server'
import { requireAuthContext, requirePermission } from '../../../../src/lib/auth/guard'
import { PERMISSIONS } from '../../../../src/lib/auth/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Lead, OpportunityStage } from '../../../../src/types/crm'
import { PageShell, PageHeader } from '../../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../../src/components/ui/Button'
import { Field, Input, Select, Textarea } from '../../../../src/components/ui/Field'

async function createOpportunity(formData: FormData) {
  'use server'

  const auth = await requireAuthContext()
  await requirePermission(auth, PERMISSIONS.OPPORTUNITIES_CREATE)
  const { supabase, user, membership } = auth

  const title = String(formData.get('title') || '').trim()
  if (!title) {
    throw new Error('Title is required.')
  }

  const leadId = String(formData.get('lead_id') || '').trim() || null
  const stageId = String(formData.get('stage_id') || '').trim() || null
  const expectedCloseDate = String(formData.get('expected_close_date') || '').trim() || null

  if (leadId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()
    if (!lead) throw new Error('Selected lead does not belong to your organization.')
  }
  if (stageId) {
    const { data: stage } = await supabase
      .from('opportunity_stages')
      .select('id')
      .eq('id', stageId)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()
    if (!stage) throw new Error('Selected stage does not belong to your organization.')
  }

  const opportunityPayload = {
    organization_id: membership.organization_id,
    title,
    lead_id: leadId,
    stage_id: stageId,
    expected_close_date: expectedCloseDate,
    service_of_interest: String(formData.get('service_of_interest') || '').trim() || null,
    problem_solved: String(formData.get('problem_solved') || '').trim() || null,
    proposed_solution: String(formData.get('proposed_solution') || '').trim() || null,
    scope: String(formData.get('scope') || '').trim() || null,
    next_action: String(formData.get('next_action') || '').trim() || null,
    contract_signed: formData.get('contract_signed') === 'on',
    advance_received: formData.get('advance_received') === 'on',
    owner_id: user.id,
    created_by: user.id,
  }

  const { error } = await supabase
    .from('opportunities')
    .insert(opportunityPayload)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Unable to create opportunity: ${error.message}`)
  }

  redirect('/dashboard/opportunities')
}

export default async function NewOpportunityPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: leadsData } = await supabase
    .from('leads')
    .select('id, reference, contact_name, company_name')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  const leads = (leadsData || []) as unknown as Lead[]

  const { data: stagesData } = await supabase
    .from('opportunity_stages')
    .select('id, key, name, sort_order')
    .order('sort_order', { ascending: true })

  const stages = (stagesData || []) as unknown as OpportunityStage[]

  return (
    <PageShell width="narrow">
      <PageHeader
        title="New Opportunity"
        description="Track high-intent client deals, proposals, and delivery scope."
        breadcrumb={
          <Link
            href="/dashboard/opportunities"
            className="text-xs text-zinc-400 transition hover:text-white"
          >
            ← Back to Opportunities
          </Link>
        }
      />

      <form action={createOpportunity} className="space-y-6">
        <Card>
          <CardHeader title="Opportunity overview" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Opportunity title" htmlFor="title" required>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Apex Hospital — Healthcare Portal & Booking"
                />
              </Field>
            </div>
            <Field label="Link existing lead" htmlFor="lead_id">
              <Select id="lead_id" name="lead_id" defaultValue="">
                <option value="">No linked lead (standalone)</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    #{lead.reference} — {lead.contact_name}
                    {lead.company_name ? ` (${lead.company_name})` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Pipeline stage" htmlFor="stage_id">
              <Select id="stage_id" name="stage_id" defaultValue={stages[0]?.id || ''}>
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Service focus" htmlFor="service_of_interest">
              <Input
                id="service_of_interest"
                name="service_of_interest"
                placeholder="e.g. Custom Web Development, SEO"
              />
            </Field>
            <Field label="Target close date" htmlFor="expected_close_date">
              <Input id="expected_close_date" name="expected_close_date" type="date" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Scope & deliverables" />
          <div className="space-y-4">
            <Field label="Project scope details" htmlFor="scope">
              <Textarea
                id="scope"
                name="scope"
                rows={3}
                placeholder="Key deliverables, timeline milestones, integrations…"
              />
            </Field>
            <Field label="Proposed solution" htmlFor="proposed_solution">
              <Textarea
                id="proposed_solution"
                name="proposed_solution"
                rows={3}
                placeholder="Responsive design with local SEO ranking…"
              />
            </Field>
            <Field label="Problem solved" htmlFor="problem_solved">
              <Textarea
                id="problem_solved"
                name="problem_solved"
                rows={2}
                placeholder="What client problem does this address?"
              />
            </Field>
            <Field label="Next action" htmlFor="next_action">
              <Input
                id="next_action"
                name="next_action"
                placeholder="e.g. Deliver proposal & advance invoice"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Commercial milestones" />
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-zinc-300">
              <input
                type="checkbox"
                name="contract_signed"
                className="h-4 w-4 rounded border-white/[0.065] bg-zinc-950 accent-white"
              />
              Contract / scope agreement signed
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-zinc-300">
              <input
                type="checkbox"
                name="advance_received"
                className="h-4 w-4 rounded border-white/[0.065] bg-zinc-950 accent-white"
              />
              Initial advance payment received
            </label>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <ButtonLink href="/dashboard/opportunities" variant="secondary">
            Cancel
          </ButtonLink>
          <Button type="submit">Create opportunity</Button>
        </div>
      </form>
    </PageShell>
  )
}
