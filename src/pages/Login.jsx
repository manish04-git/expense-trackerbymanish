import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Button from '@/components/common/Button'
import { Input } from '@/components/common/Field'
import { loginUser } from '@/services/firebase/auth.service'
import { loginSchema } from '@/utils/validators'
import { getErrorMessage } from '@/utils/errors'
import { useState } from 'react'

export default function Login() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const onSubmit = async (values) => {
    setFormError('')
    try { await loginUser(values); navigate('/dashboard', { replace: true }) } catch (e) { setFormError(getErrorMessage(e)) }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div><h1 className="text-xl font-semibold">Welcome back</h1><p className="text-sm text-muted">Log in to your account</p></div>
      {formError && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{formError}</p>}
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
      <div className="text-right"><Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link></div>
      <Button type="submit" className="w-full justify-center" loading={isSubmitting}>Log in</Button>
      <p className="text-center text-sm text-muted">New here? <Link to="/register" className="text-primary hover:underline">Create an account</Link></p>
    </form>
  )
}
