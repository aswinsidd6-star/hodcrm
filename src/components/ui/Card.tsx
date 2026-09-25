import type { ComponentProps } from 'react'
import Link from 'next/link'
import { cn } from '../../utils/cn'

export function Card({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.065] bg-gradient-to-br from-white/[0.045] via-white/[0.022] to-transparent shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition-all duration-300',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_0%_0%,rgba(228,184,95,0.045),transparent_35%)]',
        'hover:border-white/[0.095]',
        padding && 'p-5 sm:p-6',
        className,
      )}
    >
      <div className="relative z-10">{children}</div>
    </section>
  )
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/[0.055] pb-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-zinc-100">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="shrink-0">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = 'default',
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  href?: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const valueTone =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'warning'
        ? 'text-amber-300'
        : tone === 'danger'
          ? 'text-red-300'
          : 'text-zinc-50'

  const glow =
    tone === 'success'
      ? 'bg-emerald-400'
      : tone === 'warning'
        ? 'bg-amber-400'
        : tone === 'danger'
          ? 'bg-red-400'
          : 'bg-[#e4b85f]'

  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {label}
        </p>

        <span
          aria-hidden
          className={cn(
            'mt-1 h-1.5 w-1.5 rounded-full opacity-70 shadow-[0_0_9px_currentColor]',
            glow,
          )}
        />
      </div>

      <p
        className={cn(
          'mt-3 text-2xl font-semibold tracking-[-0.03em] tabular-nums sm:text-[28px]',
          valueTone,
        )}
      >
        {value}
      </p>

      {hint ? (
        <div className="mt-2 text-xs leading-relaxed text-zinc-600">
          {hint}
        </div>
      ) : null}
    </>
  )

  const className =
    'group relative block overflow-hidden rounded-2xl border border-white/[0.065] bg-gradient-to-br from-white/[0.045] via-white/[0.022] to-transparent p-5 shadow-[0_14px_45px_rgba(0,0,0,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#c9913c]/25 hover:shadow-[0_18px_55px_rgba(0,0,0,0.24)]'

  if (href) {
    return (
      <Link href={href} className={className}>
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#e4b85f]/[0.035] blur-2xl transition-opacity group-hover:opacity-100"
        />

        <div className="relative z-10">{inner}</div>
      </Link>
    )
  }

  return (
    <div className={className}>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#e4b85f]/[0.035] blur-2xl"
      />

      <div className="relative z-10">{inner}</div>
    </div>
  )
}

/** Alias used by product pages — same surface as StatCard. */
export function MetricCard(props: ComponentProps<typeof StatCard>) {
  return <StatCard {...props} />
}