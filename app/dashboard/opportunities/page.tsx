import Link from 'next/link'
import { requireAuthContext } from '../../../src/lib/auth/guard'
import { formatINR, formatDate } from '../../../src/utils/formatters'
import type { Opportunity, OpportunityStage, LeadEstimate } from '../../../src/types/crm'
import { PageShell, PageHeader } from '../../../src/components/ui/Page'
import { Card } from '../../../src/components/ui/Card'
import { ButtonLink } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Field'
import { EmptyState, Badge } from '../../../src/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td } from '../../../src/components/ui/Table'
import { cn } from '../../../src/utils/cn'

interface OpportunitiesPageProps {
  searchParams: Promise<{
    q?: string
    stage?: string
  }>
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const { q, stage } = await searchParams
  const auth = await requireAuthContext()
  const { supabase } = auth

  const { data: stagesData } = await supabase
    .from('opportunity_stages')
    .select('*')
    .eq('organization_id', auth.membership.organization_id)
    .order('sort_order', { ascending: true })

  const stages = (stagesData || []) as unknown as OpportunityStage[]

  let query = supabase
    .from('opportunities')
    .select(`
      id,
      organization_id,
      reference,
      title,
      lead_id,
      company_id,
      service_of_interest,
      expected_close_date,
      next_action,
      contract_signed,
      advance_received,
      created_at,
      stage:opportunity_stages (
        id,
        key,
        name,
        is_won,
        is_lost
      ),
      lead:leads (
        id,
        contact_name,
        company_name,
        phone,
        email
      ),
      owner:profiles!opportunities_owner_id_fkey (
        full_name,
        email
      )
    `)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (stage && stage.trim()) {
    query = query.eq('stage_id', stage.trim())
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`
    query = query.or(`title.ilike.${term},service_of_interest.ilike.${term}`)
  }

  const { data: oppsData, error } = await query

  if (error) {
    throw new Error(`Unable to load opportunities: ${error.message}`)
  }

  const opportunities = (oppsData || []) as unknown as Opportunity[]

  const leadIds = opportunities.map((o) => o.lead_id).filter(Boolean) as string[]
  let estimatesMap: Record<string, LeadEstimate> = {}

  if (leadIds.length > 0) {
    try {
      const { data: estimates } = await supabase
        .from('lead_estimates')
        .select('*')
        .in('lead_id', leadIds)

      if (estimates) {
        estimatesMap = (estimates as unknown as LeadEstimate[]).reduce((acc, est) => {
          acc[est.lead_id] = est
          return acc
        }, {} as Record<string, LeadEstimate>)
      }
    } catch {
      // Graceful fallback if estimate viewing is restricted
    }
  }

  const hasFilters = Boolean(q || stage)

  return (
    <PageShell>
      <PageHeader
        title="Opportunities"
        description="Pipeline stages, qualified project proposals, and expected deal closures."
        actions={<ButtonLink href="/dashboard/opportunities/new">+ New opportunity</ButtonLink>}
      />

      <Card padding={false}>
        <div className="flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
          <form method="GET" action="/dashboard/opportunities" className="w-full max-w-md">
            <label htmlFor="opps-search" className="sr-only">
              Search opportunities
            </label>
            <Input
              id="opps-search"
              type="search"
              name="q"
              defaultValue={q || ''}
              placeholder="Search title or service…"
              className="mt-0"
            />
            {stage ? <input type="hidden" name="stage" value={stage} /> : null}
          </form>

          <div
            className="flex items-center gap-1 overflow-x-auto pb-0.5 md:pb-0"
            role="group"
            aria-label="Stage filter"
          >
            <Link
              href={`/dashboard/opportunities${q ? `?q=${encodeURIComponent(q)}` : ''}`}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition',
                !stage ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-white/[0.025] hover:text-white'
              )}
            >
              All stages
            </Link>
            {stages.map((st) => {
              const isSelected = stage === st.id
              return (
                <Link
                  key={st.id}
                  href={`/dashboard/opportunities?${new URLSearchParams({
                    ...(q ? { q } : {}),
                    stage: st.id,
                  }).toString()}`}
                  className={cn(
                    'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition',
                    isSelected
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-white/[0.025] hover:text-white'
                  )}
                >
                  {st.name}
                </Link>
              )
            })}
          </div>
        </div>
      </Card>

      {opportunities.length > 0 ? (
        <Card padding={false}>
          <Table minWidth="720px">
            <THead>
              <tr>
                <Th>Ref</Th>
                <Th>Title & client</Th>
                <Th>Pipeline stage</Th>
                <Th>Estimated value</Th>
                <Th>Expected close</Th>
                <Th>Flags</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {opportunities.map((opp) => {
                const estimate = opp.lead_id ? estimatesMap[opp.lead_id] : null
                const isWon = Boolean(opp.stage?.is_won)
                const isLost = Boolean(opp.stage?.is_lost)

                return (
                  <Tr key={opp.id}>
                    <Td className="font-mono text-zinc-400">#{opp.reference}</Td>
                    <Td>
                      <Link
                        href={`/dashboard/opportunities/${opp.id}`}
                        className="block font-medium text-white hover:underline"
                      >
                        {opp.title}
                      </Link>
                      <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-zinc-500">
                        {opp.lead?.company_name ||
                          opp.lead?.contact_name ||
                          'Independent opportunity'}
                      </p>
                    </Td>
                    <Td>
                      <Badge tone={isWon ? 'success' : isLost ? 'danger' : 'neutral'}>
                        {opp.stage?.name || 'In progress'}
                      </Badge>
                    </Td>
                    <Td className="tabular-nums text-zinc-200">
                      {estimate ? formatINR(estimate.amount_minor) : <span className="text-zinc-600">—</span>}
                    </Td>
                    <Td className="text-zinc-300">
                      {opp.expected_close_date ? formatDate(opp.expected_close_date) : '—'}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {opp.contract_signed ? <Badge tone="info">Contract</Badge> : null}
                        {opp.advance_received ? <Badge tone="success">Advance</Badge> : null}
                        {!opp.contract_signed && !opp.advance_received ? (
                          <span className="text-[11px] text-zinc-600">—</span>
                        ) : null}
                      </div>
                    </Td>
                    <Td align="right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <ButtonLink
                          href={`/dashboard/opportunities/${opp.id}`}
                          variant="secondary"
                          size="sm"
                        >
                          View
                        </ButtonLink>
                        <ButtonLink
                          href={`/dashboard/opportunities/${opp.id}/edit`}
                          variant="ghost"
                          size="sm"
                        >
                          Edit
                        </ButtonLink>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </TBody>
          </Table>
        </Card>
      ) : (
        <Card padding={false}>
          <EmptyState
            title={hasFilters ? 'No matching opportunities found' : 'No opportunities created yet'}
            description={
              hasFilters
                ? 'Try clearing filters or searching another title.'
                : 'Create an opportunity or convert an active lead from the Leads page.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {hasFilters ? (
                  <ButtonLink href="/dashboard/opportunities" variant="secondary">
                    Clear filters
                  </ButtonLink>
                ) : null}
                <ButtonLink href="/dashboard/opportunities/new">Create opportunity</ButtonLink>
              </div>
            }
          />
        </Card>
      )}
    </PageShell>
  )
}
