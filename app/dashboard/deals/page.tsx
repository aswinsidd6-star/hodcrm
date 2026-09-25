import Link from 'next/link'
import { requireAuthContext } from '../../../src/lib/auth/guard'
import { formatDate, formatINR } from '../../../src/utils/formatters'
import type { LeadEstimate, Opportunity } from '../../../src/types/crm'
import { PageHeader, PageShell } from '../../../src/components/ui/Page'
import { Card } from '../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../src/components/ui/Button'
import { Field, Input, Select } from '../../../src/components/ui/Field'
import { Badge, EmptyState } from '../../../src/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td } from '../../../src/components/ui/Table'

type DealsPageProps = { searchParams: Promise<{ q?: string; status?: string }> }

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const { q, status } = await searchParams
  const auth = await requireAuthContext()
  const { data, error } = await auth.supabase
    .from('opportunities')
    .select(
      `id, reference, title, lead_id, expected_close_date, contract_signed, advance_received, created_at, stage:opportunity_stages(id, key, name, is_won, is_lost), lead:leads(contact_name, company_name)`
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load deals: ${error.message}`)

  const deals = ((data || []) as unknown as Opportunity[])
    .filter((deal) => {
      if (status === 'lost') return Boolean(deal.stage?.is_lost)
      if (status === 'won') return Boolean(deal.stage?.is_won || deal.contract_signed)
      return Boolean(deal.stage?.is_won || deal.contract_signed || deal.stage?.is_lost)
    })
    .filter(
      (deal) =>
        !q ||
        `${deal.title} ${deal.lead?.company_name || ''} ${deal.lead?.contact_name || ''}`
          .toLowerCase()
          .includes(q.toLowerCase())
    )

  const leadIds = deals.map((d) => d.lead_id).filter(Boolean) as string[]
  let estimatesMap: Record<string, LeadEstimate> = {}
  if (leadIds.length > 0) {
    try {
      const { data: estimates } = await auth.supabase
        .from('lead_estimates')
        .select('*')
        .in('lead_id', leadIds)
      if (estimates) {
        estimatesMap = (estimates as unknown as LeadEstimate[]).reduce(
          (acc, est) => {
            acc[est.lead_id] = est
            return acc
          },
          {} as Record<string, LeadEstimate>
        )
      }
    } catch {
      /* estimate permission may be revoked */
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Deals"
        description="Won and contract-signed opportunities from the sales pipeline."
      />

      <Card className="!p-3 sm:!p-3">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field label="Search" htmlFor="deals-search">
              <Input
                id="deals-search"
                name="q"
                defaultValue={q || ''}
                placeholder="Search deals or customers"
              />
            </Field>
          </div>
          <div className="sm:w-44">
            <Field label="Status" htmlFor="deals-status">
              <Select id="deals-status" name="status" defaultValue={status || ''}>
                <option value="">Won and lost</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </Select>
            </Field>
          </div>
          <Button type="submit" className="sm:mb-0.5">
            Filter
          </Button>
        </form>
      </Card>

      <Card padding={false}>
        {deals.length === 0 ? (
          <EmptyState
            title="No deals match these filters"
            description="Won or contract-signed opportunities will appear here."
            action={<ButtonLink href="/dashboard/opportunities">View pipeline</ButtonLink>}
          />
        ) : (
          <Table minWidth="800px">
            <THead>
              <tr>
                <Th>Deal</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Estimate</Th>
                <Th>Expected close</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {deals.map((deal) => {
                const isWon = Boolean(deal.stage?.is_won || deal.contract_signed)
                const estimate = deal.lead_id ? estimatesMap[deal.lead_id] : null
                return (
                  <Tr key={deal.id}>
                    <Td>
                      <Link
                        href={`/dashboard/opportunities/${deal.id}`}
                        className="font-medium text-white hover:underline"
                      >
                        #{deal.reference} {deal.title}
                      </Link>
                    </Td>
                    <Td className="text-zinc-400">
                      {deal.lead?.company_name || deal.lead?.contact_name || 'Independent'}
                    </Td>
                    <Td>
                      <Badge tone={deal.stage?.is_lost ? 'danger' : 'success'}>
                        {deal.stage?.name || 'Contract signed'}
                      </Badge>
                    </Td>
                    <Td className="tabular-nums text-zinc-300">
                      {estimate ? formatINR(estimate.amount_minor) : '—'}
                    </Td>
                    <Td className="text-zinc-400">
                      {deal.expected_close_date ? formatDate(deal.expected_close_date) : 'Not set'}
                    </Td>
                    <Td align="right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <ButtonLink
                          href={`/dashboard/opportunities/${deal.id}`}
                          variant="ghost"
                          size="sm"
                        >
                          View
                        </ButtonLink>
                        {isWon && auth.hasMoneyAccess ? (
                          <ButtonLink
                            href={`/dashboard/invoices?opportunity_id=${deal.id}`}
                            variant="secondary"
                            size="sm"
                          >
                            Invoice
                          </ButtonLink>
                        ) : null}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </PageShell>
  )
}
