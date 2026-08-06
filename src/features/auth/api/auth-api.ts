import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import type { AuthUser } from '@/stores/auth-store'
import type { AuthSession, LoginCredentials, TokenResponse } from '../types'

/**
 * Backend session endpoints. Sign-in is a plain username + password exchange
 * that mints our own access/refresh pair. The login response carries no user
 * object — the real profile is loaded separately from `GET /me`, so the client
 * user built here is only a placeholder derived from the username. Token
 * *rotation* on 401 lives in the api-client interceptor (it must use a bare
 * client to avoid recursion).
 */

/** Minimal client user, until `GET /me` fills in the real profile. */
function userFromUsername(username: string): AuthUser {
  return {
    id: username,
    name: username,
    email: username,
    role: 'admin',
  }
}

/**
 * POST /sales-incharge-admin/auth/password-login — exchange credentials for a
 * session. A 401 means `INVALID_CREDENTIALS` or `USER_INACTIVE`; the backend's
 * own message is surfaced, with a friendly fallback.
 */
export async function passwordLogin({
  username,
  password,
}: LoginCredentials): Promise<AuthSession> {
  try {
    const data = await http.post<TokenResponse, LoginCredentials>(
      endpoints.AUTH.PASSWORD_LOGIN,
      { username, password },
    )
    return {
      user: userFromUsername(username),
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  } catch (error) {
    throw asApiError(error, 'Sign-in failed. Please check your credentials.')
  }
}

/** POST /sales-incharge-admin/auth/logout — revoke the refresh token server-side. */
export async function logoutRequest(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return
  await http.post<void, { refresh_token: string }>(endpoints.AUTH.LOGOUT, {
    refresh_token: refreshToken,
  })
}
