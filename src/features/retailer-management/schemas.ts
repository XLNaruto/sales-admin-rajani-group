import { z } from 'zod'

/**
 * Lifecycle status — the API documents exactly `active` | `inactive`. Tolerant
 * (`.catch`) at the call sites so an unexpected value can't break a whole page.
 */
export const retailerStatusSchema = z.enum(['active', 'inactive'])

/** Onboarding-approval workflow state (independent of the lifecycle status). */
export const retailerOnboardingStatusSchema = z.enum(['pending', 'approved', 'rejected'])

/**
 * One owner/partner of an outlet, as returned inside the `owners` array. An
 * outlet always has at least one; `name` is null only for records migrated from
 * the old single-owner shape with no name recorded. The two date columns come
 * back as 'YYYY-MM-DD' strings.
 *
 * Each owner carries their own `alternate_mobile` — a second line for that
 * person, replacing the record-level column the API used to keep.
 */
export const retailerOwnerRowSchema = z.object({
  name: z.string().nullish(),
  mobile: z.string(),
  alternate_mobile: z.string().nullish(),
  birth_date: z.string().nullish(),
  marriage_anniversary: z.string().nullish(),
})

export type RetailerOwnerRow = z.infer<typeof retailerOwnerRowSchema>

/**
 * A distributor serving the outlet's beat, as returned inside `distributors`.
 * An outlet's distributors are derived from its beat, never linked directly, so
 * a beat served by several firms yields several entries (primary first).
 */
export const retailerDistributorRowSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  name: z.string().nullish(),
})

export type RetailerDistributorRow = z.infer<typeof retailerDistributorRowSchema>

/**
 * A single row from GET /sales-incharge-admin/retailers. The endpoint returns
 * the same full record the detail route does, so the list carries every owner
 * and every distributor. Only the columns the table reads are declared here;
 * all of them stay optional so a sparsely-populated record still validates.
 * Ids accept number or string since the backend's exact type isn't pinned down.
 */
export const retailerRowSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  retailer_code: z.string().nullish(),
  shop_name: z.string(),
  // Every owner/partner of the outlet — there is no single `owner_name` column.
  owners: z.array(retailerOwnerRowSchema).nullish(),
  market: z.string().nullish(),
  city_id: z.union([z.number(), z.string()]).nullish(),
  city_name: z.string().nullish(),
  beat_id: z.union([z.number(), z.string()]).nullish(),
  beat_name: z.string().nullish(),
  // An outlet's distributors come from its beat, not from a direct link.
  distributors: z.array(retailerDistributorRowSchema).nullish(),
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
  // Every owner/partner of the outlet, oldest first — each with their own
  // alternate number.
  owners: z.array(retailerOwnerRowSchema).nullish(),

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
  // coordinates (assigned on create), and the distributors are the firms
  // serving that beat — an array, since a beat can be served by several.
  beat_id: z.number().nullish(),
  beat_name: z.string().nullish(),
  distributors: z.array(retailerDistributorRowSchema).nullish(),

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

