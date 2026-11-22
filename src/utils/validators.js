import { z } from 'zod'
import { toMinor } from './currency'

export const amountField = (currency) =>
  z.string().trim().min(1, 'Enter an amount').refine((v) => {
    const m = toMinor(v, currency)
    return m !== null && m > 0
  }, 'Enter a valid amount greater than 0')

const optionalAmount = (currency) =>
  z.string().trim().refine((v) => v === '' || toMinor(v, currency) !== null, 'Enter a valid amount')

const keyField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')
const optionalKey = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Invalid date')

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(8, 'Use at least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export const forgotSchema = z.object({ email: z.string().trim().email('Enter a valid email') })

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Enter your current password'),
    next: z.string().min(8, 'Use at least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export const profileSchema = z.object({ name: z.string().trim().min(2, 'Enter your name').max(80) })

export const makeTransactionSchema = (currency) =>
  z
    .object({
      type: z.enum(['expense', 'income', 'transfer', 'refund']),
      amount: amountField(currency),
      dateKey: keyField,
      accountId: z.string().min(1, 'Select an account'),
      toAccountId: z.string().optional(),
      categoryId: z.string().optional(),
      paymentMethod: z.enum(['cash', 'upi', 'debit_card', 'credit_card', 'bank_transfer', 'other']),
      description: z.string().trim().max(200).optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .superRefine((v, ctx) => {
      if (v.type === 'transfer') {
        if (!v.toAccountId) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Select the destination account' })
        else if (v.toAccountId === v.accountId) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Must differ from the source account' })
      } else if (!v.categoryId) {
        ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Select a category' })
      }
    })

export const makeAccountSchema = (currency) =>
  z.object({
    name: z.string().trim().min(1, 'Enter a name').max(60),
    type: z.enum(['cash', 'savings', 'current', 'credit_card', 'other']),
    opening: optionalAmount(currency),
    color: z.string().min(4),
  })

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(40),
  type: z.enum(['expense', 'income']),
  icon: z.string().min(1),
  color: z.string().min(4),
})

export const makeBudgetSchema = (currency) =>
  z
    .object({
      name: z.string().trim().min(1, 'Enter a name').max(60),
      kind: z.enum(['overall', 'category']),
      categoryId: z.string().optional(),
      period: z.enum(['weekly', 'monthly', 'custom']),
      amount: amountField(currency),
      startDate: optionalKey,
      endDate: optionalKey,
    })
    .superRefine((v, ctx) => {
      if (v.kind === 'category' && !v.categoryId) ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Select a category' })
      if (v.period === 'custom') {
        if (!v.startDate) ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Pick a start date' })
        if (!v.endDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Pick an end date' })
        if (v.startDate && v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End must be after start' })
      }
    })

export const makeRecurringSchema = (currency) =>
  z
    .object({
      title: z.string().trim().min(1, 'Enter a title').max(80),
      type: z.enum(['expense', 'income']),
      amount: amountField(currency),
      categoryId: z.string().min(1, 'Select a category'),
      accountId: z.string().min(1, 'Select an account'),
      paymentMethod: z.enum(['cash', 'upi', 'debit_card', 'credit_card', 'bank_transfer', 'other']),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
      startDate: keyField,
      endDate: optionalKey,
    })
    .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ['endDate'], message: 'End must be after start' })

export const makeGoalSchema = (currency) =>
  z.object({
    name: z.string().trim().min(1, 'Enter a goal name').max(60),
    targetAmount: amountField(currency),
    currentAmount: optionalAmount(currency),
    targetDate: optionalKey,
    description: z.string().trim().max(500).optional(),
  })

export const makeContributionSchema = (currency) =>
  z.object({ amount: amountField(currency), note: z.string().trim().max(100).optional() })

export const makeSubscriptionSchema = (currency) =>
  z.object({
    name: z.string().trim().min(1, 'Enter a name').max(60),
    amount: amountField(currency),
    billingCycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
    nextPaymentDate: keyField,
    categoryId: z.string().min(1, 'Select a category'),
    reminderDays: z.coerce.number().int().min(0).max(30),
  })
