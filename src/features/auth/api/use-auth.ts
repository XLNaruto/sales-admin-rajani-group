import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useCompanyStore } from '@/stores/company-store'
import { disconnectSocket } from '@/lib/realtime'
import { logoutRequest, passwordLogin } from './auth-api'
import type { AuthSession, LoginCredentials } from '../types'

export interface LoginInput extends LoginCredentials {
  /** Keep the session across browser restarts (drives persisted storage). */
  remember: boolean
}

/**
 * Sign in with username + password, then hydrate the auth store with the
 * returned token pair. The full profile is fetched separately by `useMyProfile`
 * once the session exists.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation<AuthSession, Error, LoginInput>({
    mutationFn: ({ username, password }) => passwordLogin({ username, password }),
    onSuccess: ({ user, token, refreshToken }, { remember }) => {
      setSession(user, token, refreshToken, { remember })
    },
  })
}

/**
 * Sign out: revoke the backend refresh token, then clear local client state.
 */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const clearCompany = useCompanyStore((s) => s.clear)

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { refreshToken } = useAuthStore.getState()
      // Best-effort revoke; never block local logout on it.
      await Promise.allSettled([logoutRequest(refreshToken)])
    },
    onSettled: () => {
      logout()
      clearCompany()
      // The realtime socket authenticates with the access token we just dropped —
      // tear it down so the next session builds a fresh one with its own token.
      disconnectSocket()
    },
  })
}
