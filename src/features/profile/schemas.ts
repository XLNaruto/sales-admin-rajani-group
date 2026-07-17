import { z } from 'zod'

/** Account status values `GET /sales-incharge-admin/me` returns. */
export const profileStatusSchema = z.enum([
  'active',
  'invited',
  'suspended',
  'inactive',
])

/**
 * Raw response shape of `GET /sales-incharge-admin/me`. Optional/nullable
 * fields are tolerated so a sparsely-populated record still validates; an
 * unexpected status falls back to `inactive`.
 */
export const myProfileResponseSchema = z.object({
  id: z.number(),
  phone: z.string(),
  display_name: z.string(),
  email: z.string().nullish(),
  status: profileStatusSchema.catch('inactive'),
  created_at: z.string(),
  date_of_joining: z.string().nullish(),
})

export type MyProfileRaw = z.infer<typeof myProfileResponseSchema>
