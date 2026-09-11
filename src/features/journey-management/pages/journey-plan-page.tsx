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
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
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
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className={cn('truncate', mono && 'font-mono tabular-nums')}>{text}</span>
      </span>
    </Hint>
  )
}

/**
 * The header card, with only what every state of this screen has: who the month
 * belongs to, and the month pager.
 *
 * Shared by the two states that carry NO plan — loading, and a month nobody has
 * opened — so the screen keeps one identity instead of collapsing to a bare
 * dropdown on a background the moment there is nothing to show. The plan's own
 * header adds the status and the provenance chips inside the same shell; those
 * are facts about a plan, and there is no plan here to have them.
 */
function PlanIdentityBar({
  incharge,
  month,
  monthLabel: label,
  onPrev,
  onNext,
  onSelect,
}: {
  incharge: {
    options: ComboboxOption[]
    loading: boolean
    value: string
    onChange: (id: string) => void
  }
  month: string
  monthLabel: string
  onPrev: () => void
  onNext: () => void
  onSelect: (month: string) => void
}) {
  return (
    <div className="mb-4 border-b border-border/60 pb-3">
      <div className="rounded-xl border border-border/50 bg-card px-4 py-2 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-card">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Route className="size-4" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="px-1 text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground">
                Journey plan
              </p>
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
            </div>
          </div>

          <MonthStepper
            month={month}
            label={label}
            onPrev={onPrev}
            onNext={onNext}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
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
 * - **The allocation** — day-counts per activity (optionally in a city) and per
 *   distributor. His, everywhere except an approved plan. He never picks a date or
 *   a beat here, and he is **not** expected to cover the whole month: whatever he
 *   leaves is the sales incharge's to fill in.
 * - **The schedule** — the sales incharge's calendar, a list of work per date.
 *   His only from `submitted` onward, and still his after approval, because a live
 *   month has to be fixable and the sales incharge is read-only from submission
 *   permanently.
 *
 * Plus the two transitions, which share one permission: **publish** hands the draft
 * to the sales incharge, **approve** signs off what he handed back. Neither reads
 * the counts — publish wants one bucket, approve wants nothing beyond `submitted`,
 * and any variance between the two comes back as a flag to judge. Nothing goes
 * backwards: there is no reject, no send-back, no unpublish, no unsubmit.
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
    distributorBuckets,
    setActivityBuckets,
    setDistributorBuckets,
    allocationDirty,
    allocationEditable,
    draftOverBy,
    savedOverBy,
    bucketsMissingDistributors,
    bucketsMissingCity,
    lockedDates,
    discardAllocation,
    submitAllocation,
    isSavingAllocation,

    schedule,
    strip,
    unpinnedDates,
    scheduledByBucket,
    beatNames,
    distributorNames,
    activities,
    distributorOptions,
    visitDistributorOptions,
    requiresDistributors,
    city,
    setEntryActivity,
    setEntryDistributor,
    setEntryDistributors,
    setEntryCity,
    setEntryBeats,
    toggleBucketDate,
    removeEntry,
    clearDay,
    scheduleDirty,
    scheduleEditable,
    discardSchedule,
    submitSchedule,
    isSavingSchedule,
    beatTarget,
    openBeatDialog,
    beatsForOpenEntry,

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
        {/* The same header card as a month that HAS a plan — the identity of the
            screen should not change shape just because this month is empty. It
            carries only what exists here: no status, no provenance, since there
            is no plan to have either. The picker can still only offer the person
            already on screen (the month's list is empty by definition), and that
            is the point — without it the header loses whose month this is, on the
            one screen where the admin steps months looking for the next plan. */}
        <PlanIdentityBar
          incharge={incharge}
          month={month}
          monthLabel={monthLabel}
          onPrev={prevMonth}
          onNext={nextMonth}
          onSelect={selectMonth}
        />
        <EmptyState
          className="min-h-88 flex-1"
          icon={CalendarX2}
          title="No plan for this month"
          description={`Nobody has opened a plan for ${monthLabel} yet. Create one from the plans list, or pick another month.`}
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
          <PlanIdentityBar
            incharge={incharge}
            month={month}
            monthLabel={monthLabel}
            onPrev={prevMonth}
            onNext={nextMonth}
            onSelect={selectMonth}
          />
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
        className="sticky -top-6 z-20 -mx-6 -mt-6 mb-4 bg-background px-6 pt-6"
      >
        {/* Deliberately tight: this band is sticky, so every pixel it takes is a
            pixel the 31-row calendar below never gets back. Nothing here is
            scaled down — the type is full size and the height comes out of the
            padding and the gaps instead. */}
        <div className="border-b border-border/60 pb-3">
          <div className="rounded-xl border border-border/50 bg-card px-4 py-2 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-card">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              {/* ONE wrapping row, not a stack: the eyebrow, the name, the status
                  and the provenance chips are all short, and stacking them cost
                  three lines of a band that is sticky over a 31-row calendar. */}
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Route className="size-4" />
                </span>

                {/* The eyebrow sits ON TOP of the name, not beside it: read
                    inline it scans as part of the person's name. Two short lines
                    against the 36px avatar, so the row does not grow for it. */}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="px-1 text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground">
                    Journey plan
                  </p>

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
                </div>

                {/* The status belongs in the most prominent row on the screen:
                    it decides which of the two editors below is even live. */}
                <StatusChip status={status} />

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
              // Falls back to the plan's own figures so the running total stays
              // truthful while the pickers load, or when the admin has no grant
              // to fetch them.
              totalDays: plan.progress.totalDays,
              activities: [],
              distributors: [],
            }
          }
          month={plan.month}
          lockedDates={lockedDates}
          activityBuckets={activityBuckets}
          distributorBuckets={distributorBuckets}
          onChangeActivities={setActivityBuckets}
          onChangeDistributors={setDistributorBuckets}
          city={city}
          savedDistributors={plan.distributorAllocations}
          savedActivities={plan.activityAllocations}
          // Counted off the calendar draft below, so the counts here move as it
          // is corrected rather than waiting on a save.
          scheduled={scheduledByBucket}
          // The other half of that: a date given or taken here IS the calendar
          // below, so the picker writes the schedule draft rather than pinning a
          // second promise beside the day it already shows.
          onToggleDate={toggleBucketDate}
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
          // The LIVE strip, not `plan.monthStrip`: the labels and the dated
          // count have to follow the drafts on this screen, or the calendar
          // contradicts the allocation directly above it.
          strip={strip}
          days={plan.days}
          status={status}
          activities={activities}
          distributorOptions={distributorOptions}
          visitDistributorOptions={visitDistributorOptions}
          visitActivityIds={requiresDistributors}
          city={city}
          draft={schedule}
          // Pins the admin has just taken off a bucket. Their rows come from the
          // plan, so only this tells the calendar they are on their way out.
          unpinnedDates={unpinnedDates}
          beatNames={beatNames}
          distributorNames={distributorNames}
          onSetActivity={setEntryActivity}
          onSetDistributor={setEntryDistributor}
          onSetDistributors={setEntryDistributors}
          onSetCity={setEntryCity}
          onRemoveEntry={removeEntry}
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
        <div className="sticky -bottom-6 z-20 -mx-6 mt-4 bg-background px-6 pb-3">
          {/* Rule inside the padding, so it lines up with the header's and with the
              cards between them — the background still bleeds the full width.

              `-bottom-6` pins the band's bottom edge to the shell's border box, so
              the padding area is covered and NONE of this padding is hidden: `pb`
              is exactly the gap you see under the buttons. Keep it small. */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
            {allocationEditable && allocationDirty ? (
              <>
                {/* The one hard stop on this screen: a month cannot promise more
                    days than it holds, so the Save refuses until the counts come
                    back inside the calendar. */}
                <Hint
                  label={
                    draftOverBy > 0
                      ? `The counts run ${draftOverBy} day${
                          draftOverBy === 1 ? '' : 's'
                        } past the end of the month. Reduce them before saving.`
                      : bucketsMissingDistributors > 0
                        ? 'An activity that visits distributors has to name at least one. Pick them, or remove the row.'
                        : bucketsMissingCity > 0
                          ? 'A distributor search has to name the city to search in. Pick one, or remove the row.'
                          : 'Replaces both bucket sets with what is on screen.'
                  }
                >
                  <span className="inline-flex">
                    <Button
                      className="cursor-pointer"
                      disabled={
                        busy ||
                        draftOverBy > 0 ||
                        bucketsMissingDistributors > 0 ||
                        bucketsMissingCity > 0
                      }
                      onClick={submitAllocation}
                    >
                      {isSavingAllocation ? <Loader2 className="animate-spin" /> : <Save />}{' '}
                      Save allocation
                    </Button>
                  </span>
                </Hint>
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
                consult the SERVER's verdict rather than a recomputed sum — neither
                reads the counts, and a month that does not fill the calendar is
                exactly what you are meant to be publishing. */}
            {canTransition && showPublish ? (
              <Hint
                label={
                  allocationDirty
                    ? 'Save the counts first — publish reads what the server holds, not the draft on screen.'
                    : savedOverBy > 0
                      ? `This month allocates ${savedOverBy} day${
                          savedOverBy === 1 ? '' : 's'
                        } more than it holds. Bring the counts within the month before publishing.`
                      : canPublish
                        ? 'Hand this month to the sales incharge. He dates the days you allocated, picks the distributor and beats for each, and fills the rest of the month himself. There is no unpublish.'
                      : 'Nothing is allocated yet, so there would be nothing to hand over.'
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
                      ? 'Sign the month off. The counts are not re-checked — any variance from your allocation is flagged above for you to judge. You can still correct the calendar afterwards; that does not reopen the cycle.'
                      : 'This month is not waiting on you — approve only applies to a plan the sales incharge has submitted.'
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
                    ? `${activityBuckets.length + distributorBuckets.length} bucket${
                        activityBuckets.length + distributorBuckets.length === 1 ? '' : 's'
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

      {/* One dialog reused for every entry of every date: the pool is already
          narrowed to the open entry's distributor, because a beat may only go on
          an entry whose distributor it serves and the server refuses anything
          else. */}
      <DayBeatDialog
        open={beatTarget !== null}
        onOpenChange={(open) => openBeatDialog(open ? beatTarget : null)}
        date={beatTarget?.date ?? ''}
        distributorName={
          distributorOptions.find(
            (option) =>
              option.value ===
              (beatTarget
                ? schedule.get(beatTarget.date)?.entries[beatTarget.index]?.distributorId
                : null),
          )?.label ?? null
        }
        pool={beatsForOpenEntry}
        beatNames={beatNames}
        value={
          beatTarget
            ? (schedule.get(beatTarget.date)?.entries[beatTarget.index]?.beatIds ?? [])
            : []
        }
        onSave={(beatIds) => {
          if (beatTarget) setEntryBeats(beatTarget.date, beatTarget.index, beatIds)
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
