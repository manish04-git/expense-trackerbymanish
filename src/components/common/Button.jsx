import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border bg-surface hover:bg-bg',
  ghost: 'hover:bg-black/5 dark:hover:bg-white/10',
  danger: 'bg-danger text-white hover:opacity-90',
}
const SIZES = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-base', icon: 'size-9 justify-center' }

export default function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, type = 'button', ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-60',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        VARIANTS[variant], SIZES[size], className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
