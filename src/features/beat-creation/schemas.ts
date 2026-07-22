import { z } from 'zod'

/**
 * A single row from GET /sales-incharge-admin/beats. `id`/`city_id`/
 * `distributor_id` accept number or string since the backend's exact type isn't
 * pinned down; `grade` is a free-form string and resolved `*_name` labels are
 * optional. Timestamps are accepted but ignored by the client mapping.
 */
export const beatRowSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  name: z.string(),
  grade: z.string().nullish(),
  distributor_id: z.union([z.number(), z.string()]).nullish(),
  distributor_name: z.string().nullish(),
  city_id: z.union([z.number(), z.string()]).nullish(),
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
