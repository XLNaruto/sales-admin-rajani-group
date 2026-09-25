import { z } from 'zod'

/**
 * A category row as `GET /categories` sends it. Only what the picker needs is
 * read; `parent_id` / `company_id` are optional because the list doesn't carry
 * them today (`type=parent` already narrows it to the roots, and the endpoint
 * is scoped to the selected company).
 */
export const categoryRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  parent_id: z.number().nullish(),
  company_id: z.number().nullish(),
})

/** The category list envelope (flat rows + pagination metadata). */
export const categoryListResponseSchema = z.object({
  categories: z.array(categoryRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

export type CategoryRow = z.infer<typeof categoryRowSchema>
