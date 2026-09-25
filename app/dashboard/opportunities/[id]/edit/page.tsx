import { createClient } from '../../../../../src/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { requireAuthContext, requirePermission } from '../../../../../src/lib/auth/guard'
import { PERMISSIONS } from '../../../../../src/lib/auth/permissions'
import type { Opportunity, OpportunityStage } from '../../../../../src/types/crm'
import { PageShell, PageHeader } from '../../../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../../../src/components/ui/Button'
import { Field, Input, Select, Textarea } from '../../../../../src/components/ui/Field'

type EditOpportunityPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditOpportunityPage({ params }: EditOpportunityPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: oppData, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !oppData) {
    notFound()
  }

  const opp = oppData as unknown as Opportunity

  const { data: stagesData } = await supabase
    .from('opportunity_stages')
    .select('*')
    .eq('organization_id', opp.organization_id)
    .order('sort_order', { ascending: true })

  const stages = (stagesData || []) as unknown as OpportunityStage[]

  async function updateOpportunity(formData: FormData) {
    'use server'

    const auth = await requireAuthContext()
    await requirePermission(auth, PERMISSIONS.OPPORTUNITIES_UPDATE)
    const { supabase, user } = auth

    const title = String(formData.get('title') || '').trim()
    if (!title) {
      throw new Error('Title is required.')
    }

    const stageId = String(formData.get('stage_id') || '').trim() || null
    if (stageId) {
      const { data: stage } = await supabase
        .from('opportunity_stages')
        .select('id')
        .eq('id', stageId)
        .eq('organization_id', opp.organization_id)
        .maybeSingle()
      if (!stage) throw new Error('Selected stage does not belong to this organization.')
    }

    const { error: updateErr } = await supabase
      .from('opportunities')
      .update({
        title,
        stage_id: stageId,
        expected_close_date: String(formData.get('expected_close_date') || '').trim() || null,
        service_of_interest: String(formData.get('service_of_interest') || '').trim() || null,
        problem_solved: String(formData.get('problem_solved') || '').trim() || null,
        proposed_solution: String(formData.get('proposed_solution') || '').trim() || null,
        scope: String(formData.get('scope') || '').trim() || null,
        next_action: String(formData.get('next_action') || '').trim() || null,
        contract_signed: formData.get('contract_signed') === 'on',
        advance_received: formData.get('advance_received') === 'on',
        updated_by: user.id,
      })
      .eq('id', id)

    if (updateErr) {
      throw new Error(`Unable to update opportunity: ${updateErr.message}`)
    }

    revalidatePath(`/dashboard/opportunities/${id}`)
    revalidatePath('/dashboard/opportunities')
    redirect(`/dashboard/opportunities/${id}`)
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title={`Edit Opportunity #${opp.reference}`}
        description="Modify title, stages, scope, and delivery milestones."
        breadcrumb={
          <Link
            href={`/dashboard/opportunities/${id}`}
            className="text-xs text-zinc-400 transition hover:text-white"
          >
            ← Back to Opportunity
          </Link>
        }
      />

      <form action={updateOpportunity} className="space-y-6">
        <Card>
          <CardHeader title="Core details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Title" htmlFor="title" required>
                <Input id="title" name="title" defaultValue={opp.title} required />
              </Field>
            </div>
            <Field label="Stage" htmlFor="stage_id">
              <Select id="stage_id" name="stage_id" defaultValue={opp.stage_id || ''}>
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Target close date" htmlFor="expected_close_date">
              <Input
                id="expected_close_date"
                name="expected_close_date"
                type="date"
                defaultValue={opp.expected_close_date || ''}
              />
            </Field>
            <Field label="Service focus" htmlFor="service_of_interest">
              <Input
                id="service_of_interest"
                name="service_of_interest"
                defaultValue={opp.service_of_interest || ''}
              />
            </Field>
            <Field label="Next action" htmlFor="next_action">
              <Input id="next_action" name="next_action" defaultValue={opp.next_action || ''} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Scope & deliverables" />
          <div className="space-y-4">
            <Field label="Scope" htmlFor="scope">
              <Textarea id="scope" name="scope" rows={3} defaultValue={opp.scope || ''} />
            </Field>
            <Field label="Proposed solution" htmlFor="proposed_solution">
              <Textarea
                id="proposed_solution"
                name="proposed_solution"
                rows={3}
                defaultValue={opp.proposed_solution || ''}
              />
            </Field>
            <Field label="Problem solved" htmlFor="problem_solved">
              <Textarea
                id="problem_solved"
                name="problem_solved"
                rows={2}
                defaultValue={opp.problem_solved || ''}
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
                defaultChecked={opp.contract_signed}
                className="h-4 w-4 rounded border-white/[0.065] bg-zinc-950 accent-white"
              />
              Contract / scope agreement signed
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-zinc-300">
              <input
                type="checkbox"
                name="advance_received"
                defaultChecked={opp.advance_received}
                className="h-4 w-4 rounded border-white/[0.065] bg-zinc-950 accent-white"
              />
              Initial advance payment received
            </label>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <ButtonLink href={`/dashboard/opportunities/${id}`} variant="secondary">
            Cancel
          </ButtonLink>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </PageShell>
  )
}
