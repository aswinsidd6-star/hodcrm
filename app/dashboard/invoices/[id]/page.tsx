import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireFinanceContext, requireFinanceMutationContext } from '../../../../src/lib/finance/server'
import {
  isPaymentDerivedStatus,
  resolveInvoiceStatusUpdate,
} from '../../../../src/lib/finance/invoice-lifecycle'
import { formatDate, formatINR, requireNonNegativeMinor } from '../../../../src/utils/formatters'
import { PageHeader, PageShell, Breadcrumbs } from '../../../../src/components/ui/Page'
import { Card, CardHeader, MetricCard } from '../../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../../src/components/ui/Button'
import { Field, Input, Select, Textarea } from '../../../../src/components/ui/Field'
import { Alert, EmptyState } from '../../../../src/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td } from '../../../../src/components/ui/Table'
import { InvoiceStatusBadge } from '../../../../src/components/ui/StatusBadges'
import { FeedbackBanner } from '../../../../src/components/ui/Feedback'

type InvoicePageProps = { params: Promise<{ id: string }> }

async function updateInvoice(formData: FormData) {
  'use server'
  const { auth, finance } = await requireFinanceMutationContext()
  if (!finance) throw new Error('Finance server access is not configured.')
  const id = String(formData.get('id') || '').trim()
  const dueDate = String(formData.get('due_date') || '').trim()
  const amount = requireNonNegativeMinor(String(formData.get('amount_rupees') || ''), 'Invoice amount')
  const tax = requireNonNegativeMinor(String(formData.get('tax_rupees') || '0'), 'Tax amount')
  const requestedStatus = String(formData.get('status') || 'draft')
  if (!id || !dueDate) throw new Error('Enter valid invoice details.')

  const [{ data: existing }, { data: balance }] = await Promise.all([
    finance
      .from('invoices')
      .select('id, organization_id, status')
      .eq('id', id)
      .eq('organization_id', auth.membership.organization_id)
      .maybeSingle(),
    finance
      .from('invoice_balances')
      .select('paid_minor')
      .eq('invoice_id', id)
      .eq('organization_id', auth.membership.organization_id)
      .maybeSingle(),
  ])
  if (!existing) throw new Error('Invoice not found in your organization.')

  const { status: nextStatus } = resolveInvoiceStatusUpdate({
    currentStatus: existing.status,
    requestedStatus,
    paidMinor: Number(balance?.paid_minor || 0),
  })

  const { error } = await finance
    .from('invoices')
    .update({
      due_date: dueDate,
      amount_minor: amount,
      tax_minor: tax,
      status: nextStatus,
      notes: String(formData.get('notes') || '').trim() || null,
      updated_by: auth.user.id,
    })
    .eq('id', id)
    .eq('organization_id', auth.membership.organization_id)
  if (error) throw new Error(`Unable to update invoice: ${error.message}`)
  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/invoices/${id}`)
  revalidatePath('/dashboard')
  redirect(`/dashboard/invoices/${id}?notice=saved`)
}

async function issueInvoice(formData: FormData) {
  'use server'
  const { auth, finance } = await requireFinanceMutationContext()
  if (!finance) throw new Error('Finance server access is not configured.')
  const id = String(formData.get('id') || '').trim()
  const { data: existing } = await finance
    .from('invoices')
    .select('id, status')
    .eq('id', id)
    .eq('organization_id', auth.membership.organization_id)
    .maybeSingle()
  if (!existing) throw new Error('Invoice not found in your organization.')
  if (existing.status !== 'draft') {
    throw new Error('Only draft invoices can be marked issued.')
  }
  const { error } = await finance
    .from('invoices')
    .update({ status: 'issued', updated_by: auth.user.id })
    .eq('id', id)
    .eq('organization_id', auth.membership.organization_id)
  if (error) throw new Error(`Unable to issue invoice: ${error.message}`)
  revalidatePath(`/dashboard/invoices/${id}`)
  revalidatePath('/dashboard/invoices')
  redirect(`/dashboard/invoices/${id}?notice=issued`)
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: InvoicePageProps & { searchParams: Promise<{ notice?: string }> }) {
  const { id } = await params
  const { notice } = await searchParams
  const { auth, finance } = await requireFinanceContext()
  if (!finance) {
    return (
      <PageShell width="narrow">
        <Alert tone="warning">Finance server access is not configured.</Alert>
      </PageShell>
    )
  }

  const [{ data: invoice, error }, { data: balance }, { data: payments }] = await Promise.all([
    finance
      .from('invoices')
      .select('id, number, invoice_date, due_date, amount_minor, tax_minor, status, notes, opportunity_id, company_id')
      .eq('id', id)
      .eq('organization_id', auth.membership.organization_id)
      .maybeSingle(),
    finance
      .from('invoice_balances')
      .select('total_minor, paid_minor, outstanding_minor')
      .eq('invoice_id', id)
      .eq('organization_id', auth.membership.organization_id)
      .maybeSingle(),
    finance
      .from('payments')
      .select('id, amount_minor, paid_on, method, reference, reverses_id')
      .eq('invoice_id', id)
      .eq('organization_id', auth.membership.organization_id)
      .order('paid_on', { ascending: false }),
  ])
  if (error) throw new Error(`Unable to load invoice: ${error.message}`)
  if (!invoice) notFound()

  let companyName: string | null = null
  if (invoice.company_id) {
    const { data: company } = await auth.supabase
      .from('companies')
      .select('name')
      .eq('id', invoice.company_id)
      .maybeSingle()
    companyName = company?.name || null
  }

  const derived = isPaymentDerivedStatus(invoice.status)
  const statusSelectValue = derived ? 'keep_derived' : invoice.status
  const outstanding = Number(balance?.outstanding_minor || 0)
  const canIssue = invoice.status === 'draft'

  return (
    <PageShell width="narrow">
      <PageHeader
        title={`Invoice ${invoice.number}`}
        description={`${formatDate(invoice.invoice_date)} · due ${formatDate(invoice.due_date)}${companyName ? ` · ${companyName}` : ''}`}
        breadcrumb={
          <Breadcrumbs
            items={[
              { href: '/dashboard/invoices', label: 'Invoices' },
              { label: invoice.number },
            ]}
          />
        }
        actions={
          <>
            <InvoiceStatusBadge status={invoice.status} />
            {outstanding > 0 ? (
              <ButtonLink href={`/dashboard/payments?invoice_id=${invoice.id}`}>Record payment</ButtonLink>
            ) : null}
          </>
        }
      />

      <FeedbackBanner notice={notice} />

      {canIssue ? (
        <Alert tone="info" title="Draft">
          This invoice has not been issued. Marking issued records it as collectible in the workspace. Email
          sending is not configured.
        </Alert>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total" value={formatINR(balance?.total_minor)} />
        <MetricCard label="Paid" value={formatINR(balance?.paid_minor)} tone="success" />
        <MetricCard
          label="Outstanding"
          value={formatINR(balance?.outstanding_minor)}
          tone={outstanding > 0 ? 'warning' : 'default'}
        />
      </div>

      {canIssue ? (
        <form action={issueInvoice}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="secondary" className="w-full">
            Mark as issued
          </Button>
        </form>
      ) : null}

      {invoice.opportunity_id ? (
        <p className="text-xs text-zinc-500">
          Linked deal:{' '}
          <Link href={`/dashboard/opportunities/${invoice.opportunity_id}`} className="text-zinc-300 hover:text-white">
            Open opportunity
          </Link>
        </p>
      ) : null}

      <Card>
        <CardHeader title="Payment history" description="Receipts and reversals against this invoice" />
        {(payments || []).length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Record a receipt when funds arrive. Installments are allowed."
            action={
              outstanding > 0 ? (
                <ButtonLink href={`/dashboard/payments?invoice_id=${invoice.id}`} size="sm">
                  Record payment
                </ButtonLink>
              ) : null
            }
          />
        ) : (
          <Table minWidth="480px">
            <THead>
              <tr>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Method</Th>
                <Th>Note</Th>
              </tr>
            </THead>
            <TBody>
              {(payments || []).map((payment) => (
                <Tr key={payment.id}>
                  <Td className="text-zinc-400">{formatDate(payment.paid_on)}</Td>
                  <Td className={Number(payment.amount_minor) < 0 ? 'tabular-nums text-red-300' : 'tabular-nums text-emerald-300'}>
                    {formatINR(payment.amount_minor)}
                  </Td>
                  <Td className="text-zinc-400">{payment.method}</Td>
                  <Td className="text-zinc-500">{payment.reverses_id ? 'Reversal' : payment.reference || '—'}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Edit invoice" />
        {derived ? (
          <p className="mb-4 text-xs text-zinc-400">
            Status <span className="font-medium text-zinc-200">{invoice.status}</span> is derived from payments and
            due date. You may cancel or write it off; you cannot set draft or issued while it is active.
          </p>
        ) : null}
        <form action={updateInvoice} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <Field label="Due date" htmlFor="invoice-due-date" required>
            <Input id="invoice-due-date" name="due_date" required type="date" defaultValue={invoice.due_date} />
          </Field>
          <Field label="Amount (₹)" htmlFor="invoice-amount" required>
            <Input
              id="invoice-amount"
              name="amount_rupees"
              required
              min="0"
              step="0.01"
              type="number"
              defaultValue={invoice.amount_minor / 100}
            />
          </Field>
          <Field label="Tax (₹)" htmlFor="invoice-tax" required>
            <Input
              id="invoice-tax"
              name="tax_rupees"
              required
              min="0"
              step="0.01"
              type="number"
              defaultValue={invoice.tax_minor / 100}
            />
          </Field>
          <Field label="Status" htmlFor="invoice-status">
            <Select id="invoice-status" name="status" defaultValue={statusSelectValue}>
              {derived ? (
                <option value="keep_derived">Keep current ({invoice.status}) — payment/due derived</option>
              ) : null}
              {!derived ? <option value="draft">Draft</option> : null}
              {!derived ? <option value="issued">Issued</option> : null}
              <option value="cancelled">Cancelled</option>
              <option value="written_off">Written off</option>
            </Select>
          </Field>
          <Field label="Notes" htmlFor="invoice-notes">
            <Textarea id="invoice-notes" name="notes" rows={4} defaultValue={invoice.notes || ''} />
          </Field>
          <Button type="submit" className="w-full">
            Save invoice
          </Button>
        </form>
      </Card>
    </PageShell>
  )
}
