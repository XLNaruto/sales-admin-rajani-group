import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/api-toast'
import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOtpSessionStore } from '@/stores/otp-session-store'
import { useRequestOtp } from '../api/use-otp-auth'
import { mobileSchema, type MobileValues } from '../schemas'

/** Step 1 of sign-in: collect a mobile number and request an OTP via Firebase. */
export function LoginPage() {
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
        onError: (err) => toastApiError(err, "Couldn't send the code. Please try again."),
      },
    ),
  )

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your mobile number and we&apos;ll text you a code to sign in.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {requestOtp.isError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {requestOtp.error.message}
          </p>
        )}

        <div className="space-y-3.5">
          <Label htmlFor="mobile" className="mb-3 block text-foreground/90">
            Mobile number
          </Label>
          <div className="group relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              id="mobile"
              type="text"
              inputMode="numeric"
              maxLength={10}
              autoComplete="off"
              placeholder="98765 43210"
              className="h-11 border-foreground/15 bg-transparent pl-10 text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:ring-0"
              {...mobileField}
              onChange={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '')
                mobileField.onChange(e)
              }}
            />
          </div>
          {errors.mobile && (
            <p className="text-xs text-destructive">{errors.mobile.message}</p>
          )}
        </div>

        <div className="flex w-fit items-center gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            id="remember"
            className="border-foreground/15 bg-transparent shadow-none"
            {...register('remember')}
          />
          <Label
            htmlFor="remember"
            className="cursor-pointer select-none font-normal text-muted-foreground"
          >
            Remember me
          </Label>
        </div>

        <Button
          type="submit"
          className="group h-11 w-full text-sm font-semibold text-white"
          disabled={requestOtp.isPending}
        >
          {requestOtp.isPending ? 'Sending code…' : 'Send code'}
        </Button>
      </form>
    </div>
  )
}
