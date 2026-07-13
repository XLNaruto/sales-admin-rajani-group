import type { AuthUser } from '@/stores/auth-store'

export type { AuthUser }

/**
 * Raw token response from POST /sales-incharge-admin/auth/login and /auth/refresh.
 * The login response carries no `user` object — the client user is built from
 * the verified phone identity (see `userFromPhone` in `api/auth-api.ts`).
 */
export interface TokenResponse {
  access_token: string
  refresh_token: string
  /** Access-token lifetime in seconds. */
  expires_in?: number
}

/** The client-side session a successful sign-in resolves to. */
export interface AuthSession {
  user: AuthUser
  token: string
  refreshToken: string
  expiresIn?: number
}
