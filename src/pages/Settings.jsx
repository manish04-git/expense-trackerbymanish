import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Download, RefreshCw, Smartphone, Trash2, Upload } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Button from '@/components/common/Button'
import { Card, CardHeader, PageHeader } from '@/components/common/Card'
import { Input, Select, Toggle } from '@/components/common/Field'
import Modal from '@/components/common/Modal'
import { DATE_FORMATS, MONTHS } from '@/constants'
import { deleteAccountAndData, exportBackup, restoreBackup } from '@/features/settings/settings.service'
import useInstallPrompt from '@/hooks/useInstallPrompt'
import useLookups from '@/hooks/useLookups'
import { changePassword, updateDisplayName } from '@/services/firebase/auth.service'
import { saveSettings } from '@/services/firebase/firestore.service'
import { fetchAllTransactions, reconcileBalances } from '@/services/firebase/transactions.service'
import { patchUser } from '@/store/slices/authSlice'
import { setTheme } from '@/store/slices/uiSlice'
import { downloadFile, toCSV } from '@/utils/csv'
import { CURRENCY_LIST, fromMinor } from '@/utils/currency'
import { getErrorMessage, reportError } from '@/utils/errors'
import { storeTheme } from '@/utils/theme'
import { changePasswordSchema, profileSchema } from '@/utils/validators'

function ProfileCard() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user.displayName } })
  const onSubmit = async ({ name }) => {
    try { await updateDisplayName(user.uid, name); dispatch(patchUser({ displayName: name })); toast.success('Profile updated') } catch (e) { reportError(e) }
  }
  return (
    <Card>
      <CardHeader title="Profile" />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Name" error={errors.name?.message} {...register('name')} />
        <Input label="Email" value={user.email} readOnly disabled />
        <div className="sm:col-span-2"><Button type="submit" loading={isSubmitting}>Update profile</Button></div>
      </form>
    </Card>
  )
}

function PasswordCard() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { current: '', next: '', confirm: '' } })
  const [formError, setFormError] = useState('')
  const onSubmit = async (v) => {
    setFormError('')
    try { await changePassword(v.current, v.next); toast.success('Password changed'); reset() } catch (e) { setFormError(getErrorMessage(e)) }
  }
  return (
    <Card>
      <CardHeader title="Change password" subtitle="You will be asked for your current password to confirm it is you" />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-3" noValidate>
        {formError && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger sm:col-span-3">{formError}</p>}
        <Input label="Current password" type="password" autoComplete="current-password" error={errors.current?.message} {...register('current')} />
        <Input label="New password" type="password" autoComplete="new-password" error={errors.next?.message} {...register('next')} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        <div className="sm:col-span-3"><Button type="submit" loading={isSubmitting}>Change password</Button></div>
      </form>
    </Card>
  )
}

function PreferencesCard() {
  const dispatch = useDispatch()
  const uid = useSelector((s) => s.auth.user?.uid)
  const settings = useSelector((s) => s.settings.values)
  const { accounts } = useLookups()
  const save = async (patch) => {
    try {
      await saveSettings(uid, { ...settings, ...patch })
      if (patch.theme) { dispatch(setTheme(patch.theme)); storeTheme(patch.theme) }
    } catch (e) { reportError(e) }
  }
  return (
    <Card>
      <CardHeader title="Preferences" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Currency" value={settings.currency} onChange={(e) => save({ currency: e.target.value })} hint="Changes how amounts are shown. Existing amounts are not converted.">
          {CURRENCY_LIST.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} – {c.name}</option>)}
        </Select>
        <Select label="Language" value={settings.language} onChange={(e) => save({ language: e.target.value })} hint="More languages can be added later.">
          <option value="en">English</option>
        </Select>
        <Select label="Theme" value={settings.theme} onChange={(e) => save({ theme: e.target.value })}>
          <option value="system">Match device</option><option value="light">Light</option><option value="dark">Dark</option>
        </Select>
        <Select label="Date format" value={settings.dateFormat} onChange={(e) => save({ dateFormat: e.target.value })}>
          {DATE_FORMATS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </Select>
        <Select label="Financial year starts in" value={settings.fyStartMonth} onChange={(e) => save({ fyStartMonth: Number(e.target.value) })} hint="India: April to March">
          {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
        <Select label="Default account" value={settings.defaultAccountId || ''} onChange={(e) => save({ defaultAccountId: e.target.value || null })}>
          <option value="">First account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </div>
      <div className="mt-6 space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Notifications (shown inside the app)</h3>
        <Toggle label="Budget alerts at 50%, 75%, 90% and 100%" checked={settings.notifications.budgetAlerts} onChange={(v) => save({ notifications: { ...settings.notifications, budgetAlerts: v } })} />
        <Toggle label="Subscription payment reminders" checked={settings.notifications.subscriptionReminders} onChange={(v) => save({ notifications: { ...settings.notifications, subscriptionReminders: v } })} />
        <Toggle label="Savings goal milestones" checked={settings.notifications.goalAlerts} onChange={(v) => save({ notifications: { ...settings.notifications, goalAlerts: v } })} />
      </div>
    </Card>
  )
}

function DataCard() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const settings = useSelector((s) => s.settings.values)
  const accounts = useSelector((s) => s.data.accounts)
  const { accountsById, categoriesById } = useLookups()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState('')

  const run = async (name, fn) => { setBusy(name); try { await fn() } catch (e) { reportError(e) } finally { setBusy('') } }
  const stamp = new Date().toISOString().slice(0, 10)

  const exportJson = () => run('backup', async () => {
    const backup = await exportBackup(uid, settings)
    downloadFile(`expense-tracker-backup-${stamp}.json`, JSON.stringify(backup, null, 2), 'application/json')
    toast.success('Backup downloaded')
  })
  const exportAllCsv = () => run('csv', async () => {
    const txs = (await fetchAllTransactions(uid)).sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
    downloadFile(`transactions-${stamp}.csv`, toCSV(txs, [
      { label: 'Date', value: 'dateKey' }, { label: 'Type', value: 'type' },
      { label: 'Amount', value: (t) => fromMinor(t.amount, settings.currency) },
      { label: 'Category', value: (t) => categoriesById[t.categoryId]?.name || '' },
      { label: 'Account', value: (t) => accountsById[t.accountId]?.name || '' },
      { label: 'To account', value: (t) => accountsById[t.toAccountId]?.name || '' },
      { label: 'Description', value: 'description' }, { label: 'Notes', value: 'notes' },
    ]))
    toast.success(`Exported ${txs.length} transactions`)
  })
  const onRestore = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    run('restore', async () => {
      if (file.size > 20 * 1024 * 1024) throw Object.assign(new Error('big'), { userMessage: 'That file is too large to be a backup.' })
      const backup = JSON.parse(await file.text())
      const res = await restoreBackup(uid, backup, accounts)
      toast.success(`Restored ${res.restored} items (${res.skipped} already existed)`)
    })
  }
  const reconcile = () => run('reconcile', async () => {
    const n = await reconcileBalances(uid, accounts)
    toast.success(n ? `Fixed ${n} account balance${n > 1 ? 's' : ''}` : 'All balances are consistent')
  })

  return (
    <Card>
      <CardHeader title="Data, backup & restore" subtitle="Your data belongs to you" />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={busy === 'backup'} onClick={exportJson}><Download className="size-4" />Download backup (JSON)</Button>
        <Button variant="secondary" loading={busy === 'csv'} onClick={exportAllCsv}><Download className="size-4" />Export all transactions (CSV)</Button>
        <Button variant="secondary" loading={busy === 'restore'} onClick={() => fileRef.current?.click()}><Upload className="size-4" />Restore from backup</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onRestore} />
        <Button variant="secondary" loading={busy === 'reconcile'} onClick={reconcile}><RefreshCw className="size-4" />Recalculate balances</Button>
      </div>
      <p className="mt-3 text-xs text-muted">Restore adds items that are missing and skips ones that already exist. Backups and CSV exports read every transaction once, which counts against the free daily read quota.</p>
    </Card>
  )
}

function InstallCard() {
  const { canInstall, install } = useInstallPrompt()
  if (!canInstall) return null
  return (
    <Card>
      <CardHeader title="Install app" subtitle="Add Expense Tracker to your home screen or desktop" />
      <Button onClick={install}><Smartphone className="size-4" />Install</Button>
    </Card>
  )
}

function DeleteCard() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (!open) { setPassword(''); setError('') } }, [open])

  const confirm = async () => {
    setBusy(true); setError('')
    try {
      await deleteAccountAndData(uid, password)
      toast.success('Your account and data were deleted')
      navigate('/login', { replace: true })
    } catch (e) { setError(getErrorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <Card className="border-danger/40">
      <CardHeader title="Delete account" subtitle="Permanently removes your profile and every record. This cannot be undone." />
      <Button variant="danger" onClick={() => setOpen(true)}><Trash2 className="size-4" />Delete my account</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete account?" size="sm" footer={<><Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button variant="danger" loading={busy} disabled={!password} onClick={confirm}>Delete everything</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-muted">Enter your password to confirm. Download a backup first if you may need your data.</p>
          <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        </div>
      </Modal>
    </Card>
  )
}

export default function Settings() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Profile, preferences and data" />
      <ProfileCard />
      <PreferencesCard />
      <PasswordCard />
      <InstallCard />
      <DataCard />
      <DeleteCard />
      <p className="text-center text-xs text-muted"><Link to="/privacy" className="hover:underline">Privacy policy</Link> · <Link to="/terms" className="hover:underline">Terms &amp; conditions</Link></p>
    </div>
  )
}
