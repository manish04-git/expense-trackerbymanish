import { WifiOff } from 'lucide-react'
import useOnlineStatus from '@/hooks/useOnlineStatus'

export default function NetworkBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-black">
      <WifiOff className="size-4" /> You are offline. Saved data is shown read-only; changes need a connection.
    </div>
  )
}
