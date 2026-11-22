import { forwardRef, useId } from 'react'
import { cn } from '@/utils/cn'

const base =
  'w-full rounded-lg border bg-surface px-3 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-2 focus:outline-primary/30 disabled:opacity-60'

export function Field({ label, error, hint, htmlFor, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>}
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export const Input = forwardRef(function Input({ label, error, hint, className, ...props }, ref) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={className}>
      <input id={id} ref={ref} aria-invalid={Boolean(error)} className={cn(base, 'h-10', error && 'border-danger')} {...props} />
    </Field>
  )
})

export const Select = forwardRef(function Select({ label, error, hint, className, children, ...props }, ref) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={className}>
      <select id={id} ref={ref} aria-invalid={Boolean(error)} className={cn(base, 'h-10', error && 'border-danger')} {...props}>
        {children}
      </select>
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, ...props }, ref) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={className}>
      <textarea id={id} ref={ref} rows={3} aria-invalid={Boolean(error)} className={cn(base, 'py-2', error && 'border-danger')} {...props} />
    </Field>
  )
})

/** Segmented control used for transaction type, category type, etc. */
export function Segmented({ options, value, onChange, className, label }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-1 rounded-lg border bg-bg p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-md text-sm font-medium transition-colors',
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700')}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform', checked && 'translate-x-5')} />
      </button>
    </label>
  )
}
