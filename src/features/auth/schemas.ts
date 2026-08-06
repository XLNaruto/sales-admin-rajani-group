import { z } from 'zod'

/**
 * Sign-in credentials. Mirrors the constraints the backend enforces on
 * POST /sales-incharge-admin/auth/password-login, so bad input never leaves
 * the browser.
 */
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[A-Za-z0-9._-]+$/, 'Only letters, numbers and . _ - are allowed'),
  password: z
    .string()
    .min(1, 'Enter your password')
    .max(200, 'Password must be at most 200 characters'),
  remember: z.boolean(),
})

export type LoginValues = z.infer<typeof loginSchema>
