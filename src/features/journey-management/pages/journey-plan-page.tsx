import { useMemo, useState } from 'react'
import {
  CalendarX2,
  ClipboardCheck,
  Clock,
  Hash,
  Loader2,
  MapPin,
  Route,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { Hint } from '@/components/common/hint'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { RouteError } from '@/features/error'
import { AgentPanel } from '../components/agent-panel'
import { MonthStepper } from '../components/month-stepper'
import { PlanDayTable } from '../components/plan-day-table'
import { PlanIssueList } from '../components/plan-issue-list'
import { PlanNotice } from '../components/plan-notice'
import { PlanStatRail } from '../components/plan-stat-rail'
import { useJourneyPlan } from '../hooks/use-journey-plan'
import { stampLabel } from '../lib/journey-format'
import type { ApprovalStatus } from '../types'

/** Status wording for the header badge — the server's enum, no invented states. */
const STATUS_LABEL: Record<ApprovalStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  superseded: 'Superseded',
}

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

interface JourneyPlanPageProps {
  /** Encrypted `?data=` token carrying `{ id, inchargeId, month }`. */
  data?: string
}

/**
 * Journey Management → Journey Plan.
 *
 * One sales incharge's month: the server's numbers, everything the solver wants a
 * human to look at, then the month itself as an editable day-by-day table.
 *
 * Every edit is a server call that returns the whole recomputed plan, so the rail
 * and the issue list move with the day table without anything being recalculated
 * here. A locked day — one that has already started — is read-only, and an approved
 * plan is read-only entirely.
 */
export function JourneyPlanPage({ data }: JourneyPlanPageProps) {
  const {
    plan,
    planId,
    isLoading,
    error,
    retry,
    missing,
    incharge,
    openPlanId,
    month,
    monthLabel,
    prevMonth,
    nextMonth,
    selectMonth,
    days,
    activities,
    beats,
    issues,
    editable,
    notice,
    dismissNotice,
    isEdited,
    setActivity,
    addDayBeat,
    removeDayBeat,
    isSaving,
    approve,
    isApproving,
    canUpdate,
    canApprove,
    canUseAgent,
  } = useJourneyPlan(data)

  const [focusedDay, setFocusedDay] = useState<number | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)

  /** Dates the server flagged — the day table tints those rows. */
  const flaggedDates = useMemo(
    () => new Set(plan?.flags.map((flag) => flag.date).filter((d): d is string => d != null)),
    [plan],
  )

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
          title="No journey plan for this month"
          description={`Nothing has been generated for ${monthLabel} yet. Generate the month's plans from the approval queue, or pick another month.`}
        />
      </div>
    )
  }

  if (isLoading || !plan) {
    return (
      <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading the month…
        </span>
      </div>
    )
  }

  return (
    <div>
      {/* Header — who and when. The name itself is the incharge picker. */}
      <div className="mb-5 rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Route className="size-5" />
            </span>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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

              {/* `empty:hidden`: with every fact missing the chips all return
                  null, and the row must not leave its margin behind. */}
              <div className="mt-2 flex flex-wrap items-center gap-2 empty:hidden">
                <HeaderChip icon={Hash} label="Employee code" value={plan.employeeCode} mono />
                <HeaderChip icon={MapPin} label="Headquarter" value={plan.headquarter} />
                <HeaderChip
                  icon={Clock}
                  label={`Generated by ${plan.generatedBy ?? 'the solver'}`}
                  value={stampLabel(plan.generatedAt)}
                />
              </div>
            </div>
          </div>

          {/* Month pager + status — the month the whole screen is scoped to. */}
          <div className="flex items-center gap-3">
            <StatusBadge status={STATUS_LABEL[plan.status]} />
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

      <PlanStatRail metrics={plan.metrics} />

      <div className="mt-4 space-y-4">
        {notice ? <PlanNotice message={notice} onDismiss={dismissNotice} /> : null}

        {!canUpdate ? (
          <PlanNotice message="You have read-only access to journey plans, so the month below can be reviewed but not changed." />
        ) : null}

        {plan.status === 'superseded' ? (
          <PlanNotice message="This plan was replaced by a re-solve. Open the current plan for this month to make changes." />
        ) : null}

        <PlanIssueList
          issues={issues}
          flagCount={plan.flagCount}
          onSelectDay={setFocusedDay}
        />

        <PlanDayTable
          days={days}
          activities={activities}
          beats={beats}
          onActivityChange={setActivity}
          onBeatAdd={addDayBeat}
          onBeatRemove={removeDayBeat}
          isEdited={isEdited}
          flaggedDates={flaggedDates}
          focusedDay={focusedDay}
          readOnly={!editable}
          busy={isSaving}
        />
      </div>

      {/* Decisions. Approving publishes the month. */}
      {/* Decisions, each behind its own grant: approving, editing and asking the
          assistant are three separate permissions, and a read-only reviewer sees
          none of the three rather than three disabled buttons. */}
      {canApprove || canUpdate || canUseAgent ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 pt-5">
          {canApprove ? (
            <Button
              className="cursor-pointer"
              disabled={plan.status === 'approved' || plan.status === 'superseded' || isApproving}
              onClick={() => setConfirmApprove(true)}
            >
              <ClipboardCheck /> Approve month
            </Button>
          ) : null}
          {/* {canUseAgent ? (
            <Button
              variant="outline"
              className="ml-auto cursor-pointer"
              onClick={() => setAgentOpen(true)}
            >
              <MessageSquare /> Ask for a change
            </Button>
          ) : null} */}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        icon={ClipboardCheck}
        title={`Approve ${monthLabel}?`}
        description={
          <>
            The month goes live for{' '}
            <span className="font-medium text-foreground">{plan.inchargeName}</span> at{' '}
            {plan.metrics.coverage}% beat coverage
            {plan.flagCount > 0 ? (
              <>
                , with{' '}
                <span className="font-medium text-destructive">
                  {plan.flagCount} flag{plan.flagCount === 1 ? '' : 's'}
                </span>{' '}
                still on it
              </>
            ) : null}
            . Once approved it can no longer be edited.
          </>
        }
        confirmLabel="Approve month"
        onConfirm={approve}
      />

      <AgentPanel
        open={agentOpen && canUseAgent}
        onOpenChange={setAgentOpen}
        planId={planId}
        inchargeName={plan.inchargeName}
        monthLabel={monthLabel}
        readOnly={!canUpdate}
        // The agent re-solved mid-conversation: follow the plan to its new id. The
        // conversation is per (incharge, period), so the panel stays open across it.
        onPlanSuperseded={openPlanId}
      />
    </div>
  )
}
