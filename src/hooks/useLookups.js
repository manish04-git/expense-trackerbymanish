import { useSelector } from 'react-redux'
import {
  selectAccountsById, selectActiveAccounts, selectCategoriesById, selectExpenseCategories, selectIncomeCategories,
} from '@/store/slices/dataSlice'

export default function useLookups() {
  return {
    accounts: useSelector(selectActiveAccounts),
    accountsById: useSelector(selectAccountsById),
    categoriesById: useSelector(selectCategoriesById),
    expenseCategories: useSelector(selectExpenseCategories),
    incomeCategories: useSelector(selectIncomeCategories),
  }
}
