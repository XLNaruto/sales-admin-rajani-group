import { z } from 'zod'

/** Status values the list endpoint returns (tolerant — unknown falls back). */
export const distributorStatusSchema = z.enum([
  'active',
  'pending',
  'suspended',
  'rejected',
  'inactive',
])

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
  owner_name: z.string().nullish(),
  owner_mobile: z.string().nullish(),
  email: z.string().nullish(),
  city_id: z.union([z.number(), z.string()]).nullish(),
  market_type: z.string().nullish(),
  market_system: z.string().nullish(),
  status: distributorStatusSchema.catch('pending'),
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
  owner_name: z.string().nullish(),
  owner_mobile: z.string().nullish(),
  owner_birth_date: z.string().nullish(),
  owner_marriage_anniversary: z.string().nullish(),
  communication_mobile: z.string().nullish(),
  multiple_login_allowed: z.boolean().nullish(),
  email: z.string().nullish(),
  office_address: z.string().nullish(),
  godown_address: z.string().nullish(),
  home_address: z.string().nullish(),
  state_id: z.number().nullish(),
  zone_id: z.number().nullish(),
  district_id: z.number().nullish(),
  taluka_id: z.number().nullish(),
  city_id: z.number().nullish(),
  pincode: z.string().nullish(),
  delivery_route: z.string().nullish(),
  taluka_of_agency_ids: z.array(z.number()).nullish(),
  market_type: z.string().nullish(),
  village_ids: z.array(z.number()).nullish(),
  retailers_local_market: z.number().nullish(),
  retailers_rural_market: z.number().nullish(),
  market_system: z.string().nullish(),
  weekly_off: z.string().nullish(),
  geo_location: z.string().nullish(),
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
  payment_condition: z.string().nullish(),
  bank_account_name: z.string().nullish(),
  bank_account_number: z.string().nullish(),
  bank_ifsc: z.string().nullish(),
  bank_name: z.string().nullish(),
})

export type DistributorDetailRow = z.infer<typeof distributorDetailSchema>

/**
 * Response from the presigned-upload endpoints
 * (POST .../{office-images|godown-images|…}/presign). For each requested file
 * the backend returns the storage `key` to persist and a short-lived
 * `upload_url` the client PUTs the raw file bytes to.
 */
export const presignItemSchema = z.object({
  filename: z.string(),
  key: z.string(),
  upload_url: z.string().url(),
  // Echoed back by the shared documents endpoint; used to route each key to the
  // right *_photo_path field. Optional so the image endpoints still validate.
  doc_type: z.string().nullish(),
})

export const presignResponseSchema = z.object({
  items: z.array(presignItemSchema),
})

export type PresignItem = z.infer<typeof presignItemSchema>
export type PresignResponse = z.infer<typeof presignResponseSchema>
