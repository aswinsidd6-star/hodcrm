import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuthContext, requirePermission } from '../../../../src/lib/auth/guard'
import { PERMISSIONS } from '../../../../src/lib/auth/permissions'
import { formatINR, requireNonNegativeMinor } from '../../../../src/utils/formatters'
import type { Lead, LeadEstimate } from '../../../../src/types/crm'
import { PageHeader, PageShell } from '../../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../../src/components/ui/Button'
import { Field, Input, Select, Textarea } from '../../../../src/components/ui/Field'
import { ConfidenceBadge } from '../../../../src/components/ui/StatusBadges'
import { ConfirmSubmitButton } from '../../../../src/components/ui/ConfirmButton'

type EstimatePageProps = { params: Promise<{ leadId: string }> }

async function updateEstimate(formData: FormData) {
  'use server'
  const auth = await requireAuthContext()
  await requirePermission(auth, PERMISSIONS.LEADS_EDIT_ESTIMATE)
  const leadId = String(formData.get('lead_id') || '').trim()
  const amount = requireNonNegativeMinor(String(formData.get('amount_rupees') || ''), 'Estimate amount')
  if (!leadId) throw new Error('Enter a valid non-negative rupee amount.')
  const { error } = await auth.supabase
    .from('lead_estimates')
    .update({
      amount_minor: amount,
      confidence: String(formData.get('confidence') || '').trim() || null,
      basis: String(formData.get('basis') || '').trim() || null,
      updated_by: auth.user.id,
    })
    .eq('lead_id', leadId)
  if (error) throw new Error(`Unable to update estimate: ${error.message}`)
  revalidatePath('/dashboard/estimates')
  revalidatePath(`/dashboard/estimates/${leadId}`)
  revalidatePath(`/dashboard/leads/${leadId}`)
  redirect('/dashboard/estimates')
}

async function deleteEstimate(formData: FormData) {
  'use server'
  const auth = await requireAuthContext()
  await requirePermission(auth, PERMISSIONS.LEADS_EDIT_ESTIMATE)
  const leadId = String(formData.get('lead_id') || '').trim()
  if (!leadId) throw new Error('Estimate lead is required.')
  const { error } = await auth.supabase.from('lead_estimates').delete().eq('lead_id', leadId)
  if (error) throw new Error(`Unable to delete estimate: ${error.message}`)
  revalidatePath('/dashboard/estimates')
  revalidatePath(`/dashboard/leads/${leadId}`)
  redirect('/dashboard/estimates')
}

export default async function EstimateDetailPage({ params }: EstimatePageProps) {
  const { leadId } = await params
  const auth = await requireAuthContext()
  const [{ data: leadData, error: leadError }, { data: estimateData, error: estimateError }] =
    await Promise.all([
      auth.supabase
        .from('leads')
        .select('id, reference, contact_name, company_name')
        .eq('id', leadId)
        .maybeSingle(),
      auth.supabase.from('lead_estimates').select('*').eq('lead_id', leadId).maybeSingle(),
    ])
  if (leadError || estimateError) throw new Error('Unable to load this estimate.')
  if (!leadData || !estimateData) notFound()
  const lead = leadData as unknown as Lead
  const estimate = estimateData as unknown as LeadEstimate

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Edit estimate"
        description={`#${lead.reference} ${lead.contact_name}${lead.company_name ? ` — ${lead.company_name}` : ''}`}
        breadcrumb={
          <Link href="/dashboard/estimates" className="text-xs text-zinc-400 hover:text-white">
            ← Back to estimates
          </Link>
        }
        actions={
          <ButtonLink href={`/dashboard/leads/${leadId}`} variant="secondary" size="sm">
            View lead
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader
          title="Estimate details"
          description="Update value, confidence, or remove this record"
          action={<ConfidenceBadge confidence={estimate.confidence} />}
        />
        <p className="mb-5 text-sm text-zinc-400">
          Current value:{' '}
          <span className="font-semibold tabular-nums text-white">{formatINR(estimate.amount_minor)}</span>
        </p>
        <form action={updateEstimate} className="space-y-4">
          <input type="hidden" name="lead_id" value={leadId} />
          <Field label="Amount (₹)" htmlFor="edit-estimate-amount" required>
            <Input
              id="edit-estimate-amount"
              name="amount_rupees"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={estimate.amount_minor / 100}
            />
          </Field>
          <Field label="Confidence" htmlFor="edit-estimate-confidence">
            <Select
              id="edit-estimate-confidence"
              name="confidence"
              defaultValue={estimate.confidence || ''}
            >
              <option value="">Not set</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <Field label="Basis" htmlFor="edit-estimate-basis">
            <Textarea
              id="edit-estimate-basis"
              name="basis"
              rows={4}
              defaultValue={estimate.basis || ''}
            />
          </Field>
          <Button type="submit" className="w-full">
            Save changes
          </Button>
        </form>
        <form action={deleteEstimate} className="mt-5 border-t border-white/[0.065] pt-5">
          <input type="hidden" name="lead_id" value={leadId} />
          <ConfirmSubmitButton
            message="Delete this estimate? This cannot be undone."
            className="w-full"
          >
            Delete estimate
          </ConfirmSubmitButton>
        </form>
      </Card>
    </PageShell>
  )
}
