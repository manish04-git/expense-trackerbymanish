import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Bell } from 'lucide-react'
import { writeBatch } from 'firebase/firestore'
import { formatDistanceToNow } from 'date-fns'
import Button from '@/components/common/Button'
import { db } from '@/services/firebase/firebase.config'
import { docRef } from '@/services/firebase/firestore.service'
import { reportError } from '@/utils/errors'

export default function NotificationBell() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const items = useSelector((s) => s.data.notifications)
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const unread = items.filter((n) => !n.read)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const markAllRead = async () => {
    try {
      const batch = writeBatch(db)
      unread.forEach((n) => batch.update(docRef(uid, 'notifications', n.id), { read: true }))
      await batch.commit()
    } catch (e) { reportError(e) }
  }

  return (
    <div className="relative" ref={box}>
      <Button variant="ghost" size="icon" aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`} onClick={() => setOpen((o) => !o)}>
        <Bell className="size-4" />
        {unread.length > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-danger" />}
      </Button>
      {open && (
        <div className="animate-in absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {unread.length > 0 && <button className="text-xs text-primary hover:underline" onClick={markAllRead}>Mark all read</button>}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You are all caught up.</li>}
            {items.map((n) => (
              <li key={n.id} className="border-b px-4 py-3 last:border-0">
                <p className={n.read ? 'text-sm text-muted' : 'text-sm font-medium'}>{n.title}</p>
                <p className="text-xs text-muted">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted">{formatDistanceToNow(n.createdAt || Date.now(), { addSuffix: true })}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
