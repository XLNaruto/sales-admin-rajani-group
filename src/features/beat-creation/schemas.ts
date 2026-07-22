import { z } from 'zod'

/** Beat grade values — tolerant so an unknown value doesn't fail the row. */
export const beatGradeSchema = z.enum([
  'urban',
  'semi_urban',
  'metro',
  'non_metro',
  'rural',
])

/** Beat lifecycle status. */
export const beatStatusSchema = z.enum(['active', 'inactive'])

/**
 * A single row from GET /sales-incharge-admin/beats. `id`/`city_id`/
 * `distributor_id` accept number or string since the backend's exact type isn't
 * pinned down; resolved `*_name` labels are optional.
 */
export const beatRowSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  beat_name: z.string(),
  beat_grade: beatGradeSchema.catch('urban'),
  distributor_id: z.union([z.number(), z.string()]).nullish(),
  distributor_name: z.string().nullish(),
  status: beatStatusSchema.catch('active'),
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
