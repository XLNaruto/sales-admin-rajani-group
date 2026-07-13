import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useOtpSessionStore } from '@/stores/otp-session-store'
import { confirmOtp, firebaseSignOut, sendOtp } from './firebase-phone-auth'
import { accountCheck, loginWithIdToken, logoutRequest } from './auth-api'
import type { AuthSession } from '../types'

export interface RequestOtpInput {
  mobile: string
}

export interface VerifyOtpInput {
  mobile: string
  otp: string
}

/**
 * Step 1 of sign-in: first ask the backend whether this number belongs to an
 * eligible account (account-check), and only then text a one-time code via
 * Firebase Phone Auth — so we never spend an SMS on a number login would
 * reject. No session exists yet; that happens on verify.
 */
export function useRequestOtp() {
  // Resolves with the Firebase `verificationId` so the caller can persist it
  // for post-refresh verification.
  return useMutation<string, Error, RequestOtpInput>({
    mutationFn: async ({ mobile }) => {
      await accountCheck(mobile)
      return sendOtp(mobile)
    },
  })
}

/**
 * Step 2 of sign-in: verify the OTP with Firebase, then exchange the resulting
 * ID token for a backend session and hydrate the auth store.
 */
export function useVerifyOtp() {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation<AuthSession, Error, VerifyOtpInput>({
    mutationFn: async ({ otp }) => {
      // Fall back to the persisted verificationId when a refresh has dropped
      // the in-memory ConfirmationResult.
      const verificationId =
        useOtpSessionStore.getState().session?.verificationId
      const confirmed = await confirmOtp(otp, verificationId)
      return loginWithIdToken(confirmed)
    },
    onSuccess: ({ user, token, refreshToken }) => {
      const remember = useOtpSessionStore.getState().session?.remember ?? false
      setSession(user, token, refreshToken, { remember })
    },
  })
}

/**
 * Sign out everywhere: revoke the backend refresh token, sign out of Firebase,
 * then clear local client state (auth + any pending OTP session).
 */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const clearOtpSession = useOtpSessionStore((s) => s.clearSession)

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { refreshToken } = useAuthStore.getState()
      // Best-effort revoke + Firebase sign-out; never block local logout on it.
      await Promise.allSettled([logoutRequest(refreshToken), firebaseSignOut()])
    },
    onSettled: () => {
      logout()
      clearOtpSession()
    },
  })
}
