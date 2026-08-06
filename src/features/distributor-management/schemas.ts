import { z } from 'zod'

/** Status values the list endpoint returns (tolerant — unknown falls back). */
export const distributorStatusSchema = z.enum([
  'active',
  'pending',
  'suspended',
  'rejected',
  'inactive',
])

/** Onboarding-approval workflow state (independent of the lifecycle status). */
export const distributorOnboardingStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
])

/**
 * One owner/partner of a firm, as returned inside the `owners` array on both the
 * list and detail endpoints. Every field but `name`/`mobile` is nullable; the
 * two date columns come back as 'YYYY-MM-DD' strings.
 */
export const distributorOwnerSchema = z.object({
  name: z.string(),
  mobile: z.string(),
  email: z.string().nullish(),
  birth_date: z.string().nullish(),
  marriage_anniversary: z.string().nullish(),
})

export type DistributorOwnerRow = z.infer<typeof distributorOwnerSchema>

/**
 * A single row from GET /sales-incharge-admin/distributors. Only the documented
 * (sortable/searchable) columns are relied on; everything else is optional so a
 * sparsely-populated record still validates. `id`/`city_id` accept number or
 * string since the backend's exact type isn't pinned down.
 */
export const distributorRowSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  distributor_code: z.string().nullish(),
  firm_name: z.string(),
  firm_type: z.string().nullish(),
  // Owners/partners of the firm, oldest first. Empty for records created before
  // the backend's owners migration — those must be re-entered on the edit form.
  owners: z.array(distributorOwnerSchema).nullish(),
  email: z.string().nullish(),
  city_id: z.union([z.number(), z.string()]).nullish(),
  city_name: z.string().nullish(),
  product_divisions: z.array(z.union([z.number(), z.string()])).nullish(),
  product_division_names: z.array(z.string()).nullish(),
  market_type: z.string().nullish(),
  market_system: z.string().nullish(),
  status: distributorStatusSchema.catch('pending'),
  onboarding_status: distributorOnboardingStatusSchema.catch('pending'),
})

/**
 * The list endpoint envelope: rows under `distributors` alongside the
 * `total`/`page`/`page_size`/`total_pages` pagination fields. See
 * GET /sales-incharge-admin/distributors → salesInchargeAdminListDistributors.
 */
export const distributorListResponseSchema = z.object({
  distributors: z.array(distributorRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

export type DistributorRow = z.infer<typeof distributorRowSchema>
export type DistributorListResponse = z.infer<typeof distributorListResponseSchema>

/**
 * A full distributor record from GET /sales-incharge-admin/distributors/{id}.
 * Every field the create/update body accepts comes back here so the edit form
 * can be fully seeded. Numeric ids stay numbers; nullable columns are `nullish`.
 */
export const distributorDetailSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  distributor_code: z.string().nullish(),
  status: distributorStatusSchema.catch('active'),
  firm_name: z.string(),
  firm_type: z.string().nullish(),
  legal_name: z.string().nullish(),
  // The firm's owners/partners (replaces the old single owner_* columns).
  owners: z.array(distributorOwnerSchema).nullish(),
  communication_mobile: z.string().nullish(),
  multiple_login_allowed: z.boolean().nullish(),
  email: z.string().nullish(),
  office_address: z.string().nullish(),
  godown_address: z.string().nullish(),
  home_address: z.string().nullish(),
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
  delivery_route: z.string().nullish(),
  taluka_of_agency_ids: z.array(z.number()).nullish(),
  market_type: z.string().nullish(),
  village_ids: z.array(z.number()).nullish(),
  retailers_local_market: z.number().nullish(),
  retailers_rural_market: z.number().nullish(),
  market_system: z.string().nullish(),
  weekly_off: z.string().nullish(),
  // Geo point is stored as two separate string columns (see the API docs —
  // `geo_latitude` / `geo_longitude`); the form joins them into one
  // "lat, lng" value for the map picker.
  geo_latitude: z.string().nullish(),
  geo_longitude: z.string().nullish(),
  office_image_paths: z.array(z.string()).nullish(),
  godown_image_paths: z.array(z.string()).nullish(),
  other_agencies_details: z.string().nullish(),
  similar_category_agencies: z.string().nullish(),
  assigned_products: z.string().nullish(),
  target_per_product: z.string().nullish(),
  delivery_vehicle: z.boolean().nullish(),
  delivery_vehicle_detail: z.string().nullish(),
  godown_size_sqft: z.number().nullish(),
  year_established: z.number().nullish(),
  gstin: z.string().nullish(),
  pan: z.string().nullish(),
  pan_card_photo_path: z.string().nullish(),
  gst_photo_path: z.string().nullish(),
  advance_cheque_numbers: z.string().nullish(),
  advance_cheque_photo_path: z.string().nullish(),
  // Payment terms come from the master: the id is what's stored, the name is
  // what the API resolves alongside it for display.
  payment_condition_id: z.number().nullish(),
  payment_condition_name: z.string().nullish(),
  bank_account_name: z.string().nullish(),
  bank_account_number: z.string().nullish(),
  bank_ifsc: z.string().nullish(),
  bank_name: z.string().nullish(),
  // Product-division ids this distributor handles, plus their resolved names.
  product_divisions: z.array(z.number()).nullish(),
  product_division_names: z.array(z.string()).nullish(),
})

export type DistributorDetailRow = z.infer<typeof distributorDetailSchema>

/**
 * A single row from GET /sales-incharge-admin/product-divisions — the master
 * that backs the "Product Divisions" multi-select on the distributor form.
 */
export const productDivisionRowSchema = z.object({
  id: z.number(),
  name: z.string(),
})

/** The product-division list envelope (rows + pagination metadata). */
export const productDivisionListResponseSchema = z.object({
  product_divisions: z.array(productDivisionRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

export type ProductDivisionRow = z.infer<typeof productDivisionRowSchema>

/**
 * The slice of the updated distributor we read back from
 * PATCH /sales-incharge-admin/distributors/{id}/product-divisions. The endpoint
 * echoes the full record; only the new mapping is of interest here, so the rest
 * is ignored rather than re-validated.
 */
export const distributorProductDivisionsResponseSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  product_divisions: z.array(z.union([z.number(), z.string()])).nullish(),
  product_division_names: z.array(z.string()).nullish(),
})
