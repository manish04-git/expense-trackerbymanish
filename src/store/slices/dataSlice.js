import { createSlice, createSelector } from '@reduxjs/toolkit'

const initialState = {
  accounts: [], categories: [], budgets: [], recurring: [], goals: [], subscriptions: [],
  notifications: [], recentTransactions: [], loaded: {}, errors: {},
}

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setCollection(state, { payload: { name, items } }) {
      state[name] = items
      state.loaded[name] = true
      delete state.errors[name]
    },
    setCollectionError(state, { payload: { name, message } }) {
      state.errors[name] = message
      state.loaded[name] = true
    },
    resetData: () => initialState,
  },
})

export const { setCollection, setCollectionError, resetData } = dataSlice.actions
export default dataSlice.reducer

export const selectData = (s) => s.data
export const selectAccounts = (s) => s.data.accounts
export const selectCategories = (s) => s.data.categories
export const selectActiveAccounts = createSelector(selectAccounts, (a) => a.filter((x) => !x.archived).sort((x, y) => x.name.localeCompare(y.name)))
export const selectAccountsById = createSelector(selectAccounts, (a) => Object.fromEntries(a.map((x) => [x.id, x])))
export const selectCategoriesById = createSelector(selectCategories, (c) => Object.fromEntries(c.map((x) => [x.id, x])))
export const selectExpenseCategories = createSelector(selectCategories, (c) => c.filter((x) => x.type === 'expense').sort((a, b) => a.name.localeCompare(b.name)))
export const selectIncomeCategories = createSelector(selectCategories, (c) => c.filter((x) => x.type === 'income').sort((a, b) => a.name.localeCompare(b.name)))
export const selectCoreLoaded = (s) => s.data.loaded.accounts && s.data.loaded.categories && s.settings.loaded
