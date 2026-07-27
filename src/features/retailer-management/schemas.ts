import { z } from 'zod'

/**
 * Lifecycle status — the API documents exactly `active` | `inactive`. Tolerant
 * (`.catch`) at the call sites so an unexpected value can't break a whole page.
 */
export const retailerStatusSchema = z.enum(['active', 'inactive'])

/** Onboarding-approval workflow state (independent of the lifecycle status). */
export const retailerOnboardingStatusSchema = z.enum(['pending', 'approved', 'rejected'])

/**
 * A single row from GET /sales-incharge-admin/retailers. Only the documented
 * (sortable/searchable) columns are relied on; everything else is optional so a
 * sparsely-populated record still validates. Ids accept number or string since
 * the backend's exact type isn't pinned down.
 */
export const retailerRowSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  retailer_code: z.string().nullish(),
  shop_name: z.string(),
  owner_name: z.string().nullish(),
  owner_mobile: z.string().nullish(),
  market: z.string().nullish(),
  city_id: z.union([z.number(), z.string()]).nullish(),
  city_name: z.string().nullish(),
  beat_id: z.union([z.number(), z.string()]).nullish(),
  beat_name: z.string().nullish(),
  // An outlet's distributor comes from its beat, not from a direct link.
  distributor_id: z.union([z.number(), z.string()]).nullish(),
  distributor_name: z.string().nullish(),
  outlet_type_name: z.string().nullish(),
  status: retailerStatusSchema.catch('inactive'),
  onboarding_status: retailerOnboardingStatusSchema.catch('pending'),
})

/**
 * The list endpoint envelope: rows under `retailers` alongside the
 * `total`/`page`/`page_size`/`total_pages` pagination fields.
 */
export const retailerListResponseSchema = z.object({
  retailers: z.array(retailerRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

export type RetailerRow = z.infer<typeof retailerRowSchema>
export type RetailerListResponse = z.infer<typeof retailerListResponseSchema>

/**
 * A full retailer record from GET /sales-incharge-admin/retailers/{id}. Every
 * field the create/update body accepts comes back here so the edit form can be
 * fully seeded. `latitude`/`longitude` are stored as strings by the API but a
 * numeric response still validates.
 */
export const retailerDetailSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  retailer_code: z.string().nullish(),
  status: retailerStatusSchema.catch('inactive'),
  onboarding_status: retailerOnboardingStatusSchema.catch('pending'),

  shop_name: z.string(),
  owner_name: z.string().nullish(),
  owner_mobile: z.string().nullish(),
  alternate_mobile: z.string().nullish(),
  owner_birth_date: z.string().nullish(),
  owner_marriage_anniversary: z.string().nullish(),

  address_line: z.string().nullish(),
  address: z.string().nullish(),
  formatted_address: z.string().nullish(),
  landmark: z.string().nullish(),
  market: z.string().nullish(),
  state_id: z.number().nullish(),
  state_name: z.string().nullish(),
  zone_id: z.number().nullish(),
  zone_name: z.string().nullish(),
  district_id: z.number().nullish(),
  district_name: z.string().nullish(),
  taluka_id: z.number().nullish(),
  taluka_name: z.string().nullish(),
  city_id: z.number().nullish(),
  city_name: z.string().nullish(),
  pincode: z.string().nullish(),
  // Both derived server-side: the beat is the one closest to the outlet's
  // coordinates, and the distributor is that beat's owner.
  beat_id: z.number().nullish(),
  beat_name: z.string().nullish(),
  distributor_id: z.number().nullish(),
  distributor_name: z.string().nullish(),

  latitude: z.union([z.number(), z.string()]).nullish(),
  longitude: z.union([z.number(), z.string()]).nullish(),

  outlet_type_id: z.number().nullish(),
  outlet_type_name: z.string().nullish(),

  shop_photo_path: z.string().nullish(),

  // Activity counters maintained by the field app.
  last_order_at: z.string().nullish(),
  last_visit_at: z.string().nullish(),
  visit_count: z.number().nullish(),
})

export type RetailerDetailRow = z.infer<typeof retailerDetailSchema>

/**
 * A single row from GET /sales-incharge-admin/outlet-types — the master that
 * backs the "Outlet Type" select on the retailer form. The endpoint calls the
 * label `type_name`; it's mapped to `name` so the option list stays generic.
 */
export const outletTypeRowSchema = z
  .object({
    id: z.number(),
    type_name: z.string(),
    status: retailerStatusSchema.catch('active'),
  })
  .transform((r) => ({ id: r.id, name: r.type_name, status: r.status }))

/** The outlet-type list envelope (rows + pagination metadata). */
export const outletTypeListResponseSchema = z.object({
  outlet_types: z.array(outletTypeRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

export type OutletTypeRow = z.infer<typeof outletTypeRowSchema>
