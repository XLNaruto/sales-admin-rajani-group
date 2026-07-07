import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Check, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequestOtp } from '../api/use-otp-auth'

const mobileSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
  remember: z.boolean(),
})
type MobileValues = z.infer<typeof mobileSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const requestOtp = useRequestOtp()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MobileValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: '', remember: true },
  })

  const mobileField = register('mobile')

  const onSubmit = handleSubmit((v) =>
    requestOtp.mutate(
      { mobile: v.mobile },
      {
        onSuccess: () => {
          toast.success(`Code sent to ${v.mobile}`)
          navigate({ to: '/verify', state: { mobile: v.mobile } })
        },
        onError: () =>
          toast.error("Couldn't send the code. Please try again."),
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

        <label className="flex w-fit cursor-pointer select-none items-center gap-2.5 text-sm text-muted-foreground">
          <span className="relative inline-flex">
            <input
              type="checkbox"
              className="peer sr-only"
              {...register('remember')}
            />
            <span className="grid h-4.5 w-4.5 place-items-center rounded-[5px] border border-foreground/25 bg-transparent text-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:ring-offset-1">
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
          </span>
          Remember me
        </label>

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
