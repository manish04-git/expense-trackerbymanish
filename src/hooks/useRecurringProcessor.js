import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { processDueRecurring } from '@/features/recurring/recurring.service'
import { reportError } from '@/utils/errors'

/** Generates due recurring transactions once per session, when the app opens (idempotent). */
export default function useRecurringProcessor(uid) {
  const items = useSelector((s) => s.data.recurring)
  const ready = useSelector((s) => s.data.loaded.recurring && s.data.loaded.accounts)
  const ran = useRef(null)

  useEffect(() => {
    if (!uid || !ready || ran.current === uid || !navigator.onLine) return
    ran.current = uid
    processDueRecurring(uid, items)
      .then((n) => { if (n > 0) toast.success(`${n} recurring transaction${n > 1 ? 's' : ''} added`) })
      .catch((err) => reportError(err, 'Could not process recurring transactions.'))
  }, [uid, ready, items])
}
