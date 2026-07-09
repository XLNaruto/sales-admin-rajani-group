import { z } from 'zod'

/** 10-digit Indian mobile number (leading 6–9). */
const mobile = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')

/** Step 1 — request an OTP for a mobile number. */
export const mobileSchema = z.object({
  mobile,
  remember: z.boolean(),
})

/** Step 2 — verify the 6-digit code. */
export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

export type MobileValues = z.infer<typeof mobileSchema>
export type OtpValues = z.infer<typeof otpSchema>
