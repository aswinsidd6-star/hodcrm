import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FINANCE_ENVIRONMENT_VARIABLE, requireFinanceContext, requireFinanceMutationContext } from '../../../src/lib/finance/server'
import { formatDate, formatINR, requireNonNegativeMinor } from '../../../src/utils/formatters'
import { requireAuthContext } from '../../../src/lib/auth/guard'
import type { Opportunity } from '../../../src/types/crm'
import { PageHeader, PageShell } from '../../../src/components/ui/Page'
import { Card, CardHeader, MetricCard } from '../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../src/components/ui/Button'
import { Field, Input, Select } from '../../../src/components/ui/Field'
import { Alert, EmptyState } from '../../../src/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td } from '../../../src/components/ui/Table'
import { InvoiceStatusBadge } from '../../../src/components/ui/StatusBadges'
import { FeedbackBanner } from '../../../src/components/ui/Feedback'

async function createInvoice(formData: FormData) {
  'use server'
  const { auth, finance } = await requireFinanceMutationContext()
  if (!finance) throw new Error('Finance server access is not configured.')
  const number = String(formData.get('number') || '').trim()
  const dueDate = String(formData.get('due_date') || '').trim()
  const amount = requireNonNegativeMinor(String(formData.get('amount_rupees') || ''), 'Invoice amount')
  const tax = requireNonNegativeMinor(String(formData.get('tax_rupees') || '0'), 'Tax amount')
  const opportunityId = String(formData.get('opportunity_id') || '').trim() || null
  if (!number || !dueDate) throw new Error('Invoice number, due date, and valid amounts are required.')
  if (amount <= 0) throw new Error('Invoice amount must be greater than zero.')

  if (opportunityId) {
    const { data: opp } = await auth.supabase
      .from('opportunities')
      .select('id, organization_id, company_id')
      .eq('id', opportunityId)
      .eq('organization_id', auth.membership.organization_id)
      .maybeSingle()
    if (!opp) throw new Error('Selected deal was not found in your organization.')
  }

  const { data: existingInvoice } = await finance
    .from('invoices')
    .select('id')
    .eq('organization_id', auth.membership.organization_id)
    .eq('number', number)
    .maybeSingle()
  if (existingInvoice) redirect('/dashboard/invoices?error=invoice_number_exists')

  const { data: oppMeta } = opportunityId
    ? await auth.supabase
        .from('opportunities')
        .select('company_id')
        .eq('id', opportunityId)
        .maybeSingle()
    : { data: null }

  const { error } = await finance.from('invoices').insert({
    organization_id: auth.membership.organization_id,
    number,
    due_date: dueDate,
    amount_minor: amount,
    tax_minor: tax,
    status: 'draft',
    opportunity_id: opportunityId,
    company_id: oppMeta?.company_id || null,
    created_by: auth.user.id,
    updated_by: auth.user.id,
  })
  if (error) {
    if (error.code === '23505') redirect('/dashboard/invoices?error=invoice_number_exists')
    throw new Error(`Unable to create invoice: ${error.message}`)
  }
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard')
  redirect('/dashboard/invoices?notice=created')
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; opportunity_id?: string; amount_rupees?: string }>
}) {
  const { error: errorCode, notice, opportunity_id: preselectedOpp, amount_rupees: prefillAmount } = await searchParams
  const { auth, finance } = await requireFinanceContext()
  if (!finance) return <FinanceUnavailable />

  const [{ data, error }, wonDeals] = await Promise.all([
    finance
      .from('invoice_balances')
      .select('*')
      .eq('organization_id', auth.membership.organization_id)
      .order('due_date', { ascending: true }),
    loadWonDeals(auth),
  ])
  if (error) throw new Error(`Unable to load invoices: ${error.message}`)
  const invoices = data || []
  const outstanding = invoices.reduce((sum, row) => sum + Number(row.outstanding_minor || 0), 0)
  const billed = invoices.reduce((sum, row) => sum + Number(row.total_minor || 0), 0)

  return (
    <PageShell>
      <PageHeader
        title="Invoices"
        description="Accounts receivable, outstanding balances, and draft billing."
        actions={<ButtonLink href="/dashboard/payments" variant="secondary">View payments</ButtonLink>}
      />

      <FeedbackBanner notice={notice} error={errorCode} />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Invoices" value={invoices.length} />
        <MetricCard label="Billed" value={formatINR(billed)} />
        <MetricCard label="Outstanding" value={formatINR(outstanding)} tone={outstanding > 0 ? 'warning' : 'default'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card padding={false}>
          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Create a draft from a won deal, then mark it issued when it is ready to collect."
              action={<ButtonLink href="/dashboard/deals" variant="secondary">Open deals</ButtonLink>}
            />
          ) : (
            <Table minWidth="720px">
              <THead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Total</Th>
                  <Th>Outstanding</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th>Open</Th>
                </tr>
              </THead>
              <TBody>
                {invoices.map((invoice) => (
                  <Tr key={invoice.invoice_id}>
                    <Td>
                      <Link
                        href={`/dashboard/invoices/${invoice.invoice_id}`}
                        className="relative z-10 inline-flex items-center rounded-lg px-2 py-1 font-semibold text-[#f4cf82] underline decoration-[#f4cf82]/30 underline-offset-4 transition hover:bg-[#e4b85f]/10 hover:text-white hover:decoration-[#f4cf82] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b85f]"
                      >
                        {invoice.number}
                      </Link>
                    </Td>
                    <Td className="tabular-nums text-zinc-300">{formatINR(invoice.total_minor)}</Td>
                    <Td className="tabular-nums text-amber-300">{formatINR(invoice.outstanding_minor)}</Td>
                    <Td className="text-zinc-400">{formatDate(invoice.due_date)}</Td>
                    <Td>
                      <InvoiceStatusBadge status={invoice.status} />
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/invoices/${invoice.invoice_id}`}
                        className="relative z-10 inline-flex items-center rounded-lg border border-white/[0.10] bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-[#c9913c]/40 hover:bg-[#e4b85f]/10 hover:text-[#f4cf82] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b85f]"
                      >
                        Open →
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Create invoice" description="Drafts are not sent. Mark issued on the invoice detail." />
          <form action={createInvoice} className="space-y-3">
            <Field label="Invoice number" htmlFor="invoice-number" required>
              <Input id="invoice-number" name="number" required placeholder="INV-001" />
            </Field>
            <Field label="Linked deal (optional)" htmlFor="invoice-opportunity">
              <Select id="invoice-opportunity" name="opportunity_id" defaultValue={preselectedOpp || ''}>
                <option value="">No linked deal</option>
                {wonDeals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    #{deal.reference} {deal.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due date" htmlFor="create-invoice-due" required>
              <Input id="create-invoice-due" name="due_date" required type="date" />
            </Field>
            <Field label="Amount (₹)" htmlFor="create-invoice-amount" required>
              <Input
                id="create-invoice-amount"
                name="amount_rupees"
                required
                min="0.01"
                step="0.01"
                type="number"
                defaultValue={prefillAmount || ''}
                placeholder="25000"
              />
            </Field>
            <Field label="Tax (₹)" htmlFor="create-invoice-tax">
              <Input
                id="create-invoice-tax"
                name="tax_rupees"
                min="0"
                step="0.01"
                defaultValue="0"
                type="number"
                placeholder="4500"
              />
            </Field>
            <Button type="submit" className="w-full">
              Create draft
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  )
}

async function loadWonDeals(auth: Awaited<ReturnType<typeof requireAuthContext>>) {
  const { data, error } = await auth.supabase
    .from('opportunities')
    .select('id, reference, title, contract_signed, stage:opportunity_stages(is_won, is_lost)')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  if (error) return [] as Opportunity[]
  return ((data || []) as unknown as Opportunity[]).filter(
    (deal) => Boolean(deal.stage?.is_won || deal.contract_signed) && !deal.stage?.is_lost
  )
}

function FinanceUnavailable() {
  return (
    <PageShell width="narrow">
      <Alert tone="warning" title="Finance workspace unavailable">
        Configure the server-only <code className="font-mono text-zinc-200">{FINANCE_ENVIRONMENT_VARIABLE}</code>{' '}
        environment variable in local development and Vercel.
      </Alert>
    </PageShell>
  )
}
