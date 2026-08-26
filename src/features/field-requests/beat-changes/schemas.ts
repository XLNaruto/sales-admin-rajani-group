import { z } from 'zod'

/** The four states a beat-change request can be in. */
export const beatChangeStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

/**
 * One beat-change row as the API sends it — the same shape on the list and in
 * the review response. Mapped to the client-facing camelCase shape here, so
 * nothing downstream deals in snake_case.
 */
export const beatChangeRowSchema = z
  .object({
    id: z.number(),
    journey_plan_id: z.number(),
    journey_plan_day_id: z.number(),
    journey_plan_day_activity_id: z.number(),
    plan_date: z.string(),
    activity_id: z.number(),
    distributor_id: z.number().nullable(),
    city_id: z.number().nullable(),
    from_beat_id: z.number(),
    from_beat_name: z.string().nullable(),
    to_beat_id: z.number(),
    to_beat_name: z.string().nullable(),
    reason: z.string(),
    status: beatChangeStatusSchema,
    requested_at: z.string(),
    reviewed_at: z.string().nullable(),
    rejection_reason: z.string().nullable(),
    day_locked: z.boolean(),
    sales_incharge_id: z.number(),
    sales_incharge_name: z.string().nullable(),
  })
  .transform((r) => ({
    id: r.id,
    journeyPlanId: r.journey_plan_id,
    journeyPlanDayId: r.journey_plan_day_id,
    journeyPlanDayActivityId: r.journey_plan_day_activity_id,
    planDate: r.plan_date,
    activityId: r.activity_id,
    distributorId: r.distributor_id,
    cityId: r.city_id,
    fromBeatId: r.from_beat_id,
    fromBeatName: r.from_beat_name,
    toBeatId: r.to_beat_id,
    toBeatName: r.to_beat_name,
    reason: r.reason,
    status: r.status,
    requestedAt: r.requested_at,
    reviewedAt: r.reviewed_at,
    rejectionReason: r.rejection_reason,
    dayLocked: r.day_locked,
    salesInchargeId: r.sales_incharge_id,
    salesInchargeName: r.sales_incharge_name,
  }))

/** The beat-change list envelope (rows + pagination metadata). */
export const beatChangeListResponseSchema = z.object({
  beat_changes: z.array(beatChangeRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/**
 * PATCH /beat-changes/{id}/status — the answered request plus the entry's beats
 * as the day now stands.
 */
export const beatChangeReviewResponseSchema = z
  .object({
    beat_change: beatChangeRowSchema,
    day_beat_ids: z.array(z.number()),
  })
  .transform((r) => ({ beatChange: r.beat_change, dayBeatIds: r.day_beat_ids }))
