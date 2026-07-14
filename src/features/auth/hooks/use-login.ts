import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useOtpSessionStore } from '@/stores/otp-session-store'
import { useRequestOtp } from '../api/use-otp-auth'
import { mobileSchema, type MobileValues } from '../schemas'

/**
 * Step 1 of sign-in: collect a mobile number and request an OTP via Firebase.
 * Owns the form wiring, the request-OTP mutation, the pending-session persist
 * and the navigate-to-verify flow. The page consumes this and only renders.
 */
export function useLogin() {
  const navigate = useNavigate()
  const requestOtp = useRequestOtp()
  const startSession = useOtpSessionStore((s) => s.startSession)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MobileValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: '', remember: false },
  })

  const mobileField = register('mobile')

  const onSubmit = handleSubmit((v) =>
    requestOtp.mutate(
      { mobile: v.mobile },
      {
        onSuccess: (verificationId) => {
          // Persist the pending number + verificationId so both the verify
          // screen and OTP confirmation survive a refresh.
          startSession({
            mobile: v.mobile,
            remember: v.remember,
            requestedAt: Date.now(),
            verificationId,
          })
          toast.success(`Code sent to ${v.mobile}`)
          navigate({ to: '/verify' })
        },
        // Error is already surfaced inline via the alert below — no toast.
      },
    ),
  )

  return {
    register,
    errors,
    mobileField,
    onSubmit,
    isPending: requestOtp.isPending,
    isError: requestOtp.isError,
    error: requestOtp.error,
  }
}
