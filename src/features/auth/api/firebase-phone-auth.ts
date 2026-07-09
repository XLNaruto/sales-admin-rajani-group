import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from '@/lib/firebase'

/**
 * Firebase Phone Authentication — the SMS-OTP mechanism behind the sign-in
 * screens. This is the OTP layer only; the backend session (access/refresh
 * tokens) is minted separately by exchanging the Firebase ID token at
 * /sales-admin/auth/login (see `auth-api.ts`).
 *
 * The `<div id="recaptcha-container" />` lives in the shared AuthLayout so the
 * (invisible) reCAPTCHA survives navigation between the mobile and OTP steps,
 * which lets "Resend code" reuse the same verifier.
 */
const RECAPTCHA_CONTAINER_ID = 'recaptcha-container'

let recaptchaVerifier: RecaptchaVerifier | null = null
// The pending "confirm this code" handle from signInWithPhoneNumber. Held in a
// module singleton because it is non-serialisable and must outlive the
// navigation from /login to /verify.
let pendingConfirmation: ConfirmationResult | null = null

function getRecaptcha(): RecaptchaVerifier {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: 'invisible',
    })
  }
  return recaptchaVerifier
}

/** Tear down the reCAPTCHA widget so the next attempt starts from a clean slate. */
function resetRecaptcha() {
  try {
    recaptchaVerifier?.clear()
  } catch {
    // Widget may already be gone (e.g. container unmounted) — ignore.
  }
  recaptchaVerifier = null
}

/** E.164 for India: +91 followed by the 10-digit number. */
function toE164(mobile: string) {
  return `+91${mobile}`
}

/** Map Firebase's error codes to friendly, user-facing copy. */
function toFriendlyMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-phone-number':
        return 'That mobile number looks invalid. Please check and try again.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a while and try again.'
      case 'auth/invalid-verification-code':
        return 'That code isn’t right. Check the SMS and try again.'
      case 'auth/code-expired':
        return 'Your code expired. Please request a new one.'
      case 'auth/operation-not-allowed':
        return 'Phone sign-in isn’t enabled for this app yet.'
      case 'auth/captcha-check-failed':
      case 'auth/missing-app-credential':
        return 'Verification check failed. Please reload and try again.'
      default:
        return err.message
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}

/**
 * Send an OTP over SMS to the given 10-digit mobile number. Triggers the
 * invisible reCAPTCHA flow. Throws with friendly copy on failure.
 */
export async function sendOtp(mobile: string): Promise<void> {
  try {
    pendingConfirmation = await signInWithPhoneNumber(
      auth,
      toE164(mobile),
      getRecaptcha(),
    )
  } catch (err) {
    // A failed attempt can leave the widget in a bad state — reset it so the
    // user can retry cleanly.
    resetRecaptcha()
    throw new Error(toFriendlyMessage(err))
  }
}

export interface ConfirmedIdentity {
  /** Firebase ID token to exchange for a backend session. */
  idToken: string
  uid: string
  phoneNumber: string | null
}

/** Verify the SMS code and return the Firebase ID token for the backend exchange. */
export async function confirmOtp(code: string): Promise<ConfirmedIdentity> {
  if (!pendingConfirmation) {
    throw new Error('Your code expired. Please request a new one.')
  }
  try {
    const cred = await pendingConfirmation.confirm(code)
    const idToken = await cred.user.getIdToken()
    return {
      idToken,
      uid: cred.user.uid,
      phoneNumber: cred.user.phoneNumber,
    }
  } catch (err) {
    throw new Error(toFriendlyMessage(err))
  }
}

/** Drop the pending confirmation (on successful sign-in or "change number"). */
export function clearPendingConfirmation() {
  pendingConfirmation = null
}

/** Sign the Firebase user out (paired with the backend logout). */
export async function firebaseSignOut() {
  clearPendingConfirmation()
  resetRecaptcha()
  await signOut(auth)
}
