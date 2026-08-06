import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toastApiSuccess } from '@/lib/api-toast'
import { useLogin } from '../api/use-auth'
import { loginSchema, type LoginValues } from '../schemas'

/**
 * Sign-in: collect a username + password and exchange them for a session.
 * Owns the form wiring, the login mutation, the password visibility toggle and
 * the redirect to the dashboard. The page consumes this and only renders.
 */
export function useLoginForm() {
  const navigate = useNavigate()
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', remember: false },
  })

  const onSubmit = handleSubmit((v) =>
    login.mutate(v, {
      onSuccess: (session) => {
        toastApiSuccess(session, 'Signed in successfully')
        navigate({ to: '/dashboard', replace: true })
      },
      onError: () => setFocus('password'),
      // The error is surfaced inline on the form — no toast.
    }),
  )

  return {
    register,
    errors,
    onSubmit,
    showPassword,
    toggleShowPassword: () => setShowPassword((s) => !s),
    isPending: login.isPending,
    isError: login.isError,
    error: login.error,
  }
}
