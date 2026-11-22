import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Button from '@/components/common/Button'
import { Input } from '@/components/common/Field'
import { registerUser } from '@/services/firebase/auth.service'
import { registerSchema } from '@/utils/validators'
import { getErrorMessage } from '@/utils/errors'

export default function Register() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '', confirm: '' },
  })

  const onSubmit = async (values) => {
    setFormError('')
    try { await registerUser(values); navigate('/dashboard', { replace: true }) } catch (e) { setFormError(getErrorMessage(e)) }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div><h1 className="text-xl font-semibold">Create your account</h1><p className="text-sm text-muted">Start tracking your money in minutes</p></div>
      {formError && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{formError}</p>}
      <Input label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters" error={errors.password?.message} {...register('password')} />
      <Input label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
      <Button type="submit" className="w-full justify-center" loading={isSubmitting}>Create account</Button>
      <p className="text-center text-xs text-muted">By registering you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
      <p className="text-center text-sm text-muted">Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link></p>
    </form>
  )
}
