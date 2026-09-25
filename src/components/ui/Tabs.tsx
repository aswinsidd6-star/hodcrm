import Link from 'next/link'
import { cn } from '../../utils/cn'

export function FilterTabs({ items, ariaLabel }: { items: Array<{ href: string; label: string; active?: boolean }>; ariaLabel: string }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 md:pb-0" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <Link key={item.href + item.label} href={item.href} role="tab" aria-selected={item.active} className={cn('whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition', item.active ? 'border-[#e4b85f]/20 bg-[#e4b85f]/[0.08] text-[#f4cf82]' : 'border-transparent text-zinc-500 hover:border-white/[0.06] hover:bg-white/[0.025] hover:text-zinc-200')}>
          {item.label}
        </Link>
      ))}
    </div>
  )
}
