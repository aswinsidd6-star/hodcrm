import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { FINANCE_ENVIRONMENT_VARIABLE, requireFinanceContext, requireFinanceMutationContext } from '../../../src/lib/finance/server'
import { formatDate, formatINR, requirePositiveMinor } from '../../../src/utils/formatters'
import { PageHeader, PageShell } from '../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../src/components/ui/Button'
import { Field, Input, Select } from '../../../src/components/ui/Field'
import { Alert, Badge, EmptyState } from '../../../src/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td } from '../../../src/components/ui/Table'
import { FeedbackBanner } from '../../../src/components/ui/Feedback'
import { ConfirmSubmitButton } from '../../../src/components/ui/ConfirmButton'

async function recordPayment(formData: FormData) {
  'use server'
  const { auth, finance } = await requireFinanceMutationContext()
  if (!finance) throw new Error('Finance server access is not configured.')

  const invoiceId = String(formData.get('invoice_id') || '').trim()
  const idempotencyKey = String(formData.get('idempotency_key') || '').trim()
  const amount = requirePositiveMinor(String(formData.get('amount_rupees') || ''), 'Payment amount')
  const method = String(formData.get('method') || 'bank_transfer')
  const paidOn = String(formData.get('paid_on') || new Date().toISOString().slice(0, 10))
  const reference = String(formData.get('reference') || '').trim() || null
  const acknowledgeDuplicate = formData.get('acknowledge_duplicate') === 'yes'
  const methods = ['bank_transfer', 'upi', 'cheque', 'cash', 'card', 'gateway', 'other']

  if (!invoiceId || !idempotencyKey || !methods.includes(method)) {
    throw new Error('Invoice, payment method, and positive amount are required.')
  }

  const { data: existingPayment } = await finance
    .from('payments')
    .select('id')
    .eq('organization_id', auth.membership.organization_id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existingPayment) {
    revalidatePath('/dashboard/payments')
    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/payments?notice=already_recorded')
  }

  if (!acknowledgeDuplicate) {
    const { data: similar } = await finance
      .from('payments')
      .select('id')
      .eq('organization_id', auth.membership.organization_id)
      .eq('invoice_id', invoiceId)
      .eq('amount_minor', amount)
      .eq('paid_on', paidOn)
      .limit(1)
      .maybeSingle()
    if (similar) {
      const params = new URLSearchParams({
        notice: 'possible_duplicate',
        invoice_id: invoiceId,
        amount_rupees: String(amount / 100),
        paid_on: paidOn,
        method,
      })
      if (reference) params.set('reference', reference)
      redirect(`/dashboard/payments?${params.toString()}`)
    }
  }

  const { error } = await finance.rpc('record_payment', {
    p_organization_id: auth.membership.organization_id,
    p_invoice_id: invoiceId,
    p_amount_minor: amount,
    p_paid_on: paidOn,
    p_method: method,
    p_reference: reference,
    p_idempotency_key: idempotencyKey,
    p_recorded_by: auth.user.id,
  })

  if (error) {
    if (error.code === '23505') {
      redirect('/dashboard/payments?notice=already_recorded')
    }
    if (error.message?.includes('payment_exceeds_outstanding')) {
      redirect('/dashboard/payments?error=exceeds_outstanding')
    }
    throw new Error(`Unable to record payment: ${error.message}`)
  }

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard/cash-flow')
  revalidatePath('/dashboard')
  redirect('/dashboard/payments?notice=recorded')
}

async function reversePayment(formData: FormData) {
  'use server'
  const { auth, finance } = await requireFinanceMutationContext()
  if (!finance) throw new Error('Finance server access is not configured.')
  const paymentId = String(formData.get('payment_id') || '').trim()
  if (!paymentId) throw new Error('Payment is required.')

  const { data: original } = await finance
    .from('payments')
    .select('id, invoice_id, amount_minor, method, paid_on')
    .eq('id', paymentId)
    .eq('organization_id', auth.membership.organization_id)
    .maybeSingle()
  if (!original) throw new Error('Payment not found in your organization.')
  if (Number(original.amount_minor) <= 0) {
    throw new Error('Only original receipts can be reversed.')
  }

  const { data: existingReversal } = await finance
    .from('payments')
    .select('id')
    .eq('reverses_id', original.id)
    .eq('organization_id', auth.membership.organization_id)
    .maybeSingle()
  if (existingReversal) {
    redirect('/dashboard/payments?notice=already_recorded')
  }

  const { error } = await finance.from('payments').insert({
    organization_id: auth.membership.organization_id,
    invoice_id: original.invoice_id,
    amount_minor: -Number(original.amount_minor),
    paid_on: new Date().toISOString().slice(0, 10),
    method: original.method,
    reference: `Reversal of ${original.id.slice(0, 8)}`,
    reverses_id: original.id,
    recorded_by: auth.user.id,
    idempotency_key: randomUUID(),
  })
  if (error) throw new Error(`Unable to reverse payment: ${error.message}`)

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/invoices/${original.invoice_id}`)
  revalidatePath('/dashboard/cash-flow')
  revalidatePath('/dashboard')
  redirect('/dashboard/payments?notice=reversed')
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string
    error?: string
    invoice_id?: string
    amount_rupees?: string
    paid_on?: string
    method?: string
    reference?: string
  }>
}) {
  const params = await searchParams
  const { auth, finance } = await requireFinanceContext()
  if (!finance) {
    return (
      <PageShell width="narrow">
        <Alert tone="warning">
          Finance access requires the server-only{' '}
          <code className="font-mono text-zinc-200">{FINANCE_ENVIRONMENT_VARIABLE}</code> environment variable.
        </Alert>
      </PageShell>
    )
  }

  const [{ data: payments, error: paymentsError }, { data: invoices, error: invoicesError }] = await Promise.all([
    finance
      .from('payments')
      .select('id, invoice_id, amount_minor, paid_on, method, reference, reverses_id')
      .eq('organization_id', auth.membership.organization_id)
      .order('paid_on', { ascending: false }),
    finance
      .from('invoice_balances')
      .select('invoice_id, number, outstanding_minor')
      .eq('organization_id', auth.membership.organization_id),
  ])
  if (paymentsError) throw new Error(`Unable to load payments: ${paymentsError.message}`)
  if (invoicesError) throw new Error(`Unable to load invoice balances: ${invoicesError.message}`)

  const reversedIds = new Set((payments || []).filter((p) => p.reverses_id).map((p) => p.reverses_id as string))
  const invoiceById = new Map((invoices || []).map((invoice) => [invoice.invoice_id, invoice]))
  const idempotencyKey = randomUUID()
  const needsDuplicateAck = params.notice === 'possible_duplicate'
  const selectedInvoice = params.invoice_id ? invoiceById.get(params.invoice_id) : null

  return (
    <PageShell>
      <PageHeader
        title="Payments"
        description="Record receipts against outstanding invoices. Matching cash-flow entries are created automatically."
        actions={<ButtonLink href="/dashboard/cash-flow" variant="secondary">Cash flow</ButtonLink>}
      />

      <FeedbackBanner notice={params.notice} error={params.error} />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card padding={false}>
          <div className="border-b border-white/[0.055] p-5">
            <CardHeader title="Payment history" description="Positive receipts and reversing rows" />
          </div>
          {(payments || []).length === 0 ? (
            <EmptyState
              title="No payments recorded"
              description="Record a receipt against an outstanding invoice. Repeat payments with different amounts or dates are treated as installments."
            />
          ) : (
            <Table minWidth="640px">
              <THead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Amount</Th>
                  <Th>Paid on</Th>
                  <Th>Method</Th>
                  <Th align="right">Action</Th>
                </tr>
              </THead>
              <TBody>
                {(payments || []).map((payment) => {
                  const invoice = invoiceById.get(payment.invoice_id)
                  const isReversal = Boolean(payment.reverses_id) || Number(payment.amount_minor) < 0
                  const alreadyReversed = reversedIds.has(payment.id)
                  return (
                    <Tr key={payment.id}>
                      <Td>
                        <ButtonLink
                          href={`/dashboard/invoices/${payment.invoice_id}`}
                          variant="ghost"
                          size="sm"
                          className="!px-0"
                        >
                          {invoice?.number || 'Invoice'}
                        </ButtonLink>
                      </Td>
                      <Td className={isReversal ? 'tabular-nums text-red-300' : 'tabular-nums text-emerald-300'}>
                        {formatINR(payment.amount_minor)}
                        {isReversal ? (
                          <span className="ml-2">
                            <Badge tone="danger">Reversal</Badge>
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-zinc-400">{formatDate(payment.paid_on)}</Td>
                      <Td className="text-zinc-400">{payment.method}</Td>
                      <Td align="right">
                        {!isReversal && !alreadyReversed ? (
                          <form action={reversePayment}>
                            <input type="hidden" name="payment_id" value={payment.id} />
                            <ConfirmSubmitButton message="Record a reversing payment of the same amount? This cannot be undone from this screen.">
                              Reverse
                            </ConfirmSubmitButton>
                          </form>
                        ) : alreadyReversed ? (
                          <span className="text-[11px] text-zinc-600">Reversed</span>
                        ) : (
                          <span className="text-[11px] text-zinc-600">—</span>
                        )}
                      </Td>
                    </Tr>
                  )
                })}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Record payment" description="Idempotent retries will not create duplicates." />
          {selectedInvoice ? (
            <p className="mb-3 text-xs text-zinc-400">
              Outstanding on {selectedInvoice.number}:{' '}
              <span className="tabular-nums text-amber-300">{formatINR(selectedInvoice.outstanding_minor)}</span>
            </p>
          ) : null}
          <form action={recordPayment} className="space-y-3">
            <input type="hidden" name="idempotency_key" value={idempotencyKey} />
            <Field label="Invoice" htmlFor="payment-invoice" required>
              <Select id="payment-invoice" required name="invoice_id" defaultValue={params.invoice_id || ''}>
                <option value="">Select invoice</option>
                {(invoices || [])
                  .filter((invoice) => Number(invoice.outstanding_minor) > 0)
                  .map((invoice) => (
                    <option key={invoice.invoice_id} value={invoice.invoice_id}>
                      {invoice.number} — {formatINR(invoice.outstanding_minor)} outstanding
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Amount (₹)" htmlFor="payment-amount" required>
              <Input
                id="payment-amount"
                name="amount_rupees"
                required
                min="1"
                step="0.01"
                type="number"
                defaultValue={params.amount_rupees || ''}
                placeholder="Amount"
              />
            </Field>
            <Field label="Paid on" htmlFor="payment-paid-on" required>
              <Input
                id="payment-paid-on"
                name="paid_on"
                required
                type="date"
                defaultValue={params.paid_on || ''}
              />
            </Field>
            <Field label="Method" htmlFor="payment-method">
              <Select id="payment-method" name="method" defaultValue={params.method || 'bank_transfer'}>
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
                <option value="gateway">Gateway</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Reference (optional)" htmlFor="payment-reference">
              <Input id="payment-reference" name="reference" defaultValue={params.reference || ''} />
            </Field>
            {needsDuplicateAck ? (
              <label className="flex items-start gap-2 rounded-xl border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
                <input type="checkbox" name="acknowledge_duplicate" value="yes" required className="mt-0.5" />
                <span>I confirm this is an additional legitimate payment, not a duplicate submission.</span>
              </label>
            ) : null}
            <Button type="submit" className="w-full">
              {needsDuplicateAck ? 'Confirm and record payment' : 'Record payment'}
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  )
}
