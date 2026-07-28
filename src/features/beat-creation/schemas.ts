import { z } from 'zod'

/** An id that may arrive as a number or a string. */
const idSchema = z.union([z.number(), z.string()])

/**
 * An expanded distributor object under `distributors`. The key names aren't
 * pinned down on the backend, so both `id`/`distributor_id` and
 * `name`/`firm_name`/`distributor_name` are accepted.
 */
const beatDistributorSchema = z.object({
  id: idSchema.nullish(),
  distributor_id: idSchema.nullish(),
  name: z.string().nullish(),
  firm_name: z.string().nullish(),
  distributor_name: z.string().nullish(),
})

/**
 * A single row from GET /sales-incharge-admin/beats. `id`/`city_id`/
 * distributor ids accept number or string since the backend's exact type isn't
 * pinned down; `grade` is a free-form string and resolved `*_name` labels are
 * optional. A beat maps to many distributors — they may come back as
 * `distributors` objects, as parallel `distributor_ids`/`distributor_names`
 * arrays, or (legacy) as a single `distributor_id`. Timestamps are accepted but
 * ignored by the client mapping.
 */
export const beatRowSchema = z.object({
  id: idSchema.transform(String),
  name: z.string(),
  grade: z.string().nullish(),
  distributors: z.array(beatDistributorSchema).nullish(),
  distributor_ids: z.array(idSchema).nullish(),
  distributor_names: z.array(z.string()).nullish(),
  distributor_id: idSchema.nullish(),
  distributor_name: z.string().nullish(),
  city_id: idSchema.nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
})

/**
 * The list endpoint envelope: rows under `beats` alongside the
 * `total`/`page`/`page_size`/`total_pages` pagination fields.
 */
export const beatListResponseSchema = z.object({
  beats: z.array(beatRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/** A full beat record from GET /sales-incharge-admin/beats/{id}. */
export const beatDetailSchema = beatRowSchema

export type BeatRow = z.infer<typeof beatRowSchema>
export type BeatListResponse = z.infer<typeof beatListResponseSchema>
