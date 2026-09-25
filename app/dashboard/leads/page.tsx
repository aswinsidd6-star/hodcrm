import Link from 'next/link'
import { requireAuthContext } from '../../../src/lib/auth/guard'
import { formatINR, formatDate, isPastDate } from '../../../src/utils/formatters'
import type { Lead, LeadEstimate } from '../../../src/types/crm'
import { PageShell, PageHeader } from '../../../src/components/ui/Page'
import { Card } from '../../../src/components/ui/Card'
import { ButtonLink } from '../../../src/components/ui/Button'
import { SearchInput } from '../../../src/components/ui/Field'
import { FilterTabs } from '../../../src/components/ui/Tabs'
import { EmptyState, Badge } from '../../../src/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td } from '../../../src/components/ui/Table'
import { PriorityBadge, ConfidenceBadge } from '../../../src/components/ui/StatusBadges'
import { cn } from '../../../src/utils/cn'

interface LeadsPageProps {
  searchParams: Promise<{
    q?: string
    priority?: string
  }>
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { q, priority } = await searchParams
  const auth = await requireAuthContext()
  const { supabase } = auth

  let query = supabase
    .from('leads')
    .select(`
      id,
      organization_id,
      reference,
      contact_name,
      company_name,
      designation,
      email,
      phone,
      whatsapp,
      city,
      industry,
      priority,
      service_of_interest,
      next_action,
      next_followup_at,
      created_at,
      owner:profiles!leads_owner_id_fkey (
        full_name,
        email
      )
    `)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
    query = query.eq('priority', priority)
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`
    query = query.or(
      `contact_name.ilike.${term},company_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`
    )
  }

  const { data: leadsData, error } = await query

  if (error) {
    throw new Error(`Unable to load leads: ${error.message}`)
  }

  const leads = (leadsData || []) as unknown as Lead[]

  const leadIds = leads.map((l) => l.id)
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
      // Graceful if leads.view_estimate is not granted
    }
  }

  const priorities = [
    { label: 'All', value: '' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ]

  const hasFilters = Boolean(q || priority)

  return (
    <PageShell>
      <PageHeader
        title="Leads"
        description="Track, qualify, and convert incoming prospects across all acquisition channels."
        actions={<ButtonLink href="/dashboard/leads/new">+ Add Lead</ButtonLink>}
      />

      <Card padding={false}>
        <div className="flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
          <form method="GET" action="/dashboard/leads" className="w-full max-w-md">
            <label htmlFor="leads-search" className="sr-only">
              Search leads
            </label>
            <SearchInput
              id="leads-search"
              defaultValue={q || ''}
              placeholder="Search contact, company, phone, email…"
            />
            {priority ? <input type="hidden" name="priority" value={priority} /> : null}
          </form>

          <FilterTabs
            ariaLabel="Priority filter"
            items={priorities.map((p) => ({
              label: p.label,
              href: `/dashboard/leads?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(p.value ? { priority: p.value } : {}),
              }).toString()}`,
              active: (priority || '') === p.value,
            }))}
          />
        </div>
      </Card>

      {leads.length > 0 ? (
        <Card padding={false}>
          <Table minWidth="720px">
            <THead>
              <tr>
                <Th>Ref</Th>
                <Th>Contact & company</Th>
                <Th>Priority</Th>
                <Th>Estimated value</Th>
                <Th>Next follow-up</Th>
                <Th>Service</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {leads.map((lead) => {
                const estimate = estimatesMap[lead.id]
                const isOverdue = isPastDate(lead.next_followup_at)

                return (
                  <Tr key={lead.id}>
                    <Td className="font-mono text-zinc-400">#{lead.reference}</Td>
                    <Td>
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="block font-medium text-white hover:underline"
                      >
                        {lead.contact_name}
                      </Link>
                      <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-zinc-500">
                        {lead.company_name || 'No company'}
                        {lead.city ? ` · ${lead.city}` : ''}
                      </p>
                    </Td>
                    <Td>
                      <PriorityBadge priority={lead.priority} />
                    </Td>
                    <Td className="tabular-nums text-zinc-200">
                      {estimate ? (
                        <div>
                          <span>{formatINR(estimate.amount_minor)}</span>
                          {estimate.confidence ? (
                            <span className="mt-1 block">
                              <ConfidenceBadge confidence={estimate.confidence} />
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </Td>
                    <Td>
                      {lead.next_followup_at ? (
                        <div>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-[11px] font-medium',
                              isOverdue ? 'text-red-300' : 'text-zinc-300'
                            )}
                          >
                            {isOverdue ? (
                              <Badge tone="danger" className="normal-case tracking-normal">
                                Overdue
                              </Badge>
                            ) : null}
                            {formatDate(lead.next_followup_at)}
                          </span>
                          {lead.next_action ? (
                            <p className="mt-0.5 max-w-[160px] truncate text-[10px] text-zinc-500">
                              {lead.next_action}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-zinc-600">No follow-up</span>
                      )}
                    </Td>
                    <Td className="text-zinc-300">{lead.service_of_interest || '—'}</Td>
                    <Td align="right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <ButtonLink href={`/dashboard/leads/${lead.id}`} variant="secondary" size="sm">
                          View
                        </ButtonLink>
                        <ButtonLink href={`/dashboard/leads/${lead.id}/edit`} variant="ghost" size="sm">
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
            title={hasFilters ? 'No matching leads found' : 'No leads captured yet'}
            description={
              hasFilters
                ? 'Try adjusting your search or priority filter.'
                : 'Add your first prospective client to kick off the sales pipeline.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {hasFilters ? (
                  <ButtonLink href="/dashboard/leads" variant="secondary">
                    Clear filters
                  </ButtonLink>
                ) : null}
                <ButtonLink href="/dashboard/leads/new">Add lead</ButtonLink>
              </div>
            }
          />
        </Card>
      )}
    </PageShell>
  )
}
