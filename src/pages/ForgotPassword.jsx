import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Button from '@/components/common/Button'
import { Input } from '@/components/common/Field'
import { sendResetEmail } from '@/services/firebase/auth.service'
import { forgotSchema } from '@/utils/validators'
import { getErrorMessage } from '@/utils/errors'

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })

  const onSubmit = async ({ email }) => {
    setFormError('')
    try { await sendResetEmail(email) } catch (e) {
      // Do not reveal whether an account exists for this email
      if (e?.code !== 'auth/user-not-found') { setFormError(getErrorMessage(e)); return }
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted">If an account exists for that address, a password reset link is on its way. The link opens a secure Firebase page where you choose a new password.</p>
        <Link to="/login" className="text-sm text-primary hover:underline">Back to log in</Link>
      </div>
    )
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div><h1 className="text-xl font-semibold">Reset your password</h1><p className="text-sm text-muted">We will email you a reset link</p></div>
      {formError && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{formError}</p>}
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Button type="submit" className="w-full justify-center" loading={isSubmitting}>Send reset link</Button>
      <p className="text-center text-sm"><Link to="/login" className="text-primary hover:underline">Back to log in</Link></p>
    </form>
  )
}
