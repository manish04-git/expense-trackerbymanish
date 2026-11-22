import { budgetRange, bucketsBetween, bucketKeyFor, dateKey, inRangeKey } from './date'

/**
 * Accounting rules
 *  - income:   + account                       (counts as income)
 *  - expense:  - account                       (counts as expense)
 *  - refund:   + account                       (REDUCES expenses; never counts as income)
 *  - transfer: - source, + destination         (never income or expense; net worth unchanged)
 * Credit-card accounts hold a NEGATIVE balance = outstanding amount. A purchase is an expense when it
 * happens; repaying the card is a transfer, so nothing is double counted.
 */
export function balanceDeltas(tx) {
  const amount = tx.amount
  switch (tx.type) {
    case 'income':
    case 'refund':
      return { [tx.accountId]: amount }
    case 'expense':
      return { [tx.accountId]: -amount }
    case 'transfer':
      return { [tx.accountId]: -amount, [tx.toAccountId]: amount }
    default:
      return {}
  }
}

/** Net balance change when replacing oldTx with newTx (either may be null). */
export function netDeltas(oldTx, newTx) {
  const out = {}
  if (oldTx) for (const [k, v] of Object.entries(balanceDeltas(oldTx))) out[k] = (out[k] || 0) - v
  if (newTx) for (const [k, v] of Object.entries(balanceDeltas(newTx))) out[k] = (out[k] || 0) + v
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== 0))
}

export function summarize(txs) {
  let income = 0
  let grossExpense = 0
  let refund = 0
  let transferVolume = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') grossExpense += t.amount
    else if (t.type === 'refund') refund += t.amount
    else if (t.type === 'transfer') transferVolume += t.amount
  }
  const expense = grossExpense - refund
  return { income, grossExpense, refund, expense, savings: income - expense, transferVolume, count: txs.length }
}

/** Net expense per category (refunds subtract from their category). */
export function categoryExpenseTotals(txs) {
  const out = {}
  for (const t of txs) {
    if (t.type === 'expense') out[t.categoryId] = (out[t.categoryId] || 0) + t.amount
    else if (t.type === 'refund') out[t.categoryId] = (out[t.categoryId] || 0) - t.amount
  }
  return out
}

export function categoryIncomeTotals(txs) {
  const out = {}
  for (const t of txs) if (t.type === 'income') out[t.categoryId] = (out[t.categoryId] || 0) + t.amount
  return out
}

export function sortedTotals(totals) {
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function groupSummaries(txs, keyFn) {
  const groups = {}
  for (const t of txs) (groups[keyFn(t)] ||= []).push(t)
  return Object.fromEntries(Object.entries(groups).map(([k, list]) => [k, summarize(list)]))
}

/** Zero-filled time series for charts: [{key,label,income,expense,savings,count}] */
export function buildSeries(txs, startKey, endKey, granularity) {
  const grouped = groupSummaries(
    txs.filter((t) => inRangeKey(t.dateKey, startKey, endKey)),
    (t) => bucketKeyFor(t.dateKey, granularity),
  )
  return bucketsBetween(startKey, endKey, granularity).map(({ key, label }) => {
    const s = grouped[key] || { income: 0, expense: 0, savings: 0, count: 0 }
    return { key, label, income: s.income, expense: s.expense, savings: s.savings, count: s.count }
  })
}

export function accountSummaries(txs) {
  const out = {}
  const row = (id) => (out[id] ||= { income: 0, expense: 0, refund: 0, transferIn: 0, transferOut: 0 })
  for (const t of txs) {
    if (t.type === 'transfer') {
      row(t.accountId).transferOut += t.amount
      row(t.toAccountId).transferIn += t.amount
    } else if (t.type === 'income') row(t.accountId).income += t.amount
    else if (t.type === 'expense') row(t.accountId).expense += t.amount
    else if (t.type === 'refund') row(t.accountId).refund += t.amount
  }
  return out
}

export function sumBalances(accounts) {
  let assets = 0
  let creditOutstanding = 0
  for (const a of accounts) {
    if (a.archived) continue
    if (a.type === 'credit_card') creditOutstanding += -a.balance
    else assets += a.balance
  }
  return { assets, creditOutstanding, netWorth: assets - creditOutstanding }
}

export function alertLevel(pct, levels = [100, 90, 75, 50]) {
  return levels.find((l) => pct >= l) || 0
}

export function budgetProgress(budget, txs, now = new Date()) {
  const range = budgetRange(budget, now)
  const list = txs.filter((t) => inRangeKey(t.dateKey, range.startKey, range.endKey))
  const spent =
    budget.kind === 'category'
      ? categoryExpenseTotals(list)[budget.categoryId] || 0
      : summarize(list).expense
  const pct = budget.amount > 0 ? Math.round((Math.max(spent, 0) / budget.amount) * 1000) / 10 : 0
  return { spent, remaining: budget.amount - spent, pct, level: alertLevel(pct), range }
}

export const dailyAverage = (spent, days) => (days > 0 ? Math.round(spent / days) : 0)
export const projectExpense = (spent, daysElapsed, daysInMonth) =>
  daysElapsed > 0 ? Math.round((spent / daysElapsed) * daysInMonth) : 0

export const todayInRange = (startKey, endKey) => inRangeKey(dateKey(new Date()), startKey, endKey)

/** Monthly equivalent of a subscription price (display estimate only). */
export function monthlyEquivalent(amount, cycle) {
  switch (cycle) {
    case 'weekly': return Math.round((amount * 52) / 12)
    case 'quarterly': return Math.round(amount / 3)
    case 'yearly': return Math.round(amount / 12)
    default: return amount
  }
}
