import { useMutation } from '@tanstack/react-query'
import { mockDelay } from '@/lib/utils'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'

export interface RequestOtpInput {
  mobile: string
}

export interface VerifyOtpInput {
  mobile: string
  code: string
}

/**
 * Requests an OTP for the given mobile number.
 * Mock: pretends to text a code; returns nothing meaningful.
 */
export function useRequestOtp() {
  return useMutation({
    mutationFn: async ({ mobile }: RequestOtpInput) => {
      return mockDelay({ mobile, sent: true }, 600)
    },
  })
}

/**
 * Verifies the OTP and hydrates the global auth store.
 * Mock: accepts any 4-6 digit code and derives a demo admin session.
 */
export function useVerifyOtp() {
  const login = useAuthStore((s) => s.login)

  return useMutation({
    mutationFn: async ({ mobile }: VerifyOtpInput) => {
      const user: AuthUser = {
        id: 'u-1',
        name: 'Analytics Admin',
        email: `${mobile}@rajanigroup.com`,
        role: 'admin',
      }
      return mockDelay({ user, token: 'demo-token' }, 500)
    },
    onSuccess: ({ user, token }) => login(user, token),
  })
}
