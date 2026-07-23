import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { env } from '@/config/env'
import { asApiError } from '@/lib/api-error'
import type { AuthUser } from '@/stores/auth-store'
import type { ConfirmedIdentity } from './firebase-phone-auth'
import type { AuthSession, TokenResponse } from '../types'

/** Account type this portal signs in as; sent on account-check and login. */
const USER_TYPE = env.VITE_APP_USER_TYPE

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

/**
 * POST /sales-incharge-admin/auth/account-check — gate before the Firebase OTP
 * flow: confirm the number belongs to an eligible account so we don't spend an
 * SMS on numbers the backend would reject at login. Throws friendly copy on a
 * non-2xx (e.g. unknown/ineligible number).
 */
export async function accountCheck(phone: string): Promise<void> {
  let data: { account_exists?: boolean }
  try {
    data = await http.post<
      { account_exists?: boolean },
      { phone: string; user_type: string }
    >(endpoints.AUTH.ACCOUNT_CHECK, { phone, user_type: USER_TYPE })
  } catch (error) {
    throw asApiError(error, 'Sign-in failed. Please try again.')
  }
  // The endpoint answers 200 with a flag rather than a non-2xx for unknown
  // numbers, so gate on the body.
  if (!data.account_exists) {
    throw new Error('This account is not authorised to access the sales admin portal.')
  }
}

/** POST /sales-incharge-admin/auth/login — exchange the Firebase ID token for a session. */
export async function loginWithIdToken(
  confirmed: ConfirmedIdentity,
): Promise<AuthSession> {
  try {
    const data = await http.post<
      TokenResponse,
      { id_token: string; user_type: string }
    >(endpoints.AUTH.LOGIN, {
      id_token: confirmed.idToken,
      user_type: USER_TYPE,
    })
    return {
      user: userFromPhone(confirmed),
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  } catch (error) {
    throw asApiError(error, 'Sign-in failed. Please try again.')
  }
}

/** POST /sales-incharge-admin/auth/logout — revoke the refresh token server-side. */
export async function logoutRequest(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return
  await http.post<void, { refresh_token: string }>(endpoints.AUTH.LOGOUT, {
    refresh_token: refreshToken,
  })
}
