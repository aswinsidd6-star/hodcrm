import { cn } from '../../utils/cn'

const tones = {
  neutral: 'border-white/[0.08] bg-white/[0.035] text-zinc-400',
  success: 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300',
  warning: 'border-[#e4b85f]/25 bg-[#e4b85f]/[0.07] text-[#e4b85f]',
  danger: 'border-red-400/20 bg-red-400/[0.07] text-red-300',
  info: 'border-blue-400/20 bg-blue-400/[0.07] text-blue-300',
} as const

export function Badge({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: keyof typeof tones; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]', tones[tone], className)}>
      <span aria-hidden className="h-1 w-1 rounded-full bg-current opacity-80" />
      {children}
    </span>
  )
}

export function Alert({ children, tone = 'info', title }: { children: React.ReactNode; tone?: 'info' | 'success' | 'warning' | 'danger'; title?: string }) {
  const styles = {
    info: 'border-blue-400/15 bg-blue-400/[0.045] text-blue-100',
    success: 'border-emerald-400/15 bg-emerald-400/[0.045] text-emerald-100',
    warning: 'border-[#e4b85f]/20 bg-[#e4b85f]/[0.045] text-[#f3d995]',
    danger: 'border-red-400/15 bg-red-400/[0.045] text-red-100',
  } as const

  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', styles[tone])} role="status">
      {title ? <p className="font-medium text-inherit">{title}</p> : null}
      <div className={title ? 'mt-1 text-inherit/80' : undefined}>{children}</div>
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div aria-hidden className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-white/[0.11] bg-white/[0.018]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#e4b85f]/60 shadow-[0_0_12px_rgba(228,184,95,.45)]" />
      </div>
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
