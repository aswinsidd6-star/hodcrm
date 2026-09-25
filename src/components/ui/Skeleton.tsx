import { cn } from '../../utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-white/[0.045]', className)} />
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-5 sm:p-6 lg:p-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-3 border-b border-white/[0.055] pb-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}
