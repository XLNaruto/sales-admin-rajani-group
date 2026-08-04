export { AllocationListPage } from './pages/allocation-list-page'
export { JourneyPlanPage } from './pages/journey-plan-page'
export { LiveMapPage } from './pages/live-map-page'
export { LiveDayPage } from './pages/live-day-page'

/* Query + mutation hooks — the only way another feature may reach these endpoints. */
export { useJourneyPlanQueue, useGenerateJourneyPlans } from './api/use-journey-plans'
export {
  useJourneyPlanDetail,
  useJourneyPlanReps,
  useActivities,
  useAllocatedBeats,
  useSaveJourneyPlan,
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
export {
  planIssues,
  isLocked,
  isPinnable,
  COMPLETION_FAIR,
  COMPLETION_GOOD,
} from './lib/plan-flags'
export {
  DAY_LABEL_COLOR,
  DAY_LABEL_TEXT,
  DAY_LABEL_HINT,
  DAY_LABEL_LEGEND,
} from './lib/day-label'
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
  ActivityCode,
  ActivityDef,
  AgentConversation,
  AgentMessage,
  AgentStreamEvent,
  AllocatedBeat,
  AllocatedPlanBeat,
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
  GenerateInput,
  GenerateOutcome,
  GenerateResult,
  GeoPoint,
  IssueCategory,
  JourneyPlan,
  JourneyPlanDetail,
  LiveDayDetail,
  LiveMonthResult,
  LiveMonthTotals,
  MonthStripDay,
  OutletMarker,
  PinnedDay,
  PlanDay,
  PlanDayBeat,
  PlanFlag,
  PlanFlagCode,
  PlanIssue,
  PlanProgress,
  PlanRepOption,
  QueueParams,
  QueueResult,
  QueueSortBy,
  RepDayStatus,
  RepDaySummary,
  SavePlanInput,
  ScheduledOutlet,
  ToolActivity,
  TrailFilter,
  VisitKind,
  VisitMarker,
} from './types'
