import { describe, expect, it } from 'vitest'
import { dateKey, financialYearRange, getRange, inRangeKey, nextOnOrAfter, occurrence, recentWindow } from './date'

describe('date ranges', () => {
  const now = new Date(2026, 10, 22) // Sun 22 Nov 2026
  it('this month', () => {
    const r = getRange('month', { now })
    expect([r.startKey, r.endKey]).toEqual(['2026-11-01', '2026-11-30'])
  })
  it('this week starts on Monday', () => {
    const r = getRange('week', { now })
    expect([r.startKey, r.endKey]).toEqual(['2026-11-16', '2026-11-22'])
  })
  it('today / year / last month', () => {
    expect(getRange('today', { now }).startKey).toBe('2026-11-22')
    expect(getRange('year', { now }).endKey).toBe('2026-12-31')
    expect(getRange('lastMonth', { now }).startKey).toBe('2026-10-01')
  })
  it('Indian financial year runs April to March', () => {
    expect(getRange('fy', { now, fyStartMonth: 4 })).toMatchObject({ startKey: '2026-04-01', endKey: '2027-03-31' })
    const early = financialYearRange(new Date(2026, 1, 10), 4)
    expect([dateKey(early.start), dateKey(early.end)]).toEqual(['2025-04-01', '2026-03-31'])
  })
  it('custom range is inclusive and order-insensitive', () => {
    const r = getRange('custom', { now, customStart: '2026-11-10', customEnd: '2026-11-01' })
    expect([r.startKey, r.endKey]).toEqual(['2026-11-01', '2026-11-10'])
    expect(inRangeKey('2026-11-10', r.startKey, r.endKey)).toBe(true)
    expect(inRangeKey('2026-11-11', r.startKey, r.endKey)).toBe(false)
  })
  it('recent window = previous month start to current month end', () => {
    expect(recentWindow(now)).toEqual({ startKey: '2026-10-01', endKey: '2026-11-30' })
  })
})

describe('recurrence', () => {
  it('monthly occurrences stay anchored on the start day (no drift after Feb)', () => {
    expect(dateKey(occurrence('2026-01-31', 'monthly', 1))).toBe('2026-02-28')
    expect(dateKey(occurrence('2026-01-31', 'monthly', 2))).toBe('2026-03-31')
  })
  it('weekly / daily / yearly', () => {
    expect(dateKey(occurrence('2026-11-01', 'weekly', 2))).toBe('2026-11-15')
    expect(dateKey(occurrence('2026-11-01', 'daily', 30))).toBe('2026-12-01')
    expect(dateKey(occurrence('2026-02-28', 'yearly', 1))).toBe('2027-02-28')
  })
  it('finds the next payment on or after a date', () => {
    expect(nextOnOrAfter('2026-01-15', 'monthly', new Date(2026, 10, 22)).key).toBe('2026-12-15')
    expect(nextOnOrAfter('2026-11-22', 'monthly', new Date(2026, 10, 22)).key).toBe('2026-11-22')
  })
})
