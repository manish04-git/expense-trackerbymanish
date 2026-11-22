import { cn } from '@/utils/cn'

export function Card({ className, children, ...props }) {
  return <section className={cn('rounded-2xl border bg-surface p-5 shadow-sm', className)} {...props}>{children}</section>
}

export function CardHeader({ title, action, subtitle }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const TONES = { default: 'text-fg', success: 'text-primary', danger: 'text-danger', warning: 'text-warning' }

export function StatCard({ label, value, hint, icon: Icon, tone = 'default' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="size-4" aria-hidden="true" />}
      </div>
      <p className={cn('mt-2 truncate text-2xl font-semibold tabular-nums', TONES[tone])}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
    </Card>
  )
}

export function Badge({ children, tone = 'default', className }) {
  const tones = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    success: 'bg-primary/10 text-primary',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/15 text-amber-700 dark:text-amber-400',
  }
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>
}

export function ProgressBar({ value, max = 100, tone, label }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const auto = pct >= 100 ? 'bg-danger' : pct >= 75 ? 'bg-warning' : 'bg-primary'
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={cn('h-full rounded-full transition-all', tone || auto)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
