import { describe, expect, it } from 'vitest'
import {
  accountSummaries, alertLevel, balanceDeltas, budgetProgress, buildSeries, categoryExpenseTotals,
  monthlyEquivalent, netDeltas, summarize, sumBalances,
} from './calculations'

const tx = (o) => ({ id: Math.random().toString(36), accountId: 'bank', categoryId: 'food', dateKey: '2026-11-10', ...o })

describe('income / expense / refund / transfer', () => {
  const txs = [
    tx({ type: 'income', amount: 100000, categoryId: 'salary' }),
    tx({ type: 'expense', amount: 30000 }),
    tx({ type: 'expense', amount: 20000 }),
    tx({ type: 'refund', amount: 5000 }),
    tx({ type: 'transfer', amount: 40000, toAccountId: 'cash', categoryId: null }),
  ]
  const s = summarize(txs)
  it('counts income only from income transactions', () => expect(s.income).toBe(100000))
  it('nets refunds against expenses', () => {
    expect(s.grossExpense).toBe(50000)
    expect(s.refund).toBe(5000)
    expect(s.expense).toBe(45000)
  })
  it('computes savings', () => expect(s.savings).toBe(55000))
  it('never counts transfers as income or expense', () => {
    expect(s.transferVolume).toBe(40000)
    expect(summarize([tx({ type: 'transfer', amount: 999, toAccountId: 'cash' })]).expense).toBe(0)
    expect(summarize([tx({ type: 'transfer', amount: 999, toAccountId: 'cash' })]).income).toBe(0)
  })
  it('subtracts refunds from their category', () => {
    expect(categoryExpenseTotals(txs).food).toBe(45000)
  })
})

describe('account balances', () => {
  it('income and refund add, expense subtracts', () => {
    expect(balanceDeltas({ type: 'income', amount: 100, accountId: 'a' })).toEqual({ a: 100 })
    expect(balanceDeltas({ type: 'refund', amount: 100, accountId: 'a' })).toEqual({ a: 100 })
    expect(balanceDeltas({ type: 'expense', amount: 100, accountId: 'a' })).toEqual({ a: -100 })
  })
  it('a transfer moves money and leaves net worth unchanged', () => {
    const d = balanceDeltas({ type: 'transfer', amount: 500, accountId: 'a', toAccountId: 'b' })
    expect(d).toEqual({ a: -500, b: 500 })
    expect(Object.values(d).reduce((x, y) => x + y, 0)).toBe(0)
  })
  it('editing a transaction applies only the difference', () => {
    const before = { type: 'expense', amount: 1000, accountId: 'a' }
    const after = { type: 'expense', amount: 1500, accountId: 'a' }
    expect(netDeltas(before, after)).toEqual({ a: -500 })
    expect(netDeltas(before, { ...before, accountId: 'b' })).toEqual({ a: 1000, b: -1000 })
    expect(netDeltas(before, before)).toEqual({})
  })
  it('deleting reverses the effect', () => {
    expect(netDeltas({ type: 'expense', amount: 700, accountId: 'a' }, null)).toEqual({ a: 700 })
  })
  it('stays consistent across a sequence of operations', () => {
    const balances = { bank: 100000, cash: 0 }
    const apply = (d) => Object.entries(d).forEach(([k, v]) => { balances[k] += v })
    apply(balanceDeltas({ type: 'expense', amount: 25000, accountId: 'bank' }))
    apply(balanceDeltas({ type: 'transfer', amount: 10000, accountId: 'bank', toAccountId: 'cash' }))
    apply(balanceDeltas({ type: 'refund', amount: 5000, accountId: 'bank' }))
    apply(netDeltas({ type: 'expense', amount: 25000, accountId: 'bank' }, { type: 'expense', amount: 20000, accountId: 'bank' }))
    expect(balances).toEqual({ bank: 100000 - 25000 - 10000 + 5000 + 5000, cash: 10000 })
  })
  it('credit card purchases and repayments are not double counted', () => {
    const accounts = [{ type: 'savings', balance: 100000 }, { type: 'credit_card', balance: 0 }]
    const spend = [tx({ type: 'expense', amount: 30000, accountId: 'card' })]
    accounts[1].balance += balanceDeltas(spend[0]).card
    expect(sumBalances(accounts)).toEqual({ assets: 100000, creditOutstanding: 30000, netWorth: 70000 })
    const repay = tx({ type: 'transfer', amount: 30000, accountId: 'bank', toAccountId: 'card' })
    const d = balanceDeltas(repay)
    accounts[0].balance += d.bank
    accounts[1].balance += d.card
    expect(sumBalances(accounts)).toEqual({ assets: 70000, creditOutstanding: 0, netWorth: 70000 })
    expect(summarize([...spend, repay]).expense).toBe(30000)
  })
  it('summarises per account', () => {
    const r = accountSummaries([tx({ type: 'transfer', amount: 10, toAccountId: 'cash' }), tx({ type: 'expense', amount: 5 })])
    expect(r.bank).toMatchObject({ transferOut: 10, expense: 5 })
    expect(r.cash.transferIn).toBe(10)
  })
})

describe('budgets', () => {
  const now = new Date(2026, 10, 15)
  const txs = [
    tx({ type: 'expense', amount: 6000, categoryId: 'food', dateKey: '2026-11-03' }),
    tx({ type: 'expense', amount: 2000, categoryId: 'shop', dateKey: '2026-11-05' }),
    tx({ type: 'refund', amount: 1000, categoryId: 'food', dateKey: '2026-11-06' }),
    tx({ type: 'expense', amount: 9999, categoryId: 'food', dateKey: '2026-10-30' }),
  ]
  it('overall monthly budget only counts this month, net of refunds', () => {
    const p = budgetProgress({ kind: 'overall', period: 'monthly', amount: 10000 }, txs, now)
    expect(p.spent).toBe(7000)
    expect(p.remaining).toBe(3000)
    expect(p.pct).toBe(70)
    expect(p.level).toBe(50)
  })
  it('category budget isolates its category', () => {
    const p = budgetProgress({ kind: 'category', categoryId: 'food', period: 'monthly', amount: 5000 }, txs, now)
    expect(p.spent).toBe(5000)
    expect(p.level).toBe(100)
  })
  it('custom ranges are inclusive', () => {
    const p = budgetProgress({ kind: 'overall', period: 'custom', startDate: '2026-10-30', endDate: '2026-11-03', amount: 20000 }, txs, now)
    expect(p.spent).toBe(15999)
  })
  it('alert thresholds', () => {
    expect([10, 50, 74.9, 75, 89.9, 90, 99.9, 100, 140].map((v) => alertLevel(v))).toEqual([0, 50, 50, 75, 75, 90, 90, 100, 100])
  })
})

describe('series & subscriptions', () => {
  it('zero-fills days in range', () => {
    const s = buildSeries([tx({ type: 'expense', amount: 100, dateKey: '2026-11-02' })], '2026-11-01', '2026-11-03', 'day')
    expect(s.map((r) => r.expense)).toEqual([0, 100, 0])
  })
  it('converts subscription prices to monthly', () => {
    expect(monthlyEquivalent(120000, 'yearly')).toBe(10000)
    expect(monthlyEquivalent(30000, 'quarterly')).toBe(10000)
    expect(monthlyEquivalent(10000, 'monthly')).toBe(10000)
  })
})
