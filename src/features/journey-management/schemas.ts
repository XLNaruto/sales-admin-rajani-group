/**
 * Wire schemas for the journey-management endpoints.
 *
 * snake_case throughout, because that is what the API speaks — the mapping to
 * the camelCase domain types happens in `api/`, never in a component. Optional
 * and nullable are used liberally on purpose: the panel must render a sales incharge with
 * no attendance session, a plan with no coordinates and a day with no route, and
 * a strict schema would turn each of those into a blank screen.
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
  .transform((v) => (v == null ? null : String(v)))

/** A `numeric` column: sent as a string so precision survives the trip. */
const decimal = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => (v == null || v === '' ? null : String(v)))

const int = z.coerce
  .number()
  .nullish()
  .transform((v) => v ?? 0)
const nullableInt = z.coerce
  .number()
  .nullish()
  .transform((v) => (v == null ? null : v))

/** Paged envelope: the array key is always the snake_case plural resource noun. */
const pageMeta = {
  total: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
  total_pages: z.coerce.number().optional(),
}

/* ────────────────────────── shared to list + detail ───────────────────────── */

/**
 * One calendar date of the month, with the label the server derived at read
 * time. Parsed loosely — an unknown `label` must not blank the whole screen, so
 * it is a plain string here and narrowed in `api/`.
 */
export const monthStripDaySchema = z.object({
  date: z.string(),
  label: z.string(),
  activity_code: z.string().nullish(),
  city_id: optionalId,
  origin: z.string().nullish(),
  beat_count: int,
})

/**
 * A warning. Every locator is nullable: a bucket-level flag names a city or an
 * activity and no date, a per-day flag names a date and maybe a beat.
 */
export const planFlagSchema = z.object({
  code: z.string(),
  date: z.string().nullish(),
  city_id: optionalId,
  city_name: z.string().nullish(),
  activity_id: nullableInt,
  activity_name: z.string().nullish(),
  beat_id: optionalId,
  beat_name: z.string().nullish(),
  facts: z.record(z.string(), z.unknown()).nullish(),
})

/* ─────────────────────────────── the plan list ────────────────────────────── */

export const journeyPlanRowSchema = z.object({
  id,
  sales_incharge_id: optionalId,
  sales_incharge_name: z.string().nullish(),
  sales_incharge_code: z.string().nullish(),
  sales_incharge_city: z.string().nullish(),
  status: z.string(),
  days_allocated: int,
  days_scheduled: int,
  days_worked: int,
  scheduling_percentage: int,
  completion_percentage: int,
  cities_allocated: int,
  working_days: int,
  flags: z.array(planFlagSchema).nullish(),
  month_strip: z.array(monthStripDaySchema).nullish(),
})

export const journeyPlanListSchema = z.object({
  journey_plans: z.array(journeyPlanRowSchema),
  ...pageMeta,
})

/**
 * POST /journey-plans/generate — per sales incharge outcomes plus the run's totals. One
 * sales incharge's failure does not fail the run, so `failed > 0` is data, not an error.
 */
export const generateSchema = z.object({
  results: z
    .array(
      z.object({
        sales_incharge_id: optionalId,
        outcome: z.string(),
        journey_plan_id: optionalId,
        days_allocated: int,
        cities_allocated: int,
        /** Dated activity days written straight onto this sales incharge's calendar. */
        days_pinned: int,
        message: z.string().nullish(),
      }),
    )
    .nullish(),
  created: int,
  skipped: int,
  failed: int,
})

/* ──────────────────── the allocation and the schedule ─────────────────────── */

/** One activity bucket, with what the sales incharge has dated against it. */
export const activityAllocationSchema = z.object({
  activity_id: z.coerce.number(),
  activity_code: z.string().nullish(),
  activity_name: z.string().nullish(),
  days_count: int,
  days_scheduled: int,
})

/** One city bucket. `beat_count` reads 0 when the sales incharge no longer has beats here. */
export const cityAllocationSchema = z.object({
  city_id: id,
  city_name: z.string().nullish(),
  days_count: int,
  days_scheduled: int,
  source: z.string().nullish(),
  beat_count: int,
  outlet_count: int,
})

export const planDayBeatSchema = z.object({
  id,
  beat_id: id,
  beat_name: z.string().nullish(),
  sequence: int,
  stop_count: int,
  locked: z.boolean().nullish(),
})

export const planDaySchema = z.object({
  id,
  date: z.string(),
  activity_id: z.coerce.number().nullish(),
  activity_code: z.string().nullish(),
  activity_name: z.string().nullish(),
  city_id: optionalId,
  city_name: z.string().nullish(),
  origin: z.string().nullish(),
  selected_at: z.string().nullish(),
  beats: z.array(planDayBeatSchema).nullish(),
  joint_working_sales_incharge_id: optionalId,
  joint_working_sales_incharge_name: z.string().nullish(),
  reason: z.string().nullish(),
  locked: z.boolean().nullish(),
  locked_at: z.string().nullish(),
})

/**
 * GET /journey-plans/{id}, and the response of both PATCHes — one shape, because
 * every write answers with the plan it just wrote.
 *
 * **`days` is EMPTY on a `draft` and on a freshly `published` plan.** The
 * calendar is drawn from `month_strip`; `days` carries the detail of the dates
 * that exist.
 */
export const journeyPlanDetailSchema = z.object({
  id,
  sales_incharge_id: optionalId,
  sales_incharge_name: z.string().nullish(),
  sales_incharge_code: z.string().nullish(),
  sales_incharge_city: z.string().nullish(),
  period_month: z.string(),
  status: z.string(),
  generated_by: z.string().nullish(),
  generated_at: z.string().nullish(),
  published_at: z.string().nullish(),
  submitted_at: z.string().nullish(),
  approved_at: z.string().nullish(),
  activity_allocations: z.array(activityAllocationSchema).nullish(),
  city_allocations: z.array(cityAllocationSchema).nullish(),
  days_allocated: int,
  days_scheduled: int,
  days_worked: int,
  scheduling_percentage: int,
  completion_percentage: int,
  cities_allocated: int,
  beats_scheduled: int,
  working_days: int,
  total_days: int,
  allocation_variance: int,
  can_publish: z.boolean().nullish(),
  can_approve: z.boolean().nullish(),
  flags: z.array(planFlagSchema).nullish(),
  month_strip: z.array(monthStripDaySchema).nullish(),
  days: z.array(planDaySchema).nullish(),
})

/**
 * GET /journey-plans/allocation-options — the pickers, and the whitelist the
 * allocation Save enforces.
 *
 * `last_worked_date: null` means **never worked**, which the solver weighs
 * heaviest; it is not "long ago".
 */
export const allocationOptionsSchema = z.object({
  sales_incharge_id: optionalId,
  total_days: int,
  activities: z
    .array(
      z.object({
        activity_id: z.coerce.number(),
        code: z.string(),
        name: z.string(),
        is_working_day: z.boolean().nullish(),
      }),
    )
    .nullish(),
  cities: z
    .array(
      z.object({
        city_id: id,
        city_name: z.string().nullish(),
        beat_count: int,
        outlet_count: int,
        last_worked_date: z.string().nullish(),
      }),
    )
    .nullish(),
})

/** POST /:id/publish and /:id/approve — the same receipt from both ends. */
export const transitionSchema = z.object({
  journey_plan_id: id,
  status: z.string(),
  days_allocated: int,
  days_scheduled: int,
})

/** The sales incharge switcher. Carries each sales incharge's plan id and its status, nothing else. */
export const planRepsSchema = z.object({
  sales_incharges: z.array(
    z.object({
      sales_incharge_id: id,
      sales_incharge_name: z.string().nullish(),
      sales_incharge_code: z.string().nullish(),
      journey_plan_id: id,
      status: z.string().nullish(),
    }),
  ),
})

/* ────────────────────────── supporting masters ────────────────────────────── */

export const activityListSchema = z.object({
  activities: z.array(
    z.object({
      id: z.coerce.number(),
      code: z.string(),
      name: z.string(),
      sort_order: z.coerce.number().nullish(),
      requires_beat: z.boolean().nullish(),
      is_working_day: z.boolean().nullish(),
      counts_toward_coverage: z.boolean().nullish(),
      company_id: optionalId,
    }),
  ),
  ...pageMeta,
})

/**
 * The sales incharge's allocated beats. Shared with the beat-allocation screen, so the row
 * shape is only partly ours — everything but id/name is optional.
 *
 * `city_id` is what lets the correction pass check itself: a beat may only go on
 * a day whose city it sits in. **Null is legitimate** — a beat whose primary
 * distributor has no city — so it is nullable rather than required.
 */
export const allocatedBeatListSchema = z.object({
  beats: z.array(
    z.object({
      id,
      name: z.string().nullish(),
      beat_name: z.string().nullish(),
      city_id: optionalId,
      outlet_count: nullableInt,
      retailer_count: nullableInt,
    }),
  ),
  ...pageMeta,
})

/* ───────────────────────────────── live day ───────────────────────────────── */

const countersSchema = z
  .object({
    sc: int,
    tc: int,
    in_turn: int,
    ovt: int,
    to: int,
    pc: int,
    ovc: int,
  })
  .nullish()

export const liveSummariesSchema = z.object({
  rep_day_summaries: z.array(
    z.object({
      date: z.string(),
      status: z.string(),
      activity_code: z.string().nullish(),
      activity_name: z.string().nullish(),
      beat_id: optionalId,
      beat_name: z.string().nullish(),
      counters: countersSchema,
      distance_metres: int,
      mock_suspected_count: int,
      day_start_at: z.string().nullish(),
      day_end_at: z.string().nullish(),
      day_start_address: z.string().nullish(),
    }),
  ),
  totals: z
    .object({
      days: int,
      days_on_field: int,
      off_days: int,
      gps_flagged_days: int,
      total_calls: int,
      productive_calls: int,
      productivity_percentage: int,
      avg_calls_per_day: int,
      distance_metres: int,
    })
    .nullish(),
})

export const liveDetailSchema = z.object({
  date: z.string(),
  status: z.string(),
  counters: countersSchema,
  /**
   * The beats he worked, in the order he took them — this replaced the old
   * `assigned_beat` / `selected_beat` pair, because nothing assigns beats to
   * dates any more.
   */
  beats: z.array(z.object({ id, name: z.string().nullish() })).nullish(),
  /** `true` on a day with no beats at all, not just on a compliant one. */
  on_allocation: z.boolean().nullish(),
  total_distance_metres: int,
  mock_suspected_count: int,
  attendance: z
    .object({
      day_start_at: z.string().nullish(),
      day_end_at: z.string().nullish(),
      elapsed_seconds: nullableInt,
      working_seconds: nullableInt,
      break_seconds: nullableInt,
      session_count: nullableInt,
      check_in_latitude: decimal,
      check_in_longitude: decimal,
      check_out_latitude: decimal,
      check_out_longitude: decimal,
      day_start_address: z.string().nullish(),
      day_end_address: z.string().nullish(),
    })
    .nullish(),
  timeline: z
    .array(
      z.object({
        visit_id: id,
        day_sequence: int,
        at: z.string().nullish(),
        party_name: z.string().nullish(),
        beat_name: z.string().nullish(),
        call_type: z.string().nullish(),
        is_productive: z.boolean().nullish(),
        order_value: decimal,
        dwell_seconds: nullableInt,
        latitude: decimal,
        longitude: decimal,
        reason: z.string().nullish(),
      }),
    )
    .nullish(),
  route: z
    .object({
      drawable: z.boolean().nullish(),
      state: z.string().nullish(),
      origin: z.object({ latitude: decimal, longitude: decimal }).nullish(),
      distance_metres: nullableInt,
      points: z
        .array(
          z.object({
            sequence: int,
            visit_id: optionalId,
            journey_plan_stop_id: optionalId,
            party_name: z.string().nullish(),
            latitude: decimal,
            longitude: decimal,
            day_sequence: int,
            at: z.string().nullish(),
            is_productive: z.boolean().nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  not_visited: z
    .array(
      z.object({
        stop_id: id,
        stop_type: z.string().nullish(),
        party_id: optionalId,
        party_name: z.string().nullish(),
        latitude: decimal,
        longitude: decimal,
        planned_sequence: nullableInt,
      }),
    )
    .nullish(),
  facets: z
    .object({
      in_turn: int,
      telephonic: int,
      ovt: int,
      ovc: int,
      joint_working: int,
      not_visited: int,
      distributor: int,
      official_work: int,
      productive: int,
    })
    .nullish(),
})

/* ─────────────────────────────── the agent ────────────────────────────────── */

export const agentConversationSchema = z.object({
  conversation_id: z.coerce.number(),
  /**
   * Nullable on the wire: the conversation is keyed on (sales incharge, period), so it can
   * outlive the plan it was opened against. A strict `id` here would throw and
   * blank the whole panel over a field nothing reads.
   */
  journey_plan_id: optionalId,
  period_month: z.string(),
  sales_incharge_id: optionalId,
  room: z.string(),
  event: z.string(),
  enabled: z.boolean().nullish(),
  messages: z
    .array(
      z.object({
        id: z.coerce.number(),
        role: z.string(),
        /** Raw Anthropic content blocks, passed through unflattened. */
        content: z
          .union([z.array(z.record(z.string(), z.unknown())), z.string()])
          .nullish(),
        error: z.string().nullish(),
        created_at: z.string().nullish(),
      }),
    )
    .nullish(),
})

export type JourneyPlanRow = z.infer<typeof journeyPlanRowSchema>
export type JourneyPlanDetailRow = z.infer<typeof journeyPlanDetailSchema>
export type LiveDetailRow = z.infer<typeof liveDetailSchema>
