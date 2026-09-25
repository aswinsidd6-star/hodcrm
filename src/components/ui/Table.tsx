import { cn } from '../../utils/cn'

export function Table({ children, minWidth = '640px' }: { children: React.ReactNode; minWidth?: string }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs" style={{ minWidth }}>{children}</table></div>
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-white/[0.055] bg-white/[0.018] text-[9px] uppercase tracking-[0.16em] text-zinc-600">{children}</thead>
}

export function Th({ children, className, align = 'left' }: { children: React.ReactNode; className?: string; align?: 'left' | 'right' }) {
  return <th className={cn('px-4 py-3 font-semibold sm:px-5', align === 'right' && 'text-right', className)}>{children}</th>
}

export function Td({ children, className, align = 'left' }: { children: React.ReactNode; className?: string; align?: 'left' | 'right' }) {
  return <td className={cn('px-4 py-3.5 align-middle sm:px-5', align === 'right' && 'text-right', className)}>{children}</td>
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-white/[0.045]">{children}</tbody>
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('transition-colors hover:bg-white/[0.018]', className)}>{children}</tr>
}
