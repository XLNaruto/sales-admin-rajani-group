import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'

/** Platforms the backend accepts for a registered FCM token. */
export type FcmPlatform = 'android' | 'ios' | 'web'

export interface SaveFcmTokenBody {
  token: string
  platform?: FcmPlatform
  /** Stable per-device identifier, so a device's token can be re-linked. */
  device_id?: string
}

/**
 * POST /sales-incharge-admin/fcm-token — register or refresh this device's FCM
 * registration token for push notifications. Idempotent: resubmitting the same
 * token reassigns it to the current authenticated user (ownership derives from
 * the access token, not the payload).
 */
export async function saveFcmToken(body: SaveFcmTokenBody): Promise<void> {
  try {
    await http.post(endpoints.FCM.TOKEN, body)
  } catch (error) {
    throw asApiError(error, "Couldn't register this device for notifications.")
  }
}
