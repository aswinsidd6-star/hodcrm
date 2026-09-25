import { FINANCE_ENVIRONMENT_VARIABLE, requireFinanceContext, requireFinanceMutationContext } from '../../../src/lib/finance/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { formatDate, formatINR, requirePositiveMinor } from '../../../src/utils/formatters'
import { PageHeader, PageShell } from '../../../src/components/ui/Page'
import { Card, CardHeader, MetricCard } from '../../../src/components/ui/Card'
import { Button } from '../../../src/components/ui/Button'
import { Field, Input, Select } from '../../../src/components/ui/Field'
import { Alert, Badge, EmptyState } from '../../../src/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td } from '../../../src/components/ui/Table'
import { FeedbackBanner } from '../../../src/components/ui/Feedback'
import { FilterTabs } from '../../../src/components/ui/Tabs'

async function createTransaction(formData: FormData) {
  'use server'
  const { auth, finance } = await requireFinanceMutationContext()
  if (!finance) throw new Error('Finance server access is not configured.')
  const direction = String(formData.get('direction') || '').trim()
  const amount = requirePositiveMinor(String(formData.get('amount_rupees') || ''), 'Transaction amount')
  const categoryId = String(formData.get('category_id') || '').trim() || null
  if (!['income', 'expense'].includes(direction)) throw new Error('Direction and a positive amount are required.')
  const { error } = await finance.from('transactions').insert({
    organization_id: auth.membership.organization_id,
    direction,
    amount_minor: amount,
    occurred_on: String(formData.get('occurred_on') || new Date().toISOString().slice(0, 10)),
    category_id: categoryId,
    description: String(formData.get('description') || '').trim() || null,
    method: String(formData.get('method') || 'bank_transfer'),
    reference: String(formData.get('reference') || '').trim() || null,
    recorded_by: auth.user.id,
  })
  if (error) throw new Error(`Unable to record transaction: ${error.message}`)
  revalidatePath('/dashboard/cash-flow')
  revalidatePath('/dashboard')
  redirect('/dashboard/cash-flow?notice=recorded')
}

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; direction?: string }>
}) {
  const { notice, direction } = await searchParams
  const { auth, finance } = await requireFinanceContext()
  if (!finance) {
    return (
      <PageShell width="narrow">
        <Alert tone="warning">
          Cash flow requires the server-only{' '}
          <code className="font-mono text-zinc-200">{FINANCE_ENVIRONMENT_VARIABLE}</code> environment variable.
        </Alert>
      </PageShell>
    )
  }

  let txnQuery = finance
    .from('transactions')
    .select('id, direction, amount_minor, occurred_on, description, method, payment_id, invoice_id, reference, voided_at')
    .eq('organization_id', auth.membership.organization_id)
    .is('voided_at', null)
    .order('occurred_on', { ascending: false })
    .limit(50)

  if (direction === 'income' || direction === 'expense') {
    txnQuery = txnQuery.eq('direction', direction)
  }

  const [{ data: monthly, error }, { data: categories, error: categoriesError }, { data: transactions, error: txnError }] =
    await Promise.all([
      finance
        .from('cash_flow_monthly')
        .select('*')
        .eq('organization_id', auth.membership.organization_id)
        .order('month', { ascending: false }),
      finance
        .from('transaction_categories')
        .select('id, direction, name')
        .eq('organization_id', auth.membership.organization_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      txnQuery,
    ])
  if (error) throw new Error(`Unable to load cash flow: ${error.message}`)
  if (categoriesError) throw new Error(`Unable to load transaction categories: ${categoriesError.message}`)
  if (txnError) throw new Error(`Unable to load transactions: ${txnError.message}`)

  const latest = monthly?.[0]
  const filterQs = (value: string) => (value ? `/dashboard/cash-flow?direction=${value}` : '/dashboard/cash-flow')

  return (
    <PageShell>
      <PageHeader
        title="Cash flow"
        description="Ledger income, expenses, and payment-linked receipts."
      />
      <FeedbackBanner notice={notice === 'recorded' ? 'recorded' : notice} />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Latest month income" value={formatINR(latest?.income_minor)} tone="success" />
        <MetricCard label="Latest month expenses" value={formatINR(latest?.expense_minor)} tone="danger" />
        <MetricCard
          label="Latest month net"
          value={formatINR(latest?.net_minor)}
          tone={Number(latest?.net_minor || 0) >= 0 ? 'success' : 'danger'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card padding={false}>
          <div className="border-b border-white/[0.055] p-5">
            <CardHeader title="Monthly summary" description="Aggregated from the finance ledger" />
          </div>
          {(monthly || []).length === 0 ? (
            <EmptyState
              title="No cash-flow months yet"
              description="Payments and ledger entries appear here after they are recorded."
            />
          ) : (
            <Table minWidth="560px">
              <THead>
                <tr>
                  <Th>Month</Th>
                  <Th>Income</Th>
                  <Th>Expenses</Th>
                  <Th>Net</Th>
                  <Th>Entries</Th>
                </tr>
              </THead>
              <TBody>
                {(monthly || []).map((row) => (
                  <Tr key={`${row.month}-${row.currency}`}>
                    <Td className="text-white">{formatDate(row.month)}</Td>
                    <Td className="tabular-nums text-emerald-300">{formatINR(row.income_minor)}</Td>
                    <Td className="tabular-nums text-red-300">{formatINR(row.expense_minor)}</Td>
                    <Td
                      className={`tabular-nums font-medium ${Number(row.net_minor) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}
                    >
                      {formatINR(row.net_minor)}
                    </Td>
                    <Td className="text-zinc-400">{row.entry_count}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Record ledger entry" description="Manual income or expense, separate from invoice receipts" />
          <form action={createTransaction} className="space-y-3">
            <Field label="Direction" htmlFor="cf-direction" required>
              <Select id="cf-direction" name="direction" required>
                <option value="">Select direction</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </Select>
            </Field>
            <Field label="Amount (₹)" htmlFor="cf-amount" required>
              <Input id="cf-amount" name="amount_rupees" required min="1" step="0.01" type="number" placeholder="Amount" />
            </Field>
            <Field label="Date" htmlFor="cf-occurred-on" required>
              <Input id="cf-occurred-on" name="occurred_on" required type="date" />
            </Field>
            <Field label="Category" htmlFor="cf-category">
              <Select id="cf-category" name="category_id">
                <option value="">No category</option>
                {(categories || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.direction} — {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Description" htmlFor="cf-description">
              <Input id="cf-description" name="description" placeholder="Description" />
            </Field>
            <Field label="Method" htmlFor="cf-method">
              <Select id="cf-method" name="method">
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Button type="submit" className="w-full">
              Record entry
            </Button>
          </form>
        </Card>
      </div>

      <Card padding={false}>
        <div className="flex flex-col gap-3 border-b border-white/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Recent transactions" description="Latest 50 ledger rows" />
          <FilterTabs
            ariaLabel="Direction filter"
            items={[
              { href: filterQs(''), label: 'All', active: !direction },
              { href: filterQs('income'), label: 'Income', active: direction === 'income' },
              { href: filterQs('expense'), label: 'Expense', active: direction === 'expense' },
            ]}
          />
        </div>
        {(transactions || []).length === 0 ? (
          <EmptyState title="No transactions in this view" description="Change the filter or record a ledger entry." />
        ) : (
          <Table minWidth="720px">
            <THead>
              <tr>
                <Th>Date</Th>
                <Th>Direction</Th>
                <Th>Amount</Th>
                <Th>Description</Th>
                <Th>Source</Th>
              </tr>
            </THead>
            <TBody>
              {(transactions || []).map((row) => (
                <Tr key={row.id}>
                  <Td className="text-zinc-400">{formatDate(row.occurred_on)}</Td>
                  <Td>
                    <Badge tone={row.direction === 'income' ? 'success' : 'danger'}>{row.direction}</Badge>
                  </Td>
                  <Td className="tabular-nums text-zinc-200">{formatINR(row.amount_minor)}</Td>
                  <Td className="max-w-[220px] truncate text-zinc-400">{row.description || row.reference || '—'}</Td>
                  <Td>
                    {row.payment_id ? (
                      <Badge tone="info">Invoice payment</Badge>
                    ) : (
                      <span className="text-zinc-600">Manual</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </PageShell>
  )
}
