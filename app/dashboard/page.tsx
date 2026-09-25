import Link from 'next/link'
import { requireAuthContext, getFinanceClient } from '../../src/lib/auth/guard'
import { formatINR, formatDate, isPastDate } from '../../src/utils/formatters'
import type { Lead, Opportunity } from '../../src/types/crm'
import { PageShell } from '../../src/components/ui/Page'
import { ButtonLink } from '../../src/components/ui/Button'
import { Alert, EmptyState } from '../../src/components/ui/Badge'
import { Card, CardHeader } from '../../src/components/ui/Card'
import { Table, THead, Th, TBody, Tr, Td } from '../../src/components/ui/Table'
import { PriorityBadge } from '../../src/components/ui/StatusBadges'

function Metric({
  label,
  value,
  hint,
  href,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  href?: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'warning'
        ? 'text-[#e4b85f]'
        : tone === 'danger'
          ? 'text-red-300'
          : 'text-white'

  const content = (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.065] bg-gradient-to-br from-white/[0.045] via-white/[0.02] to-transparent p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#c9913c]/25 hover:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#e4b85f]/[0.05] blur-3xl transition group-hover:bg-[#e4b85f]/[0.09]"
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>

          {href ? (
            <span className="text-zinc-700 transition group-hover:text-[#e4b85f]">
              ↗
            </span>
          ) : null}
        </div>

        <p
          className={`mt-3 text-[28px] font-semibold tracking-[-0.04em] tabular-nums ${valueClass}`}
        >
          {value}
        </p>

        {hint ? (
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a96f24]">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="text-sm font-semibold tracking-[-0.01em] text-zinc-100">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-xs text-zinc-600">
            {description}
          </p>
        ) : null}
      </div>

      {action}
    </div>
  )
}

function PipelineVisual({ opportunities }: { opportunities: Opportunity[] }) {
  const stages = Array.from(
    opportunities.reduce((map, opportunity) => {
      const stage = opportunity.stage
      if (!stage || stage.is_lost) return map
      const current = map.get(stage.id) || { name: stage.name, sort: stage.sort_order, count: 0 }
      current.count += 1
      map.set(stage.id, current)
      return map
    }, new Map<string, { name: string; sort: number; count: number }>()).values(),
  ).sort((a, b) => a.sort - b.sort)

  const max = Math.max(...stages.map((stage) => stage.count), 1)

  return (
    <Card className="lg:col-span-3">
      <CardHeader
        title="Pipeline movement"
        description="Live opportunity distribution by stage"
        action={
          <Link href="/dashboard/opportunities" className="text-xs font-medium text-zinc-500 transition hover:text-[#e4b85f]">
            Open pipeline →
          </Link>
        }
      />

      {stages.length === 0 ? (
        <EmptyState title="Pipeline is empty" description="Create an opportunity to see commercial movement here." action={<ButtonLink href="/dashboard/opportunities/new">Create opportunity</ButtonLink>} />
      ) : (
        <div className="mt-6 space-y-5">
          {stages.map((stage, index) => (
            <div key={stage.name} className="group">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e4b85f] shadow-[0_0_8px_rgba(228,184,95,.4)]" />
                  <span className="truncate text-xs font-medium text-zinc-300">{stage.name}</span>
                </div>
                <span className="font-mono text-xs tabular-nums text-zinc-500">{stage.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.045]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#8a5a2b] via-[#e4b85f] to-[#f4cf82] shadow-[0_0_12px_rgba(228,184,95,.18)] transition-all duration-500" style={{ width: `${Math.max((stage.count / max) * 100, 8)}%` }} />
              </div>
              {index < stages.length - 1 ? <div className="ml-[2px] mt-1 h-2 w-px bg-white/[0.045]" /> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default async function DashboardPage() {
  const auth = await requireAuthContext()
  const { supabase, hasMoneyAccess } = auth
  const organizationId = auth.membership.organization_id

  let dashboardError: string | null = null

  const {
    data: leadsData,
    count: totalLeads,
    error: leadsError,
  } = await supabase
    .from('leads')
    .select(
      'id, reference, contact_name, company_name, priority, next_followup_at, created_at',
      { count: 'exact' },
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(6)

  const recentLeads = (leadsData || []) as unknown as Lead[]

  if (leadsError) {
    dashboardError = 'Some lead metrics are unavailable.'
  }

  const { data: followUpData, error: followUpError } = await supabase
    .from('leads')
    .select(
      'id, reference, contact_name, company_name, priority, next_followup_at',
    )
    .is('archived_at', null)
    .not('next_followup_at', 'is', null)
    .order('next_followup_at', { ascending: true })
    .limit(8)

  const followUpLeads = (followUpData || []) as unknown as Lead[]

  if (followUpError) {
    dashboardError = 'Some lead metrics are unavailable.'
  }

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const {
    count: newLeadsCount,
    error: newLeadsError,
  } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .is('archived_at', null)
    .gte('created_at', sevenDaysAgo)

  if (newLeadsError) {
    dashboardError = 'Some lead metrics are unavailable.'
  }

  const overdueFollowUps = followUpLeads.filter((lead) =>
    isPastDate(lead.next_followup_at),
  ).length

  const {
    data: oppsData,
    count: totalOppsCount,
    error: opportunitiesError,
  } = await supabase
    .from('opportunities')
    .select(
      `id, reference, title, expected_close_date, contract_signed, advance_received, created_at,
      stage:opportunity_stages (id, key, name, is_won, is_lost)`,
      { count: 'exact' },
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  const allOpps = (oppsData || []) as unknown as Opportunity[]

  if (opportunitiesError) {
    dashboardError = 'Some opportunity metrics are unavailable.'
  }

  const activeOpps = allOpps.filter(
    (opportunity) =>
      !opportunity.stage?.is_won && !opportunity.stage?.is_lost,
  )

  const wonDeals = allOpps.filter(
    (opportunity) =>
      opportunity.stage?.is_won || opportunity.contract_signed,
  )

  let totalEstimatesCount = 0
  let totalEstimatedPipelineMinor = 0

  try {
    const {
      data: estimatesData,
      count: estCount,
      error: estimatesError,
    } = await supabase
      .from('lead_estimates')
      .select('amount_minor', { count: 'exact' })

    if (estimatesError) {
      dashboardError = 'Estimate metrics are currently unavailable.'
    }

    totalEstimatesCount = estCount || 0

    if (estimatesData) {
      totalEstimatedPipelineMinor = estimatesData.reduce(
        (
          accumulator: number,
          current: { amount_minor: number },
        ) => accumulator + (current.amount_minor || 0),
        0,
      )
    }
  } catch {
    // Estimate permission may be revoked.
  }

  let totalInvoicedMinor = 0
  let totalPaidMinor = 0
  let totalOutstandingMinor = 0
  let invoicesCount = 0
  let paymentsCount = 0
  let currentMonthNetMinor = 0
  let financeAvailable = false

  if (hasMoneyAccess) {
    const financeClient = getFinanceClient()

    if (financeClient) {
      financeAvailable = true

      try {
        const {
          data: invBalances,
          error: invoiceError,
        } = await financeClient
          .from('invoice_balances')
          .select('total_minor, paid_minor, outstanding_minor')
          .eq('organization_id', organizationId)

        if (invoiceError) throw invoiceError

        if (invBalances) {
          invoicesCount = invBalances.length

          for (const invoice of invBalances) {
            totalInvoicedMinor += Number(invoice.total_minor || 0)
            totalPaidMinor += Number(invoice.paid_minor || 0)
            totalOutstandingMinor += Number(
              invoice.outstanding_minor || 0,
            )
          }
        }

        const {
          count: pCount,
          error: paymentsError,
        } = await financeClient
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)

        if (paymentsError) throw paymentsError

        paymentsCount = pCount || 0

        const {
          data: monthlyData,
          error: cashFlowError,
        } = await financeClient
          .from('cash_flow_monthly')
          .select('net_minor')
          .eq('organization_id', organizationId)
          .order('month', { ascending: false })
          .limit(1)

        if (cashFlowError) throw cashFlowError

        if (monthlyData?.[0]) {
          currentMonthNetMinor = Number(
            monthlyData[0].net_minor || 0,
          )
        }
      } catch {
        dashboardError = 'Finance metrics are currently unavailable.'
      }
    }
  }

  const leadCount = totalLeads || 0

  const closingSoon = activeOpps
    .filter((opportunity) => opportunity.expected_close_date)
    .sort((a, b) =>
      String(a.expected_close_date).localeCompare(
        String(b.expected_close_date),
      ),
    )
    .slice(0, 5)

  const collectionRate =
    totalInvoicedMinor > 0
      ? Math.round(
          (totalPaidMinor / totalInvoicedMinor) * 100,
        )
      : 0

  return (
    <PageShell width="wide">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#c9913c]/20 bg-gradient-to-br from-[#19150e] via-[#0d0d0c] to-[#080808] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-40 h-[420px] w-[420px] rounded-full bg-[#e4b85f]/[0.07] blur-[100px]"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-80 bg-[#a96f24]/[0.035] blur-[80px]"
        />

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e4b85f] shadow-[0_0_10px_#e4b85f]" />
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#c9913c]">
                HOD Command Center
              </p>
            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#f7f3eb] sm:text-4xl lg:text-5xl">
              Good to see you.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Your commercial operation at a glance — pipeline,
              opportunities, collections, and the actions that need
              attention.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/dashboard/leads/new">
              + Add lead
            </ButtonLink>

            <ButtonLink
              href="/dashboard/opportunities/new"
              variant="secondary"
            >
              New opportunity
            </ButtonLink>
          </div>
        </div>

        <div className="relative z-10 mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4 backdrop-blur-sm">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Pipeline activity
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight text-white">
              {activeOpps.length}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              open opportunities · {newLeadsCount || 0} new leads
              this week
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4 backdrop-blur-sm">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Revenue billed
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight text-white">
              {formatINR(totalInvoicedMinor)}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              {invoicesCount} invoices · {collectionRate}% collected
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4 backdrop-blur-sm">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Attention
            </p>

            <p
              className={`mt-2 text-xl font-semibold tracking-tight ${
                overdueFollowUps > 0 || totalOutstandingMinor > 0
                  ? 'text-[#e4b85f]'
                  : 'text-emerald-300'
              }`}
            >
              {overdueFollowUps > 0
                ? `${overdueFollowUps} overdue`
                : totalOutstandingMinor > 0
                  ? 'Collections pending'
                  : 'All clear'}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              {totalOutstandingMinor > 0
                ? `${formatINR(totalOutstandingMinor)} outstanding`
                : 'No urgent items in your queue'}
            </p>
          </div>
        </div>
      </section>

      {dashboardError ? (
        <Alert tone="warning">
          {dashboardError} Other sections remain available.
        </Alert>
      ) : null}

      <div className="space-y-10">
        {/* COMMERCIAL */}
        <section>
          <SectionTitle
            eyebrow="Commercial"
            title="Business at a glance"
            description="The numbers that matter most right now."
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Active leads"
              value={leadCount}
              hint={`+${newLeadsCount || 0} this week`}
              href="/dashboard/leads"
            />

            <Metric
              label="Open opportunities"
              value={activeOpps.length}
              hint={`${totalOppsCount || 0} total`}
              href="/dashboard/opportunities"
            />

            <Metric
              label="Won deals"
              value={wonDeals.length}
              hint="Won commercial opportunities"
              tone="success"
              href="/dashboard/deals"
            />

            <Metric
              label="Estimated pipeline"
              value={formatINR(totalEstimatedPipelineMinor)}
              hint={`${totalEstimatesCount} estimates`}
              href="/dashboard/estimates"
            />
          </div>
        </section>

        {/* FINANCE */}
        {hasMoneyAccess && financeAvailable ? (
          <section>
            <SectionTitle
              eyebrow="Finance"
              title="Cash & collections"
              description="Current billing and cash position."
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Invoiced"
                value={formatINR(totalInvoicedMinor)}
                hint={`${invoicesCount} invoices`}
                href="/dashboard/invoices"
              />

              <Metric
                label="Collected"
                value={formatINR(totalPaidMinor)}
                hint={`${paymentsCount} payments`}
                tone="success"
                href="/dashboard/payments"
              />

              <Metric
                label="Outstanding"
                value={formatINR(totalOutstandingMinor)}
                hint={
                  totalOutstandingMinor > 0
                    ? 'Requires collection attention'
                    : 'Nothing outstanding'
                }
                tone={
                  totalOutstandingMinor > 0
                    ? 'warning'
                    : 'default'
                }
                href="/dashboard/invoices"
              />

              <Metric
                label="This month net"
                value={formatINR(currentMonthNetMinor)}
                hint="Latest cash-flow month"
                tone={
                  currentMonthNetMinor >= 0
                    ? 'success'
                    : 'danger'
                }
                href="/dashboard/cash-flow"
              />
            </div>
          </section>
        ) : hasMoneyAccess ? (
          <Alert tone="warning">
            Finance metrics need the server finance configuration.
          </Alert>
        ) : null}

        {/* LEADS + FOLLOW UPS */}
        <div className="grid gap-6 lg:grid-cols-5">
          <Card
            className="overflow-hidden lg:col-span-3"
            padding={false}
          >
            <div className="p-5 sm:p-6">
              <CardHeader
                title="Recent leads"
                description="Newest prospects entering the pipeline"
                action={
                  <Link
                    href="/dashboard/leads"
                    className="text-xs font-medium text-zinc-500 transition hover:text-[#e4b85f]"
                  >
                    View all →
                  </Link>
                }
              />
            </div>

            {recentLeads.length === 0 ? (
              <EmptyState
                title="No leads yet"
                description="Add your first prospect to start the pipeline."
                action={
                  <ButtonLink href="/dashboard/leads/new">
                    Add lead
                  </ButtonLink>
                }
              />
            ) : (
              <Table minWidth="520px">
                <THead>
                  <tr>
                    <Th>Lead</Th>
                    <Th>Priority</Th>
                    <Th>Follow-up</Th>
                    <Th align="right">Created</Th>
                  </tr>
                </THead>

                <TBody>
                  {recentLeads.map((lead) => (
                    <Tr key={lead.id}>
                      <Td>
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="font-medium text-white transition hover:text-[#e4b85f]"
                        >
                          {lead.contact_name}
                        </Link>

                        <p className="mt-0.5 text-[11px] text-zinc-600">
                          #{lead.reference}
                          {lead.company_name
                            ? ` · ${lead.company_name}`
                            : ''}
                        </p>
                      </Td>

                      <Td>
                        <PriorityBadge priority={lead.priority} />
                      </Td>

                      <Td
                        className={
                          isPastDate(lead.next_followup_at)
                            ? 'text-red-300'
                            : 'text-zinc-500'
                        }
                      >
                        {lead.next_followup_at
                          ? formatDate(lead.next_followup_at)
                          : '—'}
                      </Td>

                      <Td
                        align="right"
                        className="text-zinc-600"
                      >
                        {formatDate(lead.created_at)}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="Follow-up queue"
              description={
                overdueFollowUps > 0
                  ? `${overdueFollowUps} need attention now`
                  : 'Upcoming lead actions'
              }
              action={
                <Link
                  href="/dashboard/leads"
                  className="text-xs font-medium text-zinc-500 transition hover:text-[#e4b85f]"
                >
                  Leads →
                </Link>
              }
            />

            {followUpLeads.length === 0 ? (
              <EmptyState
                title="Queue is clear"
                description="Set a next follow-up on a lead to create an action here."
              />
            ) : (
              <ul className="mt-5 space-y-2">
                {followUpLeads.slice(0, 6).map((lead) => {
                  const overdue = isPastDate(
                    lead.next_followup_at,
                  )

                  return (
                    <li key={lead.id}>
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3 py-3 transition hover:border-[#c9913c]/20 hover:bg-white/[0.035]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-200 transition group-hover:text-white">
                            {lead.contact_name}
                          </p>

                          <p className="truncate text-[11px] text-zinc-600">
                            {lead.company_name || 'No company'}
                          </p>
                        </div>

                        <span
                          className={
                            overdue
                              ? 'shrink-0 rounded-full border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-[10px] font-medium text-red-300'
                              : 'shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-zinc-500'
                          }
                        >
                          {overdue
                            ? 'Overdue'
                            : formatDate(
                                lead.next_followup_at,
                              )}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* PIPELINE + CLOSING */}
        <div className="grid gap-6 lg:grid-cols-5">
          <PipelineVisual opportunities={allOpps} />

          <Card className="lg:col-span-2">
            <CardHeader
              title="Closing soon"
              description="Open opportunities with an expected close date"
              action={
                <Link href="/dashboard/opportunities" className="text-xs font-medium text-zinc-500 transition hover:text-[#e4b85f]">
                  Pipeline →
                </Link>
              }
            />

            {closingSoon.length === 0 ? (
              <EmptyState title="Nothing scheduled to close" description="Set expected close dates on active opportunities." />
            ) : (
              <ul className="mt-5 space-y-2">
                {closingSoon.map((opp) => (
                  <li key={opp.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3 py-3 transition hover:border-[#c9913c]/20 hover:bg-white/[0.03]">
                    <div className="min-w-0">
                      <Link href={`/dashboard/opportunities/${opp.id}`} className="truncate text-sm font-medium text-zinc-200 transition hover:text-[#e4b85f]">
                        #{opp.reference} {opp.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{opp.stage?.name || 'Active'}</p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">{formatDate(opp.expected_close_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Pipeline snapshot" description="Quick navigation across the commercial funnel" />
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Leads', value: leadCount, href: '/dashboard/leads' },
              { label: 'Opportunities', value: activeOpps.length, href: '/dashboard/opportunities' },
              { label: 'Estimates', value: totalEstimatesCount, href: '/dashboard/estimates' },
              { label: 'Won deals', value: wonDeals.length, href: '/dashboard/deals' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="group rounded-2xl border border-white/[0.055] bg-white/[0.018] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c9913c]/20 hover:bg-white/[0.035]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-zinc-600">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-zinc-100 transition group-hover:text-[#f4cf82]">{item.value}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}