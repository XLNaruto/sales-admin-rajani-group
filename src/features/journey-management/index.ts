export { AllocationListPage } from './pages/allocation-list-page'
export { JourneyPlanPage } from './pages/journey-plan-page'
export { LiveMapPage } from './pages/live-map-page'
export { LiveDayPage } from './pages/live-day-page'

/* Query + mutation hooks — the only way another feature may reach these endpoints. */
export { useJourneyPlanQueue, useCreateJourneyPlan } from './api/use-journey-plans'
export {
  useJourneyPlanDetail,
  useJourneyPlanReps,
  useAllocationOptions,
  useActivities,
  useAllocatedBeats,
  useSaveAllocation,
  useSaveSchedule,
  usePublishJourneyPlan,
  useApproveJourneyPlan,
} from './api/use-journey-plan-detail'
export { useLiveMonth, useLiveDayDetail } from './api/use-live-day'

/* Pure helpers, safe to reuse anywhere. */
export {
  completionBand,
  flagCodeLabel,
  COMPLETION_THRESHOLDS,
} from './lib/journey-metrics'
export {
  dayKindOf,
  activityByCode,
  activityById,
  requiresBeat,
  isWorkingDay,
  NON_WORKING_CODES,
} from './lib/activities'
export { planIssues, isLocked, COMPLETION_FAIR, COMPLETION_GOOD } from './lib/plan-flags'
export { bucketKey } from './lib/allocation-buckets'
export type { BucketDraft } from './lib/allocation-buckets'
export {
  PLAN_STATUS_CHAIN,
  PLAN_STATUS_LABEL,
  PLAN_STATUS_HINT,
  PLAN_STATUS_TONE,
  toPlanStatus,
  statusRank,
  scheduleOwner,
  canEditAllocation,
  canEditSchedule,
  isPublishable,
  isApprovable,
  unscheduledIsAProblem,
} from './lib/plan-status'
export {
  DAY_LABEL_COLOR,
  DAY_LABEL_TEXT,
  DAY_LABEL_HINT,
  DAY_LABEL_LEGEND,
  ADMIN_MARK_COLOR,
} from './lib/day-label'
export {
  isOnField,
  isFlagged,
  daysInScope,
  scopeCounts,
  activityTone,
  activityLabel,
  activityBadges,
  trailCount,
  visitsInFilter,
  missesInFilter,
  withPoint,
  routeStateNote,
  STATUS_LABEL,
  PRODUCTIVITY_GOOD,
  PRODUCTIVITY_FAIR,
} from './lib/live-day-metrics'
export {
  currentMonth,
  todayISO,
  monthOf,
  monthRange,
  monthDates,
  dayLabel,
  monthLabel,
  shiftMonth,
  shiftDate,
  dayOfMonth,
  timeOfDay,
  stampLabel,
  durationLabel,
  toKm,
  toKmPrecise,
} from './lib/journey-format'
export {
  TRAIL_LEGEND,
  VISIT_KINDS,
  kindStyle,
  kindLabel,
  NOT_VISITED_STYLE,
  PRODUCTIVE_STYLE,
} from './lib/visit-kinds'

export type {
  ActivityAllocation,
  ActivityCode,
  ActivityDef,
  AllocationOptions,
  AgentConversation,
  AgentMessage,
  AgentStreamEvent,
  AllocatedBeat,
  CreatePlanInput,
  DistributorAllocation,
  DayAttendance,
  DayCounters,
  DayFacets,
  DayKind,
  DayLabel,
  DayOrigin,
  DayRoute,
  DayScope,
  DayVisit,
  FlagSeverity,
  GeoPoint,
  IssueCategory,
  JourneyPlan,
  JourneyPlanDetail,
  LiveDayDetail,
  LiveMonthResult,
  LiveMonthTotals,
  MonthStripDay,
  OutletMarker,
  PlanDay,
  PlanDayBeat,
  PlanDayEntry,
  PlanFlag,
  PlanFlagCode,
  PlanIssue,
  PlanProgress,
  PlanRepOption,
  PlanSource,
  PlanStatus,
  QueueParams,
  QueueResult,
  QueueSortBy,
  RepDayStatus,
  RepDaySummary,
  SaveAllocationInput,
  SaveScheduleInput,
  ScheduleDayInput,
  ScheduleEntryInput,
  ScheduledOutlet,
  ToolActivity,
  TransitionResult,
  TrailFilter,
  VisitKind,
  VisitMarker,
} from './types'
