import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useRequestOtp, useVerifyOtp } from '../api/use-otp-auth'

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

export function VerifyOtpPage({ mobile }: { mobile: string }) {
  const navigate = useNavigate()
  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const code = digits.join('')
  const complete = code.length === OTP_LENGTH
  const submittedRef = useRef(false)

  const [seconds, setSeconds] = useState(RESEND_SECONDS)

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(id)
  }, [])

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
      { mobile, code },
      {
        onSuccess: () => {
          toast.success('Signed in successfully')
          navigate({ to: '/dashboard' })
        },
        onError: () => {
          submittedRef.current = false
          toast.error('Invalid or expired code. Please try again.')
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
    if (seconds > 0 || requestOtp.isPending) return
    requestOtp.mutate(
      { mobile },
      {
        onSuccess: () => toast.success(`New code sent to ${mobile}`),
        onError: () => toast.error("Couldn't resend the code. Please try again."),
      },
    )
    setDigits(Array(OTP_LENGTH).fill(''))
    submittedRef.current = false
    inputsRef.current[0]?.focus()
    setSeconds(RESEND_SECONDS)
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        Verify your number
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the {OTP_LENGTH}-digit code we sent to{' '}
        <span className="font-medium text-foreground">{mobile}</span>.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-3.5">
          <Label className="mb-3 block text-foreground/90">
            Verification code
          </Label>
          <div className="flex gap-2 sm:gap-2.5">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                value={digit}
                onChange={(e) => handleChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className="h-13 w-full rounded-xl border border-foreground/15 bg-transparent text-center text-lg font-semibold text-foreground shadow-none transition-colors focus:border-primary/60 focus:bg-transparent focus:outline-none"
              />
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="group h-11 w-full text-sm font-semibold text-white"
          disabled={verifyOtp.isPending || !complete}
        >
          {verifyOtp.isPending ? 'Verifying…' : 'Verify & sign in'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Didn&apos;t get it?{' '}
          {seconds > 0 ? (
            <span className="text-muted-foreground/60">Resend in {seconds}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={requestOtp.isPending}
              className="cursor-pointer font-medium text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              Resend code
            </button>
          )}
        </p>
      </form>

      <div className="mt-6 border-t border-foreground/10 pt-4 text-center text-xs text-muted-foreground">
        Entered the wrong number?{' '}
        <button
          type="button"
          onClick={() => navigate({ to: '/login' })}
          className="cursor-pointer font-medium text-primary transition-opacity hover:opacity-80"
        >
          Change it
        </button>
      </div>
    </div>
  )
}
