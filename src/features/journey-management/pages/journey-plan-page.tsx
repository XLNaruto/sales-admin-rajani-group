import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  CalendarX2,
  CheckCircle2,
  Clock,
  Hash,
  Loader2,
  MapPin,
  RotateCcw,
  Route,
  Save,
  Send,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/empty-state'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { RouteError } from '@/features/error'
import { AgentPanel } from '../components/agent-panel'
import { AllocationEditor } from '../components/allocation-editor'
import { DayBeatDialog } from '../components/day-beat-dialog'
import { MonthStepper } from '../components/month-stepper'
import { PlanIssueList } from '../components/plan-issue-list'
import { PlanNotice } from '../components/plan-notice'
import { PlanSkeleton } from '../components/plan-skeleton'
import { PlanStatRail } from '../components/plan-stat-rail'
import { ScheduleTable } from '../components/schedule-table'
import { StatusChip } from '../components/status-chip'
import { useJourneyPlan } from '../hooks/use-journey-plan'
import { stampLabel } from '../lib/journey-format'
import { PLAN_STATUS_HINT } from '../lib/plan-status'

/**
 * One provenance fact in the header, as an icon + value chip.
 *
 * Renders nothing when there is no value: an icon next to a dash is a chip that
 * says "no data" in the most prominent row on the screen, and the row reads better
 * with the fact simply absent.
 */
function HeaderChip({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: LucideIcon
  label: string
  /** Missing, blank or the formatters' `—` placeholder all hide the chip. */
  value: string | null | undefined
  mono?: boolean
}) {
  const text = value?.trim()
  if (!text || text === '—' || text === '-') return null

  return (
    <Hint label={`${label}: ${text}`}>
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className={cn('truncate', mono && 'font-mono tabular-nums')}>{text}</span>
      </span>
    </Hint>
  )
}

/**
 * The dashboard shell's scroll container is `<main class="… p-6">`, and sticky
 * offsets resolve against a scroll container's **padding box** — not its border
 * box. So `top-0` would park 24px inside that padding and leave a strip at each
 * edge for rows to scroll through. The two sticky bands below cancel it out with
 * `-top-6` / `-bottom-6`, and the schedule table's own sticky header subtracts it
 * again to land flush under the page header.
 *
 * Keep this in step with the layout's padding: 6 → 1.5rem → 24px.
 */
const SHELL_PADDING = 24

interface JourneyPlanPageProps {
  /** Encrypted `?data=` token carrying `{ id, inchargeId, month }`. */
  data?: string
}

/**
 * Journey Management → Journey Plan.
 *
 * One sales incharge's month, and the negotiation over it. The screen has **two
 * independent write surfaces**, because the server treats them as opposites and one
 * combined Save would always be half-refused:
 *
 * - **The allocation** — day-counts per activity and per city. His, everywhere
 *   except an approved plan. He never picks a date or a beat here.
 * - **The schedule** — the sales incharge's calendar. His only from `submitted` onward, and
 *   still his after approval, because a live month has to be fixable and the sales incharge is
 *   read-only from submission permanently.
 *
 * Plus the two transitions, which share one permission: **publish** hands the draft
 * to the sales incharge, **approve** signs off what he handed back. Nothing goes backwards —
 * there is no reject, no send-back, no unpublish, no unsubmit. An admin who dislikes
 * a schedule corrects it and approves.
 */
export function JourneyPlanPage({ data }: JourneyPlanPageProps) {
  const {
    plan,
    planId,
    status,
    isLoading,
    isLoadingReps,
    error,
    retry,
    missing,
    incharge,
    month,
    monthLabel,
    prevMonth,
    nextMonth,
    selectMonth,

    allocationOptions,
    activityBuckets,
    cityBuckets,
    setActivityBuckets,
    setCityBuckets,
    allocationDirty,
    allocationEditable,
    discardAllocation,
    submitAllocation,
    isSavingAllocation,

    schedule,
    beatNames,
    activities,
    cityOptions,
    setDayActivity,
    setDayCity,
    setDayBeats,
    clearDay,
    scheduleDirty,
    scheduleEditable,
    discardSchedule,
    submitSchedule,
    isSavingSchedule,
    beatDate,
    openBeatDialog,
    beatsForOpenDate,

    canTransition,
    showPublish,
    showApprove,
    canPublish,
    canApprove,
    submitPublish,
    submitApprove,
    isPublishing,
    isApproving,

    issues,
    notice,
    dismissNotice,
    canUpdate,
    canUseAgent,
  } = useJourneyPlan(data)

  const [focusedDay, setFocusedDay] = useState<number | null>(null)
  const [agentOpen, setAgentOpen] = useState(false)

  /**
   * How tall the sticky header is, so the schedule table's own sticky column header
   * can park directly beneath it instead of sliding underneath it.
   *
   * Measured rather than hard-coded: the provenance chips wrap at narrow widths, so
   * the header is one, two or three lines tall depending on the viewport and on how
   * many facts the plan actually carries.
   */
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const measure = () => setHeaderHeight(el.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
    // Re-run once the plan lands: the header is not mounted before that, so the
    // first attempt has no element to observe.
  }, [plan])

  // Before anything else: a failed read leaves `plan` undefined for good, so the
  // loading branch below would spin forever on it. 403 lands on Forbidden, every
  // other failure on the generic screen with the server's message and a retry.
  if (error) return <RouteError error={error} reset={retry} />

  if (missing) {
    return (
      // Fills the shell's content area instead of leaving a dead half-screen under
      // a short dashed box: `h-full` resolves against the layout's `flex-1` outlet
      // wrapper, so the panel below grows to the footer without ever overflowing.
      <div className="flex h-full flex-col">
        {/* No incharge picker here: an unrun month has no sales incharge list to pick from, so
            the control could only ever read "Select sales incharge" and open empty.
            The month pager is the way out of this state, and it stands alone. */}
        <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
          <MonthStepper
            month={month}
            label={monthLabel}
            onPrev={prevMonth}
            onNext={nextMonth}
            onSelect={selectMonth}
          />
        </div>
        <EmptyState
          className="min-h-88 flex-1"
          icon={CalendarX2}
          title="No plan for this month"
          description={`Nothing has been generated for ${monthLabel} yet. Generate the month from the plans list, or pick another month.`}
        />
      </div>
    )
  }

  if (isLoading || !plan || !status) {
    // The sales incharge list resolves on its own request, so as soon as it lands the picker
    // and the month pager go live — the admin can switch person or month while the
    // plan behind them is still loading, instead of waiting on a spinner.
    return (
      <div>
        {!isLoadingReps ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Combobox
              variant="inline"
              withAvatars
              placeholder="Select sales incharge"
              searchPlaceholder="Search sales incharge…"
              value={incharge.value}
              onChange={incharge.onChange}
              options={incharge.options}
              loading={incharge.loading}
            />
            <MonthStepper
              month={month}
              label={monthLabel}
              onPrev={prevMonth}
              onNext={nextMonth}
              onSelect={selectMonth}
            />
          </div>
        ) : null}
        <PlanSkeleton withHeader={isLoadingReps} />
      </div>
    )
  }

  const busy = isSavingAllocation || isSavingSchedule || isPublishing || isApproving
  /**
   * Anything at the bottom to render? Mirrors the band's children exactly — being
   * *allowed* to edit is not enough, since both Saves only appear once there is
   * something unsaved. Anything looser leaves an empty band with a rule across it.
   */
  const hasActions =
    (allocationEditable && allocationDirty) ||
    (scheduleEditable && scheduleDirty) ||
    (canTransition && (showPublish || showApprove))

  return (
    // The schedule table's sticky header has to clear this page header, and this
    // one's height moves with the chip row wrapping — so it is measured and handed
    // down as a custom property rather than guessed at as a fixed offset. The
    // header sits at `-top-6`, so its stuck bottom edge is that much higher.
    <div
      style={
        {
          '--plan-header-h': `${Math.max(0, headerHeight - SHELL_PADDING)}px`,
        } as CSSProperties
      }
    >
      {/* Header — who, where in the cycle, and when.
          Sticky: the sales incharge switcher and the month pager are how you move around this
          screen, and the schedule below is 28–31 rows.
          `-mx-6 -mt-6 px-6 pt-6` eats the shell's padding in flow, and `-top-6`
          eats it again once stuck (see SHELL_PADDING). Fully opaque, deliberately:
          the card inside is opaque `bg-card`, so any translucency here shows rows
          through the padding and reads as two stray gaps rather than one band. */}
      <div
        ref={headerRef}
        className="sticky -top-6 z-20 -mx-6 -mt-6 mb-5 bg-background px-6 pt-6"
      >
        <div className="border-b border-border/60 pb-4">
          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Route className="size-5" />
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Journey plan
                    </p>
                    {/* The status belongs in the most prominent row on the screen:
                        it decides which of the two editors below is even live. */}
                    <StatusChip status={status} />
                  </div>
                  <Combobox
                    variant="inline"
                    withAvatars
                    placeholder="Select sales incharge"
                    searchPlaceholder="Search sales incharge…"
                    value={incharge.value}
                    onChange={incharge.onChange}
                    options={incharge.options}
                    loading={incharge.loading}
                  />

                  {/* `empty:hidden`: with every fact missing the chips all return
                      null, and the row must not leave its margin behind. */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 empty:hidden">
                    <HeaderChip
                      icon={Hash}
                      label="Employee code"
                      value={plan.employeeCode}
                      mono
                    />
                    <HeaderChip
                      icon={MapPin}
                      label="Headquarter"
                      value={plan.headquarter ?? '—'}
                    />
                    {/* The timestamp that matters is the latest one the chain
                        reached, not the generation stamp — that is the fact an admin
                        is looking for on a month already in flight. */}
                    <HeaderChip
                      icon={Clock}
                      label={
                        plan.approvedAt
                          ? 'Approved'
                          : plan.submittedAt
                            ? 'Submitted by the sales incharge'
                            : plan.publishedAt
                              ? 'Published'
                              : `Drafted by the ${plan.generatedBy}`
                      }
                      value={stampLabel(
                        plan.approvedAt ??
                          plan.submittedAt ??
                          plan.publishedAt ??
                          plan.generatedAt,
                      )}
                    />
                  </div>
                </div>
              </div>

              <MonthStepper
                month={month}
                label={monthLabel}
                onPrev={prevMonth}
                onNext={nextMonth}
                onSelect={selectMonth}
              />
            </div>
          </div>
        </div>
      </div>

      <PlanStatRail progress={plan.progress} status={status} />

      <div className="mt-4 space-y-4">
        {notice ? <PlanNotice message={notice} onDismiss={dismissNotice} /> : null}

        {/* What this state means, stated once. `draft` in particular is not
            guessable: the sales incharge cannot see the month at all. */}
        <PlanNotice message={PLAN_STATUS_HINT[status]} />

        {!canUpdate ? (
          <PlanNotice message="You have read-only access to journey plans, so the month below can be reviewed but not changed." />
        ) : null}

        <PlanIssueList issues={issues} onSelectDay={setFocusedDay} />

        {/* The allocation — the decision the admin actually makes. */}
        <AllocationEditor
          options={
            allocationOptions ?? {
              inchargeId: plan.inchargeId,
              // Falls back to the plan's own figures so the variance stays truthful
              // while the pickers load, or when the admin has no grant to fetch them.
              totalDays: plan.progress.totalDays,
              activities: [],
              cities: [],
            }
          }
          activityBuckets={activityBuckets}
          cityBuckets={cityBuckets}
          onChangeActivities={setActivityBuckets}
          onChangeCities={setCityBuckets}
          savedCities={plan.cityAllocations}
          savedActivities={plan.activityAllocations}
          readOnly={!allocationEditable}
          busy={busy}
          lockedReason={
            allocationEditable
              ? undefined
              : status === 'approved'
                ? 'This month is approved, so the counts are frozen — correct the calendar below instead.'
                : undefined
          }
        />

        <ScheduleTable
          strip={plan.monthStrip}
          days={plan.days}
          status={status}
          activities={activities}
          cityOptions={cityOptions}
          draft={schedule}
          beatNames={beatNames}
          onSetActivity={setDayActivity}
          onSetCity={setDayCity}
          onClearDay={clearDay}
          onEditBeats={openBeatDialog}
          focusedDay={focusedDay}
          editable={scheduleEditable}
          busy={busy}
        />
      </div>

      {/* Two Saves and the transitions, sticky to the bottom of the scroll area:
          the allocation and the calendar sit at opposite ends of a 31-row table, so
          an edit is otherwise a full scroll away from the button that commits it.

          `-bottom-6` reaches past the shell's padding to the real bottom edge, and
          the extra `pb-10` is that 24px back again — so the buttons stay optically
          where `py-4` put them instead of dropping into the corner. */}
      {hasActions ? (
        <div className="sticky -bottom-6 z-20 -mx-6 mt-6 bg-background px-6 pb-10">
          {/* Rule inside the padding, so it lines up with the header's and with the
              cards between them — the background still bleeds the full width. */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
            {allocationEditable && allocationDirty ? (
              <>
                <Button
                  className="cursor-pointer"
                  disabled={busy}
                  onClick={submitAllocation}
                >
                  {isSavingAllocation ? <Loader2 className="animate-spin" /> : <Save />}{' '}
                  Save allocation
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  disabled={busy}
                  onClick={discardAllocation}
                >
                  <RotateCcw /> Discard counts
                </Button>
              </>
            ) : null}

            {scheduleEditable && scheduleDirty ? (
              <>
                <Hint label="Replaces the whole calendar. Dates a visit has landed on are kept as history whatever is sent.">
                  <span className="inline-flex">
                    <Button
                      className="cursor-pointer"
                      disabled={busy}
                      onClick={submitSchedule}
                    >
                      {isSavingSchedule ? <Loader2 className="animate-spin" /> : <Save />}{' '}
                      Save corrections
                    </Button>
                  </span>
                </Hint>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  disabled={busy}
                  onClick={discardSchedule}
                >
                  <RotateCcw /> Discard corrections
                </Button>
              </>
            ) : null}

            {/* Publish and approve share one permission, and each is one-way. Both
                consult the SERVER's verdict rather than a recomputed sum: approve is
                checked bucket by bucket, and the totals can balance while the
                buckets do not. */}
            {canTransition && showPublish ? (
              <Hint
                label={
                  allocationDirty
                    ? 'Save the counts first — publish reads what the server holds, not the draft on screen.'
                    : canPublish
                      ? 'Hand this month to the sales incharge. He dates every allocated day and picks the beats. There is no unpublish.'
                      : 'The counts do not account for every date of the month yet, so publish would be refused.'
                }
              >
                <span className="inline-flex">
                  <Button
                    className="cursor-pointer"
                    disabled={busy || !canPublish || allocationDirty}
                    onClick={submitPublish}
                  >
                    {isPublishing ? <Loader2 className="animate-spin" /> : <Send />}{' '}
                    Publish to sales incharge
                  </Button>
                </span>
              </Hint>
            ) : null}

            {canTransition && showApprove ? (
              <Hint
                label={
                  scheduleDirty
                    ? 'Save your corrections first — approve reads what the server holds, not the draft on screen.'
                    : canApprove
                      ? 'Sign the month off. You can still correct the calendar afterwards; that does not reopen the cycle.'
                      : 'His schedule does not yet consume every bucket exactly, so approve would be refused. Correct the calendar above — there is nothing to send back.'
                }
              >
                <span className="inline-flex">
                  <Button
                    className="cursor-pointer"
                    disabled={busy || !canApprove || scheduleDirty}
                    onClick={submitApprove}
                  >
                    {isApproving ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <CheckCircle2 />
                    )}{' '}
                    Approve
                  </Button>
                </span>
              </Hint>
            ) : null}

            {allocationDirty || scheduleDirty ? (
              <span className="text-xs text-muted-foreground">
                Unsaved:{' '}
                {[
                  allocationDirty
                    ? `${activityBuckets.length + cityBuckets.length} bucket${
                        activityBuckets.length + cityBuckets.length === 1 ? '' : 's'
                      }`
                    : '',
                  scheduleDirty
                    ? `${schedule.size} dated day${schedule.size === 1 ? '' : 's'}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(', ')}
                .
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* One dialog reused for all 31 dates: the pool is already narrowed to the
          open date's city, because a beat may only go on a day whose city it sits
          in and the server refuses anything else. */}
      <DayBeatDialog
        open={beatDate !== null}
        onOpenChange={(open) => openBeatDialog(open ? beatDate : null)}
        date={beatDate ?? ''}
        cityName={
          cityOptions.find(
            (option) =>
              option.value === (beatDate ? schedule.get(beatDate)?.cityId : null),
          )?.label ?? null
        }
        pool={beatsForOpenDate}
        beatNames={beatNames}
        value={beatDate ? (schedule.get(beatDate)?.beatIds ?? []) : []}
        onSave={(beatIds) => {
          if (beatDate) setDayBeats(beatDate, beatIds)
        }}
        readOnly={!scheduleEditable}
      />

      <AgentPanel
        open={agentOpen && canUseAgent}
        onOpenChange={setAgentOpen}
        planId={planId}
        inchargeName={plan.inchargeName}
        monthLabel={monthLabel}
        readOnly={!canUpdate}
      />
    </div>
  )
}
