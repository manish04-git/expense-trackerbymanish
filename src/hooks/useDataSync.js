import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { limit, orderBy } from 'firebase/firestore'
import { subscribeCollection, subscribeDoc, SETTINGS_ID } from '@/services/firebase/firestore.service'
import { subscribeRange } from '@/services/firebase/transactions.service'
import { resetData, setCollection, setCollectionError } from '@/store/slices/dataSlice'
import { resetSettings, setSettings } from '@/store/slices/settingsSlice'
import { setTheme } from '@/store/slices/uiSlice'
import { recentWindow } from '@/utils/date'
import { getErrorMessage } from '@/utils/errors'
import { storeTheme } from '@/utils/theme'

const SMALL_COLLECTIONS = {
  accounts: 'accounts',
  categories: 'categories',
  budgets: 'budgets',
  recurring: 'recurringTransactions',
  goals: 'savingsGoals',
  subscriptions: 'subscriptions',
}

/**
 * Live listeners for the small collections + ONE transaction listener for
 * "previous month -> end of current month". Persistent local cache keeps re-reads cheap.
 */
export default function useDataSync(uid) {
  const dispatch = useDispatch()
  useEffect(() => {
    if (!uid) return undefined
    const unsubs = []
    const fail = (name) => (err) => dispatch(setCollectionError({ name, message: getErrorMessage(err) }))

    Object.entries(SMALL_COLLECTIONS).forEach(([name, coll]) => {
      unsubs.push(subscribeCollection(uid, coll, (items) => dispatch(setCollection({ name, items })), { onError: fail(name) }))
    })
    unsubs.push(
      subscribeCollection(uid, 'notifications', (items) => dispatch(setCollection({ name: 'notifications', items })), {
        constraints: [orderBy('createdAt', 'desc'), limit(30)],
        onError: fail('notifications'),
      }),
    )
    unsubs.push(
      subscribeDoc(uid, 'settings', SETTINGS_ID, (data) => {
        dispatch(setSettings(data))
        if (data?.theme) { dispatch(setTheme(data.theme)); storeTheme(data.theme) }
      }, (err) => { dispatch(setSettings(null)); fail('settings')(err) }),
    )
    const { startKey, endKey } = recentWindow()
    unsubs.push(
      subscribeRange(uid, startKey, endKey, (items) => dispatch(setCollection({ name: 'recentTransactions', items })), fail('recentTransactions')),
    )
    return () => {
      unsubs.forEach((u) => u())
      dispatch(resetData())
      dispatch(resetSettings())
    }
  }, [uid, dispatch])
}
