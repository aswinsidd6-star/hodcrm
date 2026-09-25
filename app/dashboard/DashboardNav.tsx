'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '../../src/utils/cn'
import { HodMark } from '../../src/components/ui/HodMark'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  isFinance?: boolean
}

interface DashboardNavProps {
  userEmail: string
  orgName: string
  roleName: string
  isOwner: boolean
  hasMoneyAccess: boolean
}

function Icon({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
        className,
      )}
    >
      {children}
    </span>
  )
}

const icons = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[17px] w-[17px]">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[17px] w-[17px]">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3.3 2.8-5 5.5-5s4.7 1.7 5.5 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17 14c2 .5 3.2 2.1 3.7 4" />
    </svg>
  ),
  opportunities: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[17px] w-[17px]">
      <path d="M4 18V6M4 18h16" />
      <path d="m7 15 4-4 3 2 5-6" />
      <path d="M16 7h3v3" />
    </svg>
  ),
  estimates: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[17px] w-[17px]">
      <path d="M7 3.5h8l3 3V20.5H7z" />
      <path d="M15 3.5v4h3M10 11h5M10 14h5M10 17h3" />
    </svg>
  ),
  deals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[17px] w-[17px]">
      <path d="m5 12 4 4L19 6" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  invoices: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[17px] w-[17px]">
      <path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 11.5h6M9 15h4" />
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[17px] w-[17px]">
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M3.5 9h17M7 14h3" />
    </svg>
  ),
  cash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[17px] w-[17px]">
      <path d="M4 18V8M9 18V5M14 18v-7M19 18V3" />
      <path d="M3 18h17" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[17px] w-[17px]">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M3.5 19c.7-3.3 2.5-5 5.5-5s4.8 1.7 5.5 5M15 14.5c2.4.2 3.9 1.7 4.5 4.5" />
    </svg>
  ),
}

const pipelineItems: NavItem[] = [
  { name: 'Overview', href: '/dashboard', icon: icons.overview },
  { name: 'Leads', href: '/dashboard/leads', icon: icons.leads },
  { name: 'Opportunities', href: '/dashboard/opportunities', icon: icons.opportunities },
  { name: 'Estimates', href: '/dashboard/estimates', icon: icons.estimates },
  { name: 'Deals', href: '/dashboard/deals', icon: icons.deals },
]

const financeItems: NavItem[] = [
  { name: 'Invoices', href: '/dashboard/invoices', icon: icons.invoices, isFinance: true },
  { name: 'Payments', href: '/dashboard/payments', icon: icons.payments, isFinance: true },
  { name: 'Cash Flow', href: '/dashboard/cash-flow', icon: icons.cash, isFinance: true },
]

const workspaceItems: NavItem[] = [
  { name: 'Team', href: '/dashboard/team', icon: icons.team },
]

export default function DashboardNav({
  userEmail,
  orgName,
  roleName,
  isOwner,
  hasMoneyAccess,
}: DashboardNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  function renderItem(item: NavItem) {
    const active = isActive(item.href)
    const locked = Boolean(item.isFinance && !hasMoneyAccess)

    const itemClass = cn(
      'group relative flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-all duration-200',
      active
        ? 'bg-gradient-to-r from-[#2a2114] via-[#211a11] to-transparent text-[#f4cf82] shadow-[inset_0_0_0_1px_rgba(228,184,95,0.13),0_8px_25px_rgba(0,0,0,0.18)]'
        : locked
          ? 'cursor-not-allowed text-zinc-700'
          : 'text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200',
    )

    if (locked) {
      return (
        <div
          key={item.name}
          role="link"
          aria-disabled="true"
          title="Requires money.view permission"
          className={itemClass}
        >
          <Icon className="text-zinc-700">{item.icon}</Icon>
          <span>{item.name}</span>
          <span className="ml-auto rounded-md border border-zinc-800/80 bg-black/20 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-zinc-700">
            Locked
          </span>
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={itemClass}
      >
        {active ? (
          <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#e4b85f] shadow-[0_0_10px_rgba(228,184,95,0.65)]" />
        ) : null}

        <Icon
          className={
            active
              ? 'bg-[#e4b85f]/10 text-[#f4cf82]'
              : 'text-zinc-600 group-hover:text-zinc-300'
          }
        >
          {item.icon}
        </Icon>

        <span className="font-medium">{item.name}</span>

        {item.isFinance ? (
          <span
            className={cn(
              'ml-auto rounded-md border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider',
              active
                ? 'border-[#8a5a2b]/40 bg-[#8a5a2b]/10 text-[#d9ae62]'
                : 'border-zinc-800 bg-black/20 text-zinc-700',
            )}
          >
            Finance
          </span>
        ) : null}
      </Link>
    )
  }

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="border-b border-white/[0.055] px-4 pb-5 pt-5">
        <Link
          href="/dashboard"
          className="group flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <HodMark size="md" showWordmark />
          <p className="ml-[-4px] truncate text-[10px] text-zinc-600">{orgName || 'Commercial OS'}</p>
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
        aria-label="Primary"
      >
        <div>
          <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-700">
            Pipeline
          </p>
          <div className="space-y-0.5">{pipelineItems.map(renderItem)}</div>
        </div>

        <div>
          <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-700">
            Finance
          </p>
          <div className="space-y-0.5">{financeItems.map(renderItem)}</div>
        </div>

        <div>
          <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-700">
            Workspace
          </p>
          <div className="space-y-0.5">{workspaceItems.map(renderItem)}</div>
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-white/[0.055] p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c9913c]/25 bg-[#8a5a2b]/10 text-xs font-semibold text-[#e4b85f]">
            {(userEmail?.[0] || 'A').toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-zinc-200">
              {userEmail}
            </p>

            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full shadow-[0_0_7px_currentColor]',
                  isOwner
                    ? 'bg-[#e4b85f] text-[#e4b85f]'
                    : 'bg-emerald-400 text-emerald-400',
                )}
              />
              <span className="text-[10px] text-zinc-600">{roleName}</span>
            </div>
          </div>
        </div>

        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-white/[0.11] hover:bg-white/[0.035] hover:text-zinc-300"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-[268px] shrink-0 border-r border-white/[0.055] bg-[#080807]/95 lg:flex lg:flex-col">
        {navContent}
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.055] bg-[#080807]/90 px-4 backdrop-blur-xl lg:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5"
        >
          <HodMark size="sm" showWordmark />
        </Link>

        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2 text-zinc-400 transition hover:border-[#c9913c]/30 hover:text-[#e4b85f]"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" id="mobile-nav">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          />

          <div className="relative z-10 h-full w-72 max-w-[85vw] border-r border-white/[0.07] bg-[#080807] shadow-[20px_0_80px_rgba(0,0,0,0.5)]">
            {navContent}
          </div>
        </div>
      ) : null}
    </>
  )
}