import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import { myProfileResponseSchema } from '../schemas'
import type { MyProfile } from '../types'

/**
 * GET /sales-incharge-admin/me — the authenticated sales admin's own profile,
 * resolved from the access token's subject. Validated then mapped to the
 * camelCase client shape.
 */
export async function fetchMyProfile(): Promise<MyProfile> {
  try {
    const raw = await http.get<unknown>(endpoints.ME.GET)
    const p = myProfileResponseSchema.parse(raw)
    return {
      id: p.id,
      phone: p.phone,
      displayName: p.display_name,
      email: p.email ?? null,
      status: p.status,
      createdAt: p.created_at,
      dateOfJoining: p.date_of_joining ?? null,
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Couldn't load your profile."))
  }
}
