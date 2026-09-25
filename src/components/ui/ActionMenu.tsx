'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../utils/cn'
import { buttonClassName } from './Button'

export function ActionMenu({ label = 'Actions', items }: { label?: string; items: Array<{ href?: string; label: string; onSelect?: () => void; destructive?: boolean }> }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    const onPointer = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onPointer) }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button type="button" className={buttonClassName('secondary', 'sm')} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        {label}
        <span aria-hidden className="text-zinc-500">⌄</span>
      </button>
      {open ? (
        <ul id={id} role="menu" className="absolute right-0 z-30 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-white/[0.09] bg-[#0d0d0c]/95 p-1 shadow-[0_18px_55px_rgba(0,0,0,.45)] backdrop-blur-xl">
          {items.map((item) => (
            <li key={item.label} role="none">
              {item.href ? (
                <a href={item.href} role="menuitem" className={cn('block rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/[0.045] hover:text-zinc-100', item.destructive && 'text-red-300 hover:bg-red-950/30')} onClick={() => setOpen(false)}>{item.label}</a>
              ) : (
                <button type="button" role="menuitem" className={cn('block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-400 transition hover:bg-white/[0.045] hover:text-zinc-100', item.destructive && 'text-red-300 hover:bg-red-950/30')} onClick={() => { item.onSelect?.(); setOpen(false) }}>{item.label}</button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
