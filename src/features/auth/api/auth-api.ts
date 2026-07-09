import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import type { AuthUser } from '@/stores/auth-store'
import type { ConfirmedIdentity } from './firebase-phone-auth'
import type { AuthSession, TokenResponse } from '../types'

/** Build the client user from the verified phone identity. */
function userFromPhone(phone: ConfirmedIdentity): AuthUser {
  const mobile = phone.phoneNumber ?? ''
  return {
    id: phone.uid,
    name: 'Seller',
    email: mobile,
    role: 'admin',
    phone: mobile || undefined,
  }
}

/**
 * Backend session endpoints. The Firebase Phone Auth flow verifies the SMS code
 * client-side; here we trade the resulting Firebase ID token for our own
 * access/refresh pair. The login response carries no user object — identity is
 * derived from the access-token JWT. Token *rotation* on 401 lives in the
 * api-client interceptor (it must use a bare client to avoid recursion).
 */

/** POST /sales-admin/auth/login — exchange the Firebase ID token for a session. */
export async function loginWithIdToken(
  confirmed: ConfirmedIdentity,
): Promise<AuthSession> {
  try {
    const data = await http.post<TokenResponse, { id_token: string }>(
      endpoints.AUTH.LOGIN,
      { id_token: confirmed.idToken },
    )
    return {
      user: userFromPhone(confirmed),
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Sign-in failed. Please try again.'))
  }
}

/** POST /sales-admin/auth/logout — revoke the refresh token server-side. */
export async function logoutRequest(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return
  await http.post<void, { refresh_token: string }>(endpoints.AUTH.LOGOUT, {
    refresh_token: refreshToken,
  })
}
