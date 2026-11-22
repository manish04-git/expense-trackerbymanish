import { useEffect, useState } from 'react'

/** Captures the browser's beforeinstallprompt event so we can show our own Install button. */
export default function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPromptEvent(e) }
    const onInstalled = () => { setInstalled(true); setPromptEvent(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  const install = async () => {
    if (!promptEvent) return
    promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
  return { canInstall: Boolean(promptEvent) && !installed && !standalone, install }
}
