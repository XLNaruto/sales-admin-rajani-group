/**
 * Wire schemas for the two location-tracking reads.
 *
 * snake_case, because that is what the API speaks — the mapping to the camelCase
 * domain types happens in `api/`, never in a component. Nullable is used
 * liberally on purpose: a rep who never reported is a row with every coordinate
 * missing, and a strict schema would turn the screen's most important message
 * into a blank page.
 *
 * Coordinates are parsed as **strings**. The column is `numeric(9,6)` and the
 * value travels as a string so no precision is lost; nothing here rounds it
 * through a float.
 *
 * The live contract is Swagger (`<api-base>/sales-incharge-admin/docs`); these
 * schemas are the client's own guard rails over it.
 */
import { z } from 'zod'

/** An id that may arrive as a number or a string — normalised to a string. */
const id = z.union([z.number(), z.string()]).transform(String)

const optionalId = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => (v == null || v === '' ? null : String(v)))

/**
 * A `numeric` column. Kept as the string it arrived as — a number on the wire is
 * stringified rather than the other way round, so a coordinate never round-trips
 * through a float.
 */
const decimal = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => (v == null || v === '' ? null : String(v)))

const bool = z
  .boolean()
  .nullish()
  .transform((v) => Boolean(v))

const int = z.coerce
  .number()
  .nullish()
  .transform((v) => v ?? 0)

const nullableInt = z.coerce
  .number()
  .nullish()
  .transform((v) => (v == null ? null : v))

/** Paged envelope — the array key is the snake_case plural resource noun. */
const pageMeta = {
  total: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
  total_pages: z.coerce.number().optional(),
}

/** One rep + their latest fix on the tracked day. */
export const fleetFixSchema = z.object({
  sales_incharge_id: id,
  sales_incharge_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  status: z.string().nullish(),
  latitude: decimal,
  longitude: decimal,
  beat_id: optionalId,
  beat_name: z.string().nullish(),
  /** The LATEST fix's own mock-location report. */
  is_fake_location: bool,
  /** True if ANY fix on the tracked day carried the mock flag. */
  has_fake_location: bool,
  /** How many fixes on the tracked day carried it. */
  fake_location_count: int,
  recorded_at: z.string().nullish(),
  /** Floored, server-stamped per response — never recomputed on the client. */
  last_seen_minutes_ago: nullableInt,
  is_stale: bool,
})

/** GET /locations/live. Note the array key: `sales_incharge_locations`. */
export const fleetResponseSchema = z.object({
  sales_incharge_locations: z.array(fleetFixSchema).nullish(),
  ...pageMeta,
})

export const trailPointSchema = z.object({
  id,
  latitude: decimal,
  longitude: decimal,
  beat_id: optionalId,
  beat_name: z.string().nullish(),
  is_fake_location: bool,
  recorded_at: z.string().nullish(),
})

/** GET /locations/trail — an empty day is a valid 200, not a 404. */
export const trailResponseSchema = z.object({
  sales_incharge_id: id,
  sales_incharge_name: z.string().nullish(),
  tracked_date: z.string(),
  points: z.array(trailPointSchema).nullish(),
  total_points: int,
  distance_metres: int,
  mock_suspected_count: int,
  first_seen_at: z.string().nullish(),
  last_seen_at: z.string().nullish(),
})

export type FleetFixRow = z.infer<typeof fleetFixSchema>
export type FleetResponse = z.infer<typeof fleetResponseSchema>
export type TrailResponse = z.infer<typeof trailResponseSchema>
