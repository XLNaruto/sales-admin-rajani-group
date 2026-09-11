import { z } from 'zod'

/** The four states a day-change request can be in. */
export const dayChangeStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

/**
 * What the request is asking for. `update` REPLACES the date's un-worked
 * entries with the proposed ones; `create` ADDS them beside what is there.
 */
export const dayChangeOperationSchema = z.enum(['update', 'create'])

/**
 * One proposed piece of work. The API resolves activity, distributor and beat
 * NAMES onto it so the queue can be answered without opening the plan.
 */
const dayChangeEntryFields = {
    id: z.number(),
    sequence: z.number(),
    activity_id: z.number(),
    activity_name: z.string().nullable(),
    distributor_id: z.number().nullable(),
    distributor_name: z.string().nullable(),
    city_id: z.number().nullable(),
    beat_ids: z.array(z.number()),
    beat_names: z.array(z.string()),
    distributor_ids: z.array(z.number()),
    joint_working_sales_incharge_id: z.number().nullable(),
    reason: z.string().nullable(),
}

/** The shared camelCase mapping, so a current entry and a proposed one agree. */
const toEntry = (e: z.infer<z.ZodObject<typeof dayChangeEntryFields>>) => ({
    id: e.id,
    sequence: e.sequence,
    activityId: e.activity_id,
    activityName: e.activity_name,
    distributorId: e.distributor_id,
    distributorName: e.distributor_name,
    cityId: e.city_id,
    beatIds: e.beat_ids,
    beatNames: e.beat_names,
    distributorIds: e.distributor_ids,
    jointWorkingSalesInchargeId: e.joint_working_sales_incharge_id,
    reason: e.reason,
})

export const dayChangeEntrySchema = z.object(dayChangeEntryFields).transform(toEntry)

/**
 * One piece of work ALREADY on the date, sent so the admin can see what the ask
 * would cost him rather than only what it would add.
 *
 * The three extra flags are the whole point of the comparison: `visited` and
 * `fixed_by_admin` work is kept whatever the answer, and `will_be_replaced` is
 * the server's own verdict on which rows an approval actually drops.
 */
export const dayChangeCurrentEntrySchema = z
  .object({
    ...dayChangeEntryFields,
    fixed_by_admin: z.boolean().optional(),
    visited: z.boolean().optional(),
    will_be_replaced: z.boolean().optional(),
  })
  .transform((e) => ({
    ...toEntry(e),
    fixedByAdmin: e.fixed_by_admin ?? false,
    visited: e.visited ?? false,
    willBeReplaced: e.will_be_replaced ?? false,
  }))

/**
 * One day-change row as the API sends it — the same shape on the list and in
 * the review response. Mapped to the client-facing camelCase shape here, so
 * nothing downstream deals in snake_case.
 */
export const dayChangeRowSchema = z
  .object({
    id: z.number(),
    journey_plan_id: z.number(),
    journey_plan_day_id: z.number().nullable(),
    date: z.string(),
    operation: dayChangeOperationSchema,
    reason: z.string(),
    status: dayChangeStatusSchema,
    entries: z.array(dayChangeEntrySchema),
    // Older responses predate it, so an absent list is "nothing to compare"
    // rather than a parse failure that would blank the whole queue.
    current_entries: z.array(dayChangeCurrentEntrySchema).default([]),
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
    date: r.date,
    operation: r.operation,
    reason: r.reason,
    status: r.status,
    // Sent in the order the rep intends to work them; sorted here so the UI
    // never has to care whether the API kept that promise.
    entries: [...r.entries].sort((a, b) => a.sequence - b.sequence),
    currentEntries: [...r.current_entries].sort((a, b) => a.sequence - b.sequence),
    requestedAt: r.requested_at,
    reviewedAt: r.reviewed_at,
    rejectionReason: r.rejection_reason,
    dayLocked: r.day_locked,
    salesInchargeId: r.sales_incharge_id,
    salesInchargeName: r.sales_incharge_name,
  }))

/** The day-change list envelope (rows + pagination metadata). */
export const dayChangeListResponseSchema = z.object({
  day_changes: z.array(dayChangeRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/**
 * PATCH /day-changes/{id}/status — the answered request plus what the approval
 * actually wrote to the date. `applied` is null on a rejection: nothing moved.
 */
export const dayChangeReviewResponseSchema = z
  .object({
    day_change: dayChangeRowSchema,
    applied: z
      .object({
        journey_plan_day_id: z.number(),
        entries_removed: z.number(),
        entries_added: z.number(),
        entries_kept: z.number(),
      })
      .nullable(),
  })
  .transform((r) => ({
    dayChange: r.day_change,
    applied: r.applied
      ? {
          journeyPlanDayId: r.applied.journey_plan_day_id,
          entriesRemoved: r.applied.entries_removed,
          entriesAdded: r.applied.entries_added,
          entriesKept: r.applied.entries_kept,
        }
      : null,
  }))
