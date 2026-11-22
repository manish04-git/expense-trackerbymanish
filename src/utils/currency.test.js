import { describe, expect, it } from 'vitest'
import { formatMoney, fromMinor, toMinor } from './currency'

describe('currency (integer minor units)', () => {
  it('parses decimal strings without floating point errors', () => {
    expect(toMinor('0.1', 'INR') + toMinor('0.2', 'INR')).toBe(30)
    expect(toMinor('1,234.50', 'INR')).toBe(123450)
    expect(toMinor('19.99', 'USD')).toBe(1999)
    expect(toMinor('100', 'INR')).toBe(10000)
    expect(toMinor('.5', 'INR')).toBeNull()
  })
  it('rejects invalid or over-precise input', () => {
    expect(toMinor('abc')).toBeNull()
    expect(toMinor('-5')).toBeNull()
    expect(toMinor('1.234')).toBeNull()
    expect(toMinor('1.230')).toBe(123)
    expect(toMinor('')).toBeNull()
  })
  it('round-trips to a plain string', () => {
    expect(fromMinor(123450)).toBe('1234.50')
    expect(fromMinor(5)).toBe('0.05')
    expect(fromMinor(-250)).toBe('-2.50')
    expect(toMinor(fromMinor(99999999))).toBe(99999999)
  })
  it('formats with the right symbol and Indian grouping', () => {
    expect(formatMoney(123456789, 'INR')).toContain('₹')
    expect(formatMoney(123456789, 'INR')).toContain('12,34,567.89')
    expect(formatMoney(1999, 'USD')).toBe('$19.99')
    expect(formatMoney(1999, 'GBP')).toContain('£')
    expect(formatMoney(1999, 'EUR')).toContain('€')
  })
})
