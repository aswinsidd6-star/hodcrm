export function HodMark({ size = 'md', showWordmark = false }: { size?: 'sm' | 'md' | 'lg'; showWordmark?: boolean }) {
  const box = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
  const text = size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`relative flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-[#e4b85f]/45 bg-[linear-gradient(145deg,#f4cf82_0%,#c9913c_42%,#6b421c_100%)] text-[#171109] shadow-[0_8px_28px_rgba(177,115,34,.22)]`}
      >
        <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]" fill="none">
          <path d="M8 7v18M24 7v18M8 16h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M12 7l4 7 4-7M12 25l4-7 4 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".65" />
        </svg>
        <span className="absolute inset-[1px] rounded-[10px] border border-white/25" />
      </span>
      {showWordmark ? (
        <span className="min-w-0">
          <span className={`block font-semibold tracking-[.02em] text-[#f7f3eb] ${text}`}>HOD</span>
          <span className="block text-[8px] font-semibold uppercase tracking-[.19em] text-[#a96f24]">House of Durables</span>
        </span>
      ) : null}
    </div>
  )
}
