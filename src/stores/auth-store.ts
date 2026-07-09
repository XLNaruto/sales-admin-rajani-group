import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createIdbSessionStorage } from '@/lib/idb-storage'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'sales-manager' | 'sales-incharge'
  phone?: string
  avatarUrl?: string
}

/** "Remember me" keeps the session for a year; otherwise it's session-only. */
const REMEMBER_MS = 365 * 24 * 60 * 60 * 1000

interface SetSessionOptions {
  remember?: boolean
}

interface AuthState {
  user: AuthUser | null
  /** Short-lived access token, attached as the Bearer on every request. */
  token: string | null
  /** Long-lived refresh token, exchanged at /auth/refresh for a new pair. */
  refreshToken: string | null
  isAuthenticated: boolean
  /** Whether the session should survive a browser restart (persist storage). */
  rememberMe: boolean
  /** Absolute expiry (epoch ms) when remembered; null for session-only. */
  expiresAt: number | null
  /** Establish a full session after sign-in. */
  setSession: (
    user: AuthUser,
    token: string,
    refreshToken: string,
    options?: SetSessionOptions,
  ) => void
  /**
   * Rotate the access token (used by the refresh flow). A refresh token is
   * only replaced when the server returns a rotated one; otherwise the current
   * one is kept.
   */
  setTokens: (token: string, refreshToken?: string | null) => void
  /** Clear the session locally (backend logout is handled by `useLogout`). */
  logout: () => void
}

/**
 * Global auth session — client state, persisted (encrypted) to IndexedDB via
 * `createIdbSessionStorage`. `rememberMe`/`expiresAt` are read by that adapter
 * to decide session-only vs. remembered persistence and expiry.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      rememberMe: false,
      expiresAt: null,
      setSession: (user, token, refreshToken, options) => {
        const remember = options?.remember ?? false
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          rememberMe: remember,
          expiresAt: remember ? Date.now() + REMEMBER_MS : null,
        })
      },
      setTokens: (token, refreshToken) =>
        set((s) => ({ token, refreshToken: refreshToken ?? s.refreshToken })),
      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          rememberMe: false,
          expiresAt: null,
        }),
    }),
    {
      name: 'sales-admin-auth',
      // Tokens encrypted at rest; hydrated explicitly in main.tsx so the
      // synchronous route guards see the restored session on first load.
      storage: createJSONStorage(createIdbSessionStorage),
      skipHydration: true,
    },
  ),
)
