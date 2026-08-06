import type { AuthUser } from '@/stores/auth-store'

export type { AuthUser }

/** Credentials POST /sales-incharge-admin/auth/password-login expects. */
export interface LoginCredentials {
  /** Login handle; case-sensitive. */
  username: string
  password: string
}

/**
 * Raw token response from POST /sales-incharge-admin/auth/password-login and
 * /auth/refresh. Neither carries a `user` object — the signed-in profile comes
 * from `GET /sales-incharge-admin/me`.
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
