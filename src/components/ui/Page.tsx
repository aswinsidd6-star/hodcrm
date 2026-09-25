import Link from 'next/link'
import { cn } from '../../utils/cn'

export function PageShell({ children, className, width = 'default' }: { children: React.ReactNode; className?: string; width?: 'default' | 'narrow' | 'wide' }) {
  const max = width === 'narrow' ? 'max-w-3xl' : width === 'wide' ? 'max-w-[90rem]' : 'max-w-7xl'
  return <div className={cn('mx-auto w-full space-y-8 px-5 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-10', max, className)}>{children}</div>
}

export function PageHeader({ title, description, actions, breadcrumb }: { title: string; description?: string; actions?: React.ReactNode; breadcrumb?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-5 border-b border-white/[0.055] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2.5">
        {breadcrumb}
        <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#e4b85f] shadow-[0_0_9px_rgba(228,184,95,.55)]" /><span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#a96f24]">HOD workspace</span></div>
        <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[#f7f3eb] sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-sm font-semibold tracking-[-0.01em] text-zinc-100">{title}</h2>{description ? <p className="mt-1 text-xs leading-relaxed text-zinc-600">{description}</p> : null}</div>{action}</div>
}

export function Breadcrumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
  return <nav aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">{items.map((item, index) => { const last = index === items.length - 1; return <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">{index > 0 ? <span aria-hidden className="text-zinc-800">/</span> : null}{item.href && !last ? <Link href={item.href} className="transition hover:text-zinc-300">{item.label}</Link> : <span className={last ? 'text-zinc-500' : undefined} aria-current={last ? 'page' : undefined}>{item.label}</span>}</li> })}</ol></nav>
}
