import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { subscribeRange } from '@/services/firebase/transactions.service'
import { recentWindow } from '@/utils/date'

/**
 * Transactions between two date keys.
 * If the range lies inside the always-on "recent" window it is served from memory (0 extra reads);
 * otherwise a dedicated listener is opened for as long as the component is mounted.
 */
export default function useRangeTransactions(startKey, endKey) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const recent = useSelector((s) => s.data.recentTransactions)
  const recentLoaded = useSelector((s) => s.data.loaded.recentTransactions)
  const recentRange = useMemo(() => recentWindow(), [])
  const covered = startKey >= recentRange.startKey && endKey <= recentRange.endKey
  const [state, setState] = useState({ items: [], loading: true, error: null, key: '' })
  const key = `${startKey}|${endKey}`

  useEffect(() => {
    if (covered || !uid) return undefined
    return subscribeRange(
      uid, startKey, endKey,
      (items) => setState({ items, loading: false, error: null, key }),
      (error) => setState({ items: [], loading: false, error, key }),
    )
  }, [covered, uid, startKey, endKey, key])

  const local = useMemo(
    () => (covered ? recent.filter((t) => t.dateKey >= startKey && t.dateKey <= endKey) : []),
    [covered, recent, startKey, endKey],
  )
  if (covered) return { items: local, loading: !recentLoaded, error: null }
  return { items: state.key === key ? state.items : [], loading: state.key !== key, error: state.error }
}
