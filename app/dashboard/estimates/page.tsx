import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { requireAuthContext, requirePermission } from '../../../src/lib/auth/guard'
import { PERMISSIONS } from '../../../src/lib/auth/permissions'
import { formatINR, formatDate, requireNonNegativeMinor } from '../../../src/utils/formatters'
import type { Lead, LeadEstimate } from '../../../src/types/crm'
import { PageHeader, PageShell } from '../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../src/components/ui/Button'
import { Field, Input, Select, Textarea } from '../../../src/components/ui/Field'
import { EmptyState } from '../../../src/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td } from '../../../src/components/ui/Table'
import { ConfidenceBadge } from '../../../src/components/ui/StatusBadges'

async function saveEstimate(formData: FormData) {
  'use server'

  const auth = await requireAuthContext()
  await requirePermission(auth, PERMISSIONS.LEADS_EDIT_ESTIMATE)
  const leadId = String(formData.get('lead_id') || '').trim()
  const amount = requireNonNegativeMinor(String(formData.get('amount_rupees') || ''), 'Estimate amount')
  if (!leadId) {
    throw new Error('A valid lead and non-negative estimate are required.')
  }

  const { error } = await auth.supabase.from('lead_estimates').upsert({
    lead_id: leadId,
    organization_id: auth.membership.organization_id,
    amount_minor: amount,
    confidence: String(formData.get('confidence') || '').trim() || null,
    basis: String(formData.get('basis') || '').trim() || null,
    created_by: auth.user.id,
    updated_by: auth.user.id,
  }, { onConflict: 'lead_id' })

  if (error) throw new Error(`Unable to save estimate: ${error.message}`)
  revalidatePath('/dashboard/estimates')
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/leads/${leadId}`)
}

export default async function EstimatesPage() {
  const auth = await requireAuthContext()
  const { data: leadsData, error: leadsError } = await auth.supabase
    .from('leads')
    .select('id, reference, contact_name, company_name, next_followup_at')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (leadsError) throw new Error(`Unable to load leads: ${leadsError.message}`)
  const leads = (leadsData || []) as unknown as Lead[]
  const { data: estimatesData, error: estimatesError } = await auth.supabase
    .from('lead_estimates')
    .select('*')

  if (estimatesError) throw new Error(`Unable to load estimates: ${estimatesError.message}`)
  const estimates = (estimatesData || []) as unknown as LeadEstimate[]
  const totalMinor = estimates.reduce((sum, e) => sum + (e.amount_minor || 0), 0)

  return (
    <PageShell>
      <PageHeader
        title="Estimates"
        description="Sales estimates recorded during lead qualification."
        actions={
          <span className="text-xs text-zinc-500 tabular-nums">
            {estimates.length} · {formatINR(totalMinor)}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card padding={false}>
          <div className="p-5 sm:p-6 pb-0">
            <CardHeader title="Lead estimates" description="Values linked to active prospects" />
          </div>
          {estimates.length === 0 ? (
            <EmptyState
              title="No estimates recorded yet"
              description="Use the form to capture a first deal value against a lead."
            />
          ) : (
            <Table minWidth="720px">
              <THead>
                <tr>
                  <Th>Lead</Th>
                  <Th>Value</Th>
                  <Th>Confidence</Th>
                  <Th>Updated</Th>
                  <Th align="right">Action</Th>
                </tr>
              </THead>
              <TBody>
                {estimates.map((estimate) => {
                  const lead = leads.find((item) => item.id === estimate.lead_id)
                  return (
                    <Tr key={estimate.lead_id}>
                      <Td>
                        <Link
                          className="font-medium text-white hover:underline"
                          href={`/dashboard/leads/${estimate.lead_id}`}
                        >
                          {lead?.contact_name || 'Lead'}
                          {lead?.company_name ? (
                            <span className="ml-2 font-normal text-zinc-500">{lead.company_name}</span>
                          ) : null}
                        </Link>
                      </Td>
                      <Td className="font-medium tabular-nums text-zinc-200">
                        {formatINR(estimate.amount_minor)}
                      </Td>
                      <Td>
                        <ConfidenceBadge confidence={estimate.confidence} />
                      </Td>
                      <Td className="text-zinc-400">{formatDate(estimate.updated_at)}</Td>
                      <Td align="right">
                        <ButtonLink href={`/dashboard/estimates/${estimate.lead_id}`} variant="ghost" size="sm">
                          Edit
                        </ButtonLink>
                      </Td>
                    </Tr>
                  )
                })}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Record or update estimate" description="Upserts by lead" />
          <form action={saveEstimate} className="space-y-4">
            <Field label="Lead" htmlFor="estimate-lead-id" required>
              <Select id="estimate-lead-id" name="lead_id" required defaultValue="">
                <option value="">Select a lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    #{lead.reference} — {lead.contact_name}
                    {lead.company_name ? ` (${lead.company_name})` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount (₹)" htmlFor="estimate-amount" required>
              <Input
                id="estimate-amount"
                name="amount_rupees"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="25000"
              />
            </Field>
            <Field label="Confidence" htmlFor="estimate-confidence">
              <Select id="estimate-confidence" name="confidence" defaultValue="">
                <option value="">Not set</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Basis" htmlFor="estimate-basis" hint="Qualification notes or pricing rationale">
              <Textarea
                id="estimate-basis"
                name="basis"
                rows={3}
                placeholder="Basis or qualification notes"
              />
            </Field>
            <Button type="submit" className="w-full">
              Save estimate
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  )
}
