import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createIdbSessionStorage } from '@/lib/idb-storage'

interface OtpSession {
  /** Mobile number the code was sent to (10 digits, no country code). */
  mobile: string
  /** Whether "remember me" was ticked on the mobile step. */
  remember: boolean
  /** Epoch ms of the last code request — drives the resend cooldown. */
  requestedAt: number
}

interface OtpSessionState {
  session: OtpSession | null
  startSession: (session: OtpSession) => void
  clearSession: () => void
}

/**
 * The in-flight "we texted you a code, now verify it" state. Persisted to
 * sessionStorage so refreshing the verify screen keeps the pending number
 * (and the resend countdown) instead of bouncing back to the mobile step.
 * Cleared on successful sign-in or when the user changes their number.
 *
 * The Firebase `ConfirmationResult` itself is non-serialisable, so it lives in
 * a module singleton inside the phone-auth service — this store only carries
 * the serialisable bits needed to render the verify screen across a refresh.
 */
export const useOtpSessionStore = create<OtpSessionState>()(
  persist(
    (set) => ({
      session: null,
      startSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'sales-admin-otp',
      // Encrypted & session-only (no rememberMe → cleared on browser close);
      // hydrated explicitly in main.tsx so the verify-route guard sees the
      // pending session synchronously.
      storage: createJSONStorage(createIdbSessionStorage),
      skipHydration: true,
    },
  ),
)
