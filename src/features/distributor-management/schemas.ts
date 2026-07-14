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
 * The list endpoint envelope. The backend may answer with a bare array or wrap
 * rows in a `data`/`items`/`results` envelope alongside a total — accept any of
 * these so the client isn't brittle to the exact pagination shape.
 */
export const distributorListResponseSchema = z.union([
  z.array(distributorRowSchema),
  z.object({
    data: z.array(distributorRowSchema),
    total: z.number().optional(),
    count: z.number().optional(),
  }),
  z.object({
    items: z.array(distributorRowSchema),
    total: z.number().optional(),
    count: z.number().optional(),
  }),
  z.object({
    results: z.array(distributorRowSchema),
    total: z.number().optional(),
    count: z.number().optional(),
  }),
])

export type DistributorRow = z.infer<typeof distributorRowSchema>
export type DistributorListResponse = z.infer<typeof distributorListResponseSchema>

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
