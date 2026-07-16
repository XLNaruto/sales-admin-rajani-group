import { z } from 'zod'

/**
 * Zod schemas for the geography masters
 * (GET /sales-incharge-admin/{states,zones,districts,talukas,cities}).
 *
 * Every endpoint answers with a `{ <key>, total, page, page_size, total_pages }`
 * envelope (the array key matches the master name). Parent
 * name/id fields are nullable — a row can be returned before its lineage is
 * fully populated — so they're all `nullish()` to keep validation forgiving.
 */

const timestamps = {
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
}

export const stateRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  ...timestamps,
})

export const zoneRowSchema = z.object({
  id: z.number(),
  state_id: z.number(),
  state_name: z.string().nullish(),
  name: z.string(),
  ...timestamps,
})

export const districtRowSchema = z.object({
  id: z.number(),
  zone_id: z.number(),
  zone_name: z.string().nullish(),
  name: z.string(),
  ...timestamps,
})

export const talukaRowSchema = z.object({
  id: z.number(),
  district_id: z.number(),
  district_name: z.string().nullish(),
  zone_id: z.number().nullish(),
  zone_name: z.string().nullish(),
  name: z.string(),
  ...timestamps,
})

export const cityRowSchema = z.object({
  id: z.number(),
  taluka_id: z.number(),
  taluka_name: z.string().nullish(),
  district_id: z.number().nullish(),
  district_name: z.string().nullish(),
  zone_id: z.number().nullish(),
  zone_name: z.string().nullish(),
  state_id: z.number().nullish(),
  state_name: z.string().nullish(),
  name: z.string(),
  ...timestamps,
})

/**
 * Build the list envelope for a master. Each endpoint wraps its rows under its
 * own key (`states`, `zones`, `districts`, `talukas`, `cities`) alongside the
 * shared `total`/`page`/`page_size`/`total_pages` pagination fields; this
 * normalises them all to a common `{ items, total, page, pageSize, totalPages }`.
 */
const listResponseSchema = <T extends z.ZodTypeAny>(key: string, row: T) =>
  z
    .object({
      total: z.number().optional(),
      page: z.number().optional(),
      page_size: z.number().optional(),
      total_pages: z.number().optional(),
    })
    .passthrough()
    .transform((res) => {
      const items = z.array(row).parse((res as Record<string, unknown>)[key])
      return {
        items,
        total: res.total ?? items.length,
        page: res.page ?? 1,
        pageSize: res.page_size ?? items.length,
        totalPages: res.total_pages ?? 1,
      }
    })

export const stateListResponseSchema = listResponseSchema('states', stateRowSchema)
export const zoneListResponseSchema = listResponseSchema('zones', zoneRowSchema)
export const districtListResponseSchema = listResponseSchema('districts', districtRowSchema)
export const talukaListResponseSchema = listResponseSchema('talukas', talukaRowSchema)
export const cityListResponseSchema = listResponseSchema('cities', cityRowSchema)

export type StateRow = z.infer<typeof stateRowSchema>
export type ZoneRow = z.infer<typeof zoneRowSchema>
export type DistrictRow = z.infer<typeof districtRowSchema>
export type TalukaRow = z.infer<typeof talukaRowSchema>
export type CityRow = z.infer<typeof cityRowSchema>
