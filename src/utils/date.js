import {
  format, parse, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subMonths, addDays, addWeeks, addMonths, addYears, eachDayOfInterval,
  eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval, differenceInCalendarDays, differenceInCalendarMonths,
  differenceInCalendarYears, isBefore,
} from 'date-fns'

// Transactions are bucketed by a timezone-neutral "yyyy-MM-dd" key (dateKey).
export const KEY_FORMAT = 'yyyy-MM-dd'
export const dateKey = (d) => format(d, KEY_FORMAT)
export const parseKey = (k) => parse(k, KEY_FORMAT, new Date())
export const todayKey = () => dateKey(new Date())
export const monthKey = (d) => format(d, 'yyyy-MM')
export const formatKey = (k, fmt = 'dd MMM yyyy') => (k ? format(parseKey(k), fmt) : '')
export const inRangeKey = (k, startKey, endKey) => k >= startKey && k <= endKey

const WEEK = { weekStartsOn: 1 }

export function financialYearRange(now = new Date(), startMonth = 4) {
  const month = now.getMonth() + 1
  const startYear = month >= startMonth ? now.getFullYear() : now.getFullYear() - 1
  const start = new Date(startYear, startMonth - 1, 1)
  return { start, end: endOfMonth(addMonths(start, 11)) }
}

export const RANGE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'fy', label: 'Financial year' },
  { value: 'custom', label: 'Custom' },
]

export function getRange(preset, { now = new Date(), fyStartMonth = 4, customStart, customEnd } = {}) {
  let start
  let end
  switch (preset) {
    case 'today':
      start = startOfDay(now); end = endOfDay(now); break
    case 'week':
      start = startOfWeek(now, WEEK); end = endOfWeek(now, WEEK); break
    case 'lastMonth': {
      const last = subMonths(now, 1)
      start = startOfMonth(last); end = endOfMonth(last); break
    }
    case 'year':
      start = startOfYear(now); end = endOfYear(now); break
    case 'fy': {
      const fy = financialYearRange(now, fyStartMonth)
      start = fy.start; end = fy.end; break
    }
    case 'custom':
      start = customStart ? startOfDay(parseKey(customStart)) : startOfMonth(now)
      end = customEnd ? endOfDay(parseKey(customEnd)) : endOfDay(now)
      if (isBefore(end, start)) [start, end] = [startOfDay(end), endOfDay(start)]
      break
    default:
      start = startOfMonth(now); end = endOfMonth(now)
  }
  return { preset, start, end, startKey: dateKey(start), endKey: dateKey(end) }
}

export function budgetRange(budget, now = new Date()) {
  let start
  let end
  if (budget.period === 'weekly') {
    start = startOfWeek(now, WEEK); end = endOfWeek(now, WEEK)
  } else if (budget.period === 'custom') {
    start = parseKey(budget.startDate); end = parseKey(budget.endDate)
  } else {
    start = startOfMonth(now); end = endOfMonth(now)
  }
  return { start, end, startKey: dateKey(start), endKey: dateKey(end) }
}

/** Last n calendar months, oldest first. */
export function monthsBack(n, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = subMonths(now, n - 1 - i)
    return { key: monthKey(d), label: format(d, 'MMM yy'), start: startOfMonth(d), end: endOfMonth(d), date: d }
  })
}

/** Window kept in a single live listener: previous month start -> current month end. */
export function recentWindow(now = new Date()) {
  return { startKey: dateKey(startOfMonth(subMonths(now, 1))), endKey: dateKey(endOfMonth(now)) }
}

export const daysInRange = (startKey, endKey) => differenceInCalendarDays(parseKey(endKey), parseKey(startKey)) + 1
export const eachDayKeys = (startKey, endKey) =>
  eachDayOfInterval({ start: parseKey(startKey), end: parseKey(endKey) }).map(dateKey)
export const weekStartKey = (k) => dateKey(startOfWeek(parseKey(k), WEEK))

export function granularityFor(days) {
  if (days <= 31) return 'day'
  if (days <= 120) return 'week'
  return 'month'
}

/** Zero-filled bucket keys + labels between two date keys. */
export function bucketsBetween(startKey, endKey, granularity) {
  const start = parseKey(startKey)
  const end = parseKey(endKey)
  if (granularity === 'day') return eachDayOfInterval({ start, end }).map((d) => ({ key: dateKey(d), label: format(d, 'd MMM') }))
  if (granularity === 'week') {
    return eachWeekOfInterval({ start, end }, WEEK).map((d) => ({ key: dateKey(d), label: format(d, 'd MMM') }))
  }
  if (granularity === 'year') return eachYearOfInterval({ start, end }).map((d) => ({ key: format(d, 'yyyy'), label: format(d, 'yyyy') }))
  return eachMonthOfInterval({ start, end }).map((d) => ({ key: monthKey(d), label: format(d, 'MMM yy') }))
}

export const bucketKeyFor = (k, granularity) =>
  granularity === 'day' ? k : granularity === 'week' ? weekStartKey(k) : granularity === 'year' ? k.slice(0, 4) : k.slice(0, 7)

/** n-th occurrence of a repeating schedule, anchored on the start date (no month-end drift). */
export function occurrence(startKey, frequency, n) {
  const s = parseKey(startKey)
  switch (frequency) {
    case 'daily': return addDays(s, n)
    case 'weekly': return addWeeks(s, n)
    case 'quarterly': return addMonths(s, 3 * n)
    case 'yearly': return addYears(s, n)
    default: return addMonths(s, n)
  }
}

/** First occurrence on/after `from` (used for subscription reminders). */
export function nextOnOrAfter(startKey, frequency, from = new Date()) {
  const s = parseKey(startKey)
  let n = 0
  if (frequency === 'daily') n = Math.max(0, differenceInCalendarDays(from, s))
  else if (frequency === 'weekly') n = Math.max(0, Math.floor(differenceInCalendarDays(from, s) / 7))
  else if (frequency === 'quarterly') n = Math.max(0, Math.floor(differenceInCalendarMonths(from, s) / 3) - 1)
  else if (frequency === 'yearly') n = Math.max(0, differenceInCalendarYears(from, s) - 1)
  else n = Math.max(0, differenceInCalendarMonths(from, s) - 1)
  let d = occurrence(startKey, frequency, n)
  while (isBefore(d, startOfDay(from))) {
    n += 1
    d = occurrence(startKey, frequency, n)
  }
  return { date: d, key: dateKey(d), n }
}
