import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useVerifyOtpForm } from '../hooks/use-verify-otp'

/** Step 2 of sign-in: verify the code sent to the pending mobile number. */
export function VerifyOtpPage() {
  const {
    session,
    mobile,
    digits,
    inputsRef,
    complete,
    seconds,
    otpLength,
    isVerifying,
    isVerifyError,
    verifyError,
    isResending,
    handleChange,
    handleKeyDown,
    handlePaste,
    handleSubmit,
    handleResend,
    handleChangeNumber,
  } = useVerifyOtpForm()

  // Guard render (all hooks above run unconditionally); the redirect effect
  // handles navigating away when there's no pending session.
  if (!session) return null

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        Verify your number
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the {otpLength}-digit code we sent to{' '}
        <span className="font-medium text-foreground">{mobile}</span>.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {isVerifyError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {verifyError?.message}
          </p>
        )}

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
          disabled={isVerifying || !complete}
        >
          {isVerifying ? 'Verifying…' : 'Verify & sign in'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Didn&apos;t get it?{' '}
          {seconds > 0 ? (
            <span className="text-muted-foreground/60">Resend in {seconds}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
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
          onClick={handleChangeNumber}
          className="cursor-pointer font-medium text-primary transition-opacity hover:opacity-80"
        >
          Change it
        </button>
      </div>
    </div>
  )
}
