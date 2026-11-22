import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import useFormatters from '@/hooks/useFormatters'
import { CHART_COLORS } from '@/constants'

const AXIS = { fill: 'var(--muted)', fontSize: 12 }
const GRID = 'var(--border)'
const INCOME = '#16A34A'
const EXPENSE = '#DC2626'
const SAVINGS = '#2563EB'

function useChartMoney() {
  const f = useFormatters()
  return {
    tick: (v) => f.money(v, { compact: true }),
    tip: (v) => f.money(v),
  }
}

const tooltipStyle = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--text)' },
  labelStyle: { color: 'var(--text)', fontWeight: 600 },
  itemStyle: { color: 'var(--text)' },
}

export function ChartFrame({ height = 260, empty, children }) {
  if (empty) return <div className="grid place-items-center text-sm text-muted" style={{ height }}>No data for this period</div>
  return <div style={{ height }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
}

export function IncomeExpenseChart({ data }) {
  const m = useChartMoney()
  const empty = !data.some((d) => d.income || d.expense)
  return (
    <ChartFrame empty={empty}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={m.tick} width={56} />
        <Tooltip formatter={m.tip} cursor={{ fill: 'rgba(100,116,139,.1)' }} {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill={INCOME} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill={EXPENSE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  )
}

export function CategoryPie({ data, height = 260 }) {
  const m = useChartMoney()
  return (
    <ChartFrame height={height} empty={data.length === 0}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
          {data.map((d, i) => <Cell key={d.name} fill={d.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={m.tip} {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartFrame>
  )
}

export function TrendLine({ data, lines }) {
  const m = useChartMoney()
  const empty = !data.some((d) => lines.some((l) => d[l.key]))
  return (
    <ChartFrame empty={empty}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={m.tick} width={56} />
        <Tooltip formatter={m.tip} {...tooltipStyle} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lines.map((l) => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ChartFrame>
  )
}

export function AreaTrend({ data, dataKey = 'expense', name = 'Expense', color = EXPENSE }) {
  const m = useChartMoney()
  const gradientId = `grad-${dataKey}`
  return (
    <ChartFrame empty={!data.some((d) => d[dataKey])}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={m.tick} width={56} />
        <Tooltip formatter={m.tip} {...tooltipStyle} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ChartFrame>
  )
}

export function SimpleBar({ data, dataKey, name, color = SAVINGS }) {
  const m = useChartMoney()
  return (
    <ChartFrame empty={!data.some((d) => d[dataKey])}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={m.tick} width={56} />
        <Tooltip formatter={m.tip} cursor={{ fill: 'rgba(100,116,139,.1)' }} {...tooltipStyle} />
        <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  )
}

export const CHART_SERIES = { INCOME, EXPENSE, SAVINGS }
