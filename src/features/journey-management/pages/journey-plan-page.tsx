import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  CalendarX2,
  Clock,
  Hash,
  Loader2,
  MapPin,
  RotateCcw,
  Route,
  Save,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/empty-state'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { RouteError } from '@/features/error'
import { AgentPanel } from '../components/agent-panel'
import { BeatAllocationPicker } from '../components/beat-picker'
import { MonthStepper } from '../components/month-stepper'
import { MonthTable } from '../components/month-table'
import { PlanIssueList } from '../components/plan-issue-list'
import { PlanNotice } from '../components/plan-notice'
import { PlanSkeleton } from '../components/plan-skeleton'
import { PlanStatRail } from '../components/plan-stat-rail'
import { useJourneyPlan } from '../hooks/use-journey-plan'
import { stampLabel } from '../lib/journey-format'

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
 * `-top-6` / `-bottom-6`, and the month table's own sticky header subtracts it
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
 * One sales incharge's **allocation** for a month: which of his beats are in play,
 * which dates the office has pinned, and what he has actually done with the month
 * so far.
 *
 * The admin edits exactly two things and saves them together, because the API is
 * one PATCH carrying two full replacements. He does **not** edit the rep's days —
 * the rep writes those himself each morning, and a date he has taken over survives
 * any save.
 *
 * There is nothing to approve: the allocation is live the moment it exists.
 */
export function JourneyPlanPage({ data }: JourneyPlanPageProps) {
  const {
    plan,
    planId,
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
    beats,
    pins,
    setBeats,
    pin,
    unpin,
    dirty,
    discard,
    submit,
    isSaving,
    activities,
    beatPool,
    issues,
    notice,
    dismissNotice,
    canUpdate,
    canUseAgent,
  } = useJourneyPlan(data)

  const [focusedDay, setFocusedDay] = useState<number | null>(null)
  const [agentOpen, setAgentOpen] = useState(false)

  /**
   * How tall the sticky header is, so the month table's own sticky column header
   * can park directly beneath it instead of sliding underneath it.
   *
   * Measured rather than hard-coded: the provenance chips wrap at narrow widths, so
   * the header is one, two or three lines tall depending on the viewport and on how
   * many facts the allocation actually carries.
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
    // Re-run once the allocation lands: the header is not mounted before that, so
    // the first attempt has no element to observe.
  }, [plan])

  // Before anything else: a failed read leaves `plan` undefined for good, so the
  // loading branch below would spin forever on it. 403 lands on Forbidden, every
  // other failure on the generic screen with the server's message and a retry.
  if (error) return <RouteError error={error} reset={retry} />

  if (missing) {
    return (
      <div>
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
        <EmptyState
          icon={CalendarX2}
          title="No allocation for this month"
          description={`Nothing has been allocated for ${monthLabel} yet. Generate the month from the allocations list, or pick another month.`}
        />
      </div>
    )
  }

  if (isLoading || !plan) {
    // The rep list resolves on its own request, so as soon as it lands the picker
    // and the month pager go live — the admin can switch person or month while the
    // allocation behind them is still loading, instead of waiting on a spinner.
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

  return (
    // The month table's own sticky header has to clear this page header, and this
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
      {/* Header — who and when. The name itself is the incharge picker.

          Sticky: the rep switcher and the month pager are how you move around this
          screen, and the month table below is 28–31 rows, so scrolling to the
          bottom used to leave you with no way to change person or month.

          `-mx-6 -mt-6 px-6 pt-6` eats the shell's padding in flow, and `-top-6`
          eats it again once stuck (see SHELL_PADDING) — so the band reaches the
          real top edge instead of floating 24px below it.

          Fully opaque, deliberately: the card inside is opaque `bg-card`, so any
          translucency here shows rows through the padding above and below it and
          reads as two stray gaps rather than as one solid band. */}
      <div
        ref={headerRef}
        className="sticky -top-6 z-20 -mx-6 -mt-6 mb-5 bg-background px-6 pt-6"
      >
        {/* The rule sits INSIDE the horizontal padding, so it starts and ends level
            with the cards below rather than running edge-to-edge past them. The
            opaque background still bleeds the full width — it has to, or rows show
            in the corners as they scroll under. */}
        <div className="border-b border-border/60 pb-4">
          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Route className="size-5" />
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Monthly allocation
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

                  {/* `empty:hidden`: with every fact missing the chips all return
                      null, and the row must not leave its margin behind. */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 empty:hidden">
                    <HeaderChip
                      icon={Hash}
                      label="Employee code"
                      value={plan.employeeCode}
                      mono
                    />
                    <HeaderChip icon={MapPin} label="Headquarter" value={plan.headquarter} />
                    <HeaderChip
                      icon={Clock}
                      label={`Generated by ${plan.generatedBy ?? 'the picker'}`}
                      value={stampLabel(plan.generatedAt)}
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

      <PlanStatRail progress={plan.progress} />

      <div className="mt-4 space-y-4">
        {notice ? <PlanNotice message={notice} onDismiss={dismissNotice} /> : null}

        {!canUpdate ? (
          <PlanNotice message="You have read-only access to allocations, so the month below can be reviewed but not changed." />
        ) : null}

        <PlanIssueList issues={issues} onSelectDay={setFocusedDay} />

        {/* The allocation itself — the decision this screen exists for. */}
        <BeatAllocationPicker
          pool={beatPool}
          value={beats}
          onChange={setBeats}
          allocated={plan.allocatedBeats}
          readOnly={!canUpdate}
          busy={isSaving}
        />

        <MonthTable
          strip={plan.monthStrip}
          days={plan.days}
          activities={activities}
          pinned={pins}
          onPin={pin}
          onUnpin={unpin}
          focusedDay={focusedDay}
          readOnly={!canUpdate}
          busy={isSaving}
        />
      </div>

      {/* One screen, one Save — the API is a single PATCH carrying both lists.

          Sticky to the bottom of the scroll area: the two things being saved sit at
          opposite ends of a 31-row table, so an edit made in the beat list is
          otherwise a full scroll away from the button that commits it.

          `-bottom-6` reaches past the shell's padding to the real bottom edge, and
          the extra `pb-10` is that 24px back again — so the buttons stay optically
          where `py-4` put them instead of dropping into the corner. */}
      {canUpdate || canUseAgent ? (
        <div className="sticky -bottom-6 z-20 -mx-6 mt-6 bg-background px-6 pb-10">
          {/* Rule inside the padding, so it lines up with the header's and with the
              cards between them — the background still bleeds the full width. */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
            {canUpdate ? (
              <>
                <Hint
                  label={
                    dirty
                      ? 'Write the beat list and the pinned days in one call'
                      : 'Nothing has changed yet'
                  }
                >
                  <span className="inline-flex">
                    <Button
                      className="cursor-pointer"
                      disabled={!dirty || isSaving}
                      onClick={submit}
                    >
                      {isSaving ? <Loader2 className="animate-spin" /> : <Save />} Save
                      allocation
                    </Button>
                  </span>
                </Hint>
                {dirty ? (
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    disabled={isSaving}
                    onClick={discard}
                  >
                    <RotateCcw /> Discard changes
                  </Button>
                ) : null}
                {dirty ? (
                  <span className="text-xs text-muted-foreground">
                    Unsaved: {beats.length} beat{beats.length === 1 ? '' : 's'}, {pins.size}{' '}
                    pinned day{pins.size === 1 ? '' : 's'}.
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

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
