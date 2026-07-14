import { z } from 'zod'

/**
 * Zod schemas for the geography masters
 * (GET /sales-incharge-admin/{states,zones,districts,talukas,cities}).
 *
 * Every endpoint answers with the same `{ items, total }` envelope. Parent
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

/** Build the `{ items, total }` list envelope for a given row schema. */
const listResponseSchema = <T extends z.ZodTypeAny>(row: T) =>
  z.object({
    items: z.array(row),
    total: z.number().optional(),
  })

export const stateListResponseSchema = listResponseSchema(stateRowSchema)
export const zoneListResponseSchema = listResponseSchema(zoneRowSchema)
export const districtListResponseSchema = listResponseSchema(districtRowSchema)
export const talukaListResponseSchema = listResponseSchema(talukaRowSchema)
export const cityListResponseSchema = listResponseSchema(cityRowSchema)

export type StateRow = z.infer<typeof stateRowSchema>
export type ZoneRow = z.infer<typeof zoneRowSchema>
export type DistrictRow = z.infer<typeof districtRowSchema>
export type TalukaRow = z.infer<typeof talukaRowSchema>
export type CityRow = z.infer<typeof cityRowSchema>
