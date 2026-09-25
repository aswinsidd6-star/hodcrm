import { cn } from '../../utils/cn'

export const fieldClass =
  'mt-1.5 h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-sm text-[#f7f3eb] placeholder:text-zinc-600 outline-none transition-all focus:border-[#e4b85f]/45 focus:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-[#e4b85f]/10 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red-400/50'

export function Field({ label, htmlFor, hint, error, children, required }: { label: string; htmlFor?: string; hint?: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
        {label}{required ? <span className="text-[#e4b85f]"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-[11px] leading-relaxed text-zinc-600">{hint}</p> : null}
      {error ? <p className="text-[11px] text-red-300" role="alert">{error}</p> : null}
    </div>
  )
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, className)} {...props}>{children}</select>
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, 'h-auto min-h-[5.5rem] resize-y py-2.5', className)} {...props} />
}

export function SearchInput({ id, name = 'q', defaultValue, placeholder = 'Search…', className }: { id: string; name?: string; defaultValue?: string; placeholder?: string; className?: string }) {
  return <Input id={id} type="search" name={name} defaultValue={defaultValue} placeholder={placeholder} className={cn('mt-0', className)} autoComplete="off" />
}
