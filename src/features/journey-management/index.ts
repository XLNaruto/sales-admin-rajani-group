export { ApprovalQueuePage } from './pages/approval-queue-page'
export { JourneyPlanPage } from './pages/journey-plan-page'
export { LiveMapPage } from './pages/live-map-page'
export { LiveDayPage } from './pages/live-day-page'

/* Query + mutation hooks — the only way another feature may reach these endpoints. */
export {
  useJourneyPlanQueue,
  useJourneyPlanPeriodSummary,
  useCleanPendingPlans,
  useApproveJourneyPlan,
  useBulkApproveJourneyPlans,
  useGenerateJourneyPlans,
} from './api/use-journey-plans'
export {
  useJourneyPlanDetail,
  useJourneyPlanReps,
  useActivities,
  useAllocatedBeats,
  useUpdatePlanDay,
  useAddPlanDayBeat,
  useRemovePlanDayBeat,
  useReSolvePlan,
} from './api/use-journey-plan-detail'
export { useLiveMonth, useLiveDayDetail } from './api/use-live-day'

/* Pure helpers, safe to reuse anywhere. */
export {
  coverageBand,
  coverageRange,
  segmentQuery,
  flagCodeLabel,
  COVERAGE_THRESHOLDS,
} from './lib/journey-metrics'
export {
  dayKindOf,
  activityByCode,
  activityById,
  requiresBeat,
  isWorkingDay,
  solverReasonLabel,
  NON_WORKING_CODES,
} from './lib/activities'
export { planIssues, isLocked, isEditable, COVERAGE_FAIR, COVERAGE_GOOD } from './lib/plan-flags'
export {
  isOnField,
  isFlagged,
  daysInScope,
  scopeCounts,
  activityTone,
  activityLabel,
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
  ActivityCode,
  ActivityDef,
  AgentConversation,
  AgentMessage,
  AgentStreamEvent,
  AllocatedBeat,
  ApprovalStatus,
  BulkApproveResult,
  DayAttendance,
  DayCounters,
  DayFacets,
  DayKind,
  DayRoute,
  DayScope,
  DayVisit,
  FlagSeverity,
  GenerateResult,
  GeoPoint,
  IssueCategory,
  JourneyPlan,
  JourneyPlanDetail,
  LiveDayDetail,
  LiveMonthResult,
  LiveMonthTotals,
  OutletMarker,
  PlanDay,
  PlanDayBeat,
  PlanFlag,
  PlanFlagSummary,
  PlanIssue,
  PlanMetrics,
  PlanRepOption,
  QueueFilterOptions,
  QueueParams,
  QueueResult,
  QueueSegment,
  QueueSortBy,
  QueueSummary,
  RepDayStatus,
  RepDaySummary,
  ReSolveDiff,
  ReSolveResult,
  RhythmDay,
  ScheduledOutlet,
  SolverReason,
  ToolActivity,
  TrailFilter,
  VisitKind,
  VisitMarker,
} from './types'
