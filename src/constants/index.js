export const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'refund', label: 'Refund' },
]

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

export const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'current', label: 'Current Account' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
]

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export const BILLING_CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export const BUDGET_PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom range' },
]

export const DATE_FORMATS = [
  { value: 'dd MMM yyyy', label: '22 Nov 2026' },
  { value: 'dd/MM/yyyy', label: '22/11/2026' },
  { value: 'MM/dd/yyyy', label: '11/22/2026' },
  { value: 'yyyy-MM-dd', label: '2026-11-22' },
]

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((label, i) => ({ value: i + 1, label }))

export const BUDGET_ALERT_LEVELS = [50, 75, 90, 100]

export const DEFAULT_SETTINGS = {
  currency: 'INR',
  language: 'en',
  theme: 'system',
  dateFormat: 'dd MMM yyyy',
  fyStartMonth: 4,
  defaultAccountId: null,
  notifications: { budgetAlerts: true, subscriptionReminders: true, goalAlerts: true },
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'utensils', color: '#F97316' },
  { name: 'Groceries', icon: 'cart', color: '#84CC16' },
  { name: 'Transportation', icon: 'car', color: '#0EA5E9' },
  { name: 'Shopping', icon: 'bag', color: '#EC4899' },
  { name: 'Entertainment', icon: 'clapper', color: '#8B5CF6' },
  { name: 'Healthcare', icon: 'heart', color: '#EF4444' },
  { name: 'Education', icon: 'graduation', color: '#6366F1' },
  { name: 'Rent', icon: 'home', color: '#14B8A6' },
  { name: 'Bills & Utilities', icon: 'receipt', color: '#F59E0B' },
  { name: 'Travel', icon: 'plane', color: '#06B6D4' },
  { name: 'Personal Care', icon: 'sparkles', color: '#D946EF' },
  { name: 'Other', icon: 'tag', color: '#64748B' },
]

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'briefcase', color: '#16A34A' },
  { name: 'Business', icon: 'landmark', color: '#0D9488' },
  { name: 'Freelancing', icon: 'laptop', color: '#2563EB' },
  { name: 'Investments', icon: 'trending', color: '#7C3AED' },
  { name: 'Interest', icon: 'coins', color: '#CA8A04' },
  { name: 'Gifts', icon: 'gift', color: '#DB2777' },
  { name: 'Other Income', icon: 'tag', color: '#64748B' },
]

export const COLOR_SWATCHES = [
  '#16A34A', '#0D9488', '#0EA5E9', '#2563EB', '#6366F1', '#8B5CF6', '#D946EF', '#EC4899',
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#64748B', '#14B8A6', '#CA8A04', '#7C3AED',
]

export const CHART_COLORS = ['#16A34A', '#2563EB', '#F59E0B', '#EC4899', '#8B5CF6', '#0EA5E9', '#F97316', '#14B8A6', '#64748B']
