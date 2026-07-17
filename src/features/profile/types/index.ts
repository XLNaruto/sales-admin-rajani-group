/** Account status the `/me` endpoint reports. */
export type ProfileStatus = 'active' | 'invited' | 'suspended' | 'inactive'

/**
 * The authenticated sales admin's own profile, as consumed by the UI
 * (camelCase). Mapped from the raw `GET /sales-incharge-admin/me` response.
 */
export interface MyProfile {
  id: number
  phone: string
  displayName: string
  email: string | null
  status: ProfileStatus
  /** ISO date-time the account was created. */
  createdAt: string
  /** ISO date (yyyy-MM-dd) or null when not recorded. */
  dateOfJoining: string | null
}
