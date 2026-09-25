import Link from 'next/link'
import { cn } from '../../utils/cn'

const variants = {
primary:
  'border border-[#f4cf82] bg-[#e4b85f] text-[#171109] shadow-[0_6px_24px_rgba(228,184,95,0.22)] hover:bg-[#f4cf82] hover:shadow-[0_8px_30px_rgba(228,184,95,0.32)] focus-visible:ring-[#e4b85f]',
  secondary:
    'border border-white/[0.10] bg-white/[0.035] text-zinc-100 shadow-[0_4px_18px_rgba(0,0,0,0.12)] hover:border-[#c9913c]/30 hover:bg-white/[0.06] hover:text-white focus-visible:ring-[#e4b85f]',
  ghost:
    'text-zinc-400 hover:bg-white/[0.035] hover:text-zinc-100 focus-visible:ring-[#e4b85f]',
  danger:
    'border border-red-900/60 bg-red-950/30 text-red-200 hover:border-red-800/70 hover:bg-red-950/50 focus-visible:ring-red-500',
  success:
    'border border-emerald-400/20 bg-emerald-500/90 text-[#06100b] shadow-[0_5px_20px_rgba(16,185,129,0.12)] hover:bg-emerald-400 focus-visible:ring-emerald-400',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-xs sm:text-sm',
  lg: 'px-5 py-3 text-sm',
} as const

type Variant = keyof typeof variants
type Size = keyof typeof sizes

export function buttonClassName(
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string,
) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060606] disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]',
    variants[variant],
    sizes[size],
    className,
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  loading = false,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName(variant, size, className)}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          Working…
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
}: {
  href: string
  children: React.ReactNode
  variant?: Variant
  size?: Size
  className?: string
}) {
  return (
    <Link
      href={href}
      className={buttonClassName(variant, size, className)}
    >
      {children}
    </Link>
  )
}