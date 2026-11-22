import { AlertTriangle, Loader2 } from 'lucide-react'
import Button from './Button'
import { cn } from '@/utils/cn'

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800', className)} />
}

export function Spinner({ className }) {
  return <Loader2 className={cn('size-5 animate-spin text-muted', className)} aria-label="Loading" />
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-4 lg:p-8" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  )
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14" />)}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
      {Icon && <span className="mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="size-6" /></span>}
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <AlertTriangle className="mb-2 size-8 text-danger" />
      <p className="text-sm">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  )
}
