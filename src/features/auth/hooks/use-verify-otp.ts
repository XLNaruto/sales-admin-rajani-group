import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toastApiError, toastApiSuccess } from '@/lib/api-toast'
import { useOtpSessionStore } from '@/stores/otp-session-store'
import { useRequestOtp, useVerifyOtp } from '../api/use-otp-auth'
import { clearPendingConfirmation } from '../api/firebase-phone-auth'

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

/**
 * Step 2 of sign-in: verify the code sent to the pending mobile number. Owns
 * the digit inputs, the resend cooldown, the redirect-when-no-session guard,
 * the verify/resend mutations and all input event handlers. The page consumes
 * this and only renders.
 */
export function useVerifyOtpForm() {
  const navigate = useNavigate()
  const session = useOtpSessionStore((s) => s.session)
  const startSession = useOtpSessionStore((s) => s.startSession)
  const clearSession = useOtpSessionStore((s) => s.clearSession)
  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const code = digits.join('')
  const complete = code.length === OTP_LENGTH
  const submittedRef = useRef(false)

  const [seconds, setSeconds] = useState(RESEND_SECONDS)

  // No pending code (direct visit, or refresh after finishing) → back to login.
  useEffect(() => {
    if (!session) navigate({ to: '/login', replace: true })
  }, [session, navigate])

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  // Seed the cooldown from when the code was last requested, so it survives a
  // refresh instead of restarting at 60s.
  const requestedAt = session?.requestedAt
  useEffect(() => {
    if (requestedAt == null) return
    const elapsed = Math.floor((Date.now() - requestedAt) / 1000)
    setSeconds(Math.max(0, RESEND_SECONDS - elapsed))
  }, [requestedAt])

  useEffect(() => {
    if (seconds <= 0) return
    const id = setInterval(() => setSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(id)
  }, [seconds])

  const mobile = session?.mobile ?? ''

  const setAt = (i: number, val: string) =>
    setDigits((prev) => {
      const next = [...prev]
      next[i] = val
      return next
    })

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      setAt(i, '')
      return
    }
    setAt(i, raw[raw.length - 1])
    if (i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus()
  }

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        setAt(i, '')
      } else if (i > 0) {
        setAt(i - 1, '')
        inputsRef.current[i - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputsRef.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      inputsRef.current[i + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH)
    if (!text) return
    const next = Array(OTP_LENGTH).fill('')
    text.split('').forEach((c, k) => (next[k] = c))
    setDigits(next)
    inputsRef.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
  }

  const runVerify = () => {
    if (!complete || submittedRef.current || verifyOtp.isPending) return
    submittedRef.current = true
    verifyOtp.mutate(
      { mobile, otp: code },
      {
        onSuccess: (session) => {
          clearSession()
          toastApiSuccess(session, 'Signed in successfully')
          navigate({ to: '/dashboard', replace: true })
        },
        onError: (err) => {
          submittedRef.current = false
          setDigits(Array(OTP_LENGTH).fill(''))
          inputsRef.current[0]?.focus()
          toastApiError(err, 'Invalid or expired code. Please try again.')
        },
      },
    )
  }

  // Auto-verify as soon as the last digit lands.
  useEffect(() => {
    if (complete) runVerify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runVerify()
  }

  const handleResend = () => {
    if (!session || seconds > 0 || requestOtp.isPending) return
    const { remember } = session
    requestOtp.mutate(
      { mobile },
      {
        onSuccess: (verificationId) => {
          startSession({ mobile, remember, requestedAt: Date.now(), verificationId })
          setSeconds(RESEND_SECONDS)
          toastApiSuccess(undefined, `New code sent to ${mobile}`)
        },
        onError: (err) =>
          toastApiError(err, "Couldn't resend the code. Please try again."),
      },
    )
    setDigits(Array(OTP_LENGTH).fill(''))
    submittedRef.current = false
    inputsRef.current[0]?.focus()
  }

  const handleChangeNumber = () => {
    clearPendingConfirmation()
    verifyOtp.reset()
    clearSession()
    navigate({ to: '/login' })
  }

  return {
    session,
    mobile,
    digits,
    inputsRef,
    complete,
    seconds,
    otpLength: OTP_LENGTH,
    isVerifying: verifyOtp.isPending,
    isVerifyError: verifyOtp.isError,
    verifyError: verifyOtp.error,
    isResending: requestOtp.isPending,
    handleChange,
    handleKeyDown,
    handlePaste,
    handleSubmit,
    handleResend,
    handleChangeNumber,
  }
}
