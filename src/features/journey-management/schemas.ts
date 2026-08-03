/**
 * Wire schemas for the journey-management endpoints.
 *
 * snake_case throughout, because that is what the API speaks — the mapping to
 * the camelCase domain types happens in `api/`, never in a component. Optional
 * and nullable are used liberally on purpose: the panel must render a rep with
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

const int = z.coerce.number().nullish().transform((v) => v ?? 0)
const nullableInt = z.coerce.number().nullish().transform((v) => (v == null ? null : v))

/** Paged envelope: the array key is always the snake_case plural resource noun. */
const pageMeta = {
  total: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
  total_pages: z.coerce.number().optional(),
}

/* ───────────────────────────── approval queue ─────────────────────────────── */

export const rhythmDaySchema = z.object({
  date: z.string(),
  activity_code: z.string().nullish(),
  beat_count: int,
  flagged: z.boolean().nullish(),
})

export const journeyPlanRowSchema = z.object({
  id,
  sales_incharge_id: optionalId,
  sales_incharge_name: z.string().nullish(),
  sales_incharge_code: z.string().nullish(),
  sales_incharge_city: z.string().nullish(),
  status: z.string(),
  coverage_percentage: int,
  working_days: int,
  beats_scheduled: int,
  flag_count: int,
  flag_codes: z.array(z.string()).nullish(),
  month_rhythm: z.array(rhythmDaySchema).nullish(),
})

/**
 * GET /journey-plans/summary — the period's counts, which the list endpoint does
 * NOT carry. Every figure spans the whole period and ignores the list's filters,
 * which is exactly why it is its own request.
 */
export const queueSummarySchema = z.object({
  total_plans: int,
  pending_approval_plans: int,
  approved_plans: int,
  draft_plans: int,
  clean_plans: int,
  flagged_plans: int,
  average_coverage: int,
  reviewed_percentage: int,
  generated_at: z.string().nullish(),
  filter_options: z
    .object({
      cities: z.array(z.string()).nullish(),
      flag_codes: z.array(z.string()).nullish(),
    })
    .nullish(),
})

export const journeyPlanListSchema = z.object({
  journey_plans: z.array(journeyPlanRowSchema),
  ...pageMeta,
})

export const bulkApproveSchema = z.object({
  approved: int,
  skipped: int,
  results: z
    .array(
      z.object({
        journey_plan_id: id,
        outcome: z.string(),
      }),
    )
    .nullish(),
})

export const generateSchema = z.object({
  results: z
    .array(
      z.object({
        sales_incharge_id: optionalId,
        outcome: z.string(),
        journey_plan_id: optionalId,
      }),
    )
    .nullish(),
})

/* ─────────────────────────────── plan detail ──────────────────────────────── */

export const planDayBeatSchema = z.object({
  id,
  beat_id: id,
  beat_name: z.string().nullish(),
  workload: z.string().nullish(),
  source: z.string().nullish(),
  sequence: int,
  stop_count: int,
  locked: z.boolean().nullish(),
})

export const planDaySchema = z.object({
  id,
  date: z.string(),
  sequence: int,
  activity_id: z.coerce.number().nullish(),
  activity_code: z.string().nullish(),
  activity_name: z.string().nullish(),
  beats: z.array(planDayBeatSchema).nullish(),
  joint_working_sales_incharge_id: optionalId,
  joint_working_sales_incharge_name: z.string().nullish(),
  reason: z.string().nullish(),
  locked: z.boolean().nullish(),
  locked_at: z.string().nullish(),
  solver_reason: z
    .object({
      rule: z.string(),
      facts: z.record(z.string(), z.unknown()).nullish(),
    })
    .nullish(),
})

export const planFlagSchema = z.object({
  code: z.string(),
  date: z.string().nullish(),
  beat_id: optionalId,
  beat_name: z.string().nullish(),
  outlet_count: nullableInt,
  facts: z.record(z.string(), z.unknown()).nullish(),
})

export const journeyPlanDetailSchema = z.object({
  id,
  sales_incharge_id: optionalId,
  sales_incharge_name: z.string().nullish(),
  sales_incharge_code: z.string().nullish(),
  sales_incharge_city: z.string().nullish(),
  period_month: z.string(),
  status: z.string(),
  generated_at: z.string().nullish(),
  generated_by: z.string().nullish(),
  coverage_percentage: int,
  beats_scheduled: int,
  working_days: int,
  total_days: int,
  planned_travel_km: nullableInt,
  /** Nullable and null ≠ 0 — the travel load is unmeasurable, not zero. */
  avg_km_per_day: nullableInt,
  flags: z.array(planFlagSchema).nullish(),
  flag_summary: z
    .object({
      remaining_count: int,
      /** The remainder split by flag code — the client words each code itself. */
      remaining_by_code: z
        .record(z.string(), z.object({ count: int, outlet_count: nullableInt }))
        .nullish(),
    })
    .nullish(),
  flag_count: int,
  days: z.array(planDaySchema).nullish(),
})

export const planRepsSchema = z.object({
  sales_incharges: z.array(
    z.object({
      sales_incharge_id: id,
      sales_incharge_name: z.string().nullish(),
      sales_incharge_code: z.string().nullish(),
      journey_plan_id: optionalId,
      status: z.string().nullish(),
    }),
  ),
})

export const reSolveSchema = z.object({
  journey_plan: journeyPlanDetailSchema,
  diff: z
    .object({
      entries: z
        .array(
          z.object({
            date: z.string(),
            removed_beat_ids: z.array(id).nullish(),
            added_beat_ids: z.array(id).nullish(),
            activity_changed: z.boolean().nullish(),
          }),
        )
        .nullish(),
      days_changed: int,
      beats_moved: int,
      days_held: int,
    })
    .nullish(),
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
 * The rep's allocated beats. Shared with the beat-allocation screen, so the row
 * shape is only partly ours — everything but id/name is optional.
 */
export const allocatedBeatListSchema = z.object({
  beats: z.array(
    z.object({
      id,
      name: z.string().nullish(),
      beat_name: z.string().nullish(),
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

const beatRefSchema = z
  .object({ id, name: z.string().nullish() })
  .nullish()

export const liveDetailSchema = z.object({
  date: z.string(),
  status: z.string(),
  counters: countersSchema,
  assigned_beat: beatRefSchema,
  selected_beat: beatRefSchema,
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
      origin: z
        .object({ latitude: decimal, longitude: decimal })
        .nullish(),
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
  journey_plan_id: id,
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
        content: z.union([z.array(z.record(z.string(), z.unknown())), z.string()]).nullish(),
        error: z.string().nullish(),
        created_at: z.string().nullish(),
      }),
    )
    .nullish(),
})

export type JourneyPlanRow = z.infer<typeof journeyPlanRowSchema>
export type JourneyPlanDetailRow = z.infer<typeof journeyPlanDetailSchema>
export type LiveDetailRow = z.infer<typeof liveDetailSchema>
