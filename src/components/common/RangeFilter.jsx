import { RANGE_PRESETS } from '@/utils/date'
import { Input } from './Field'
import { cn } from '@/utils/cn'

/** Preset chips + custom date inputs. `value` = { preset, start, end } (start/end = yyyy-MM-dd). */
export default function RangeFilter({ value, onChange, presets = RANGE_PRESETS }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-1 rounded-lg border bg-surface p-1">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={value.preset === p.value}
            onClick={() => onChange({ ...value, preset: p.value })}
            className={cn('h-8 rounded-md px-3 text-sm font-medium transition-colors', value.preset === p.value ? 'bg-primary text-white' : 'text-muted hover:text-fg')}
          >
            {p.label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="flex items-end gap-2">
          <Input label="From" type="date" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} />
          <Input label="To" type="date" value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} />
        </div>
      )}
    </div>
  )
}
