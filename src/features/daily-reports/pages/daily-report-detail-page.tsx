import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, CalendarX2, FileText, Hash, UserX } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { isCompanyNotSelected } from '@/features/company'
import { timeIST } from '@/features/daily-summary'
import { DivisionMeasures } from '../components/division-measures'
import { RemarksList } from '../components/remarks-list'
import { ReportCounterTiles } from '../components/report-counter-tiles'
import { useDailyReportDetail } from '../hooks/use-daily-report-detail'
import {
  DAILY_REPORT_KINDS,
  joinNames,
  KIND_LABEL,
  reportDateLabel,
} from '../lib/daily-report-format'
import type { RepDailyReport } from '../types'

const HEADER_BUTTON =
  'inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'

interface DailyReportDetailPageProps {
  /** Encrypted `?data=` token carrying `{ id, kind, date, name, code, backData }`. */
  data?: string
}

/** One labelled fact — label above, value below, so a row of them fills the card. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words text-foreground">{children}</dd>
    </div>
  )
}

/** Where, when and how long — the report's header facts. */
function ReportFacts({ report }: { report: RepDailyReport }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border/60 bg-card p-4 lg:grid-cols-5">
      <Fact label="Centre">{joinNames(report.centres, ' / ') || '—'}</Fact>
      <Fact label="Market Route">{joinNames(report.marketRoutes, ', ') || '—'}</Fact>
      <Fact label="Deal Person">{joinNames(report.dealPersons, ', ') || '—'}</Fact>
      <Fact label="Start">
        <span className="tabular-nums">{timeIST(report.startTime) || '—'}</span>
      </Fact>
      <Fact label="Close">
        <span className="flex flex-wrap items-center gap-2">
          {/* An open evening has no close time yet — never a placeholder time. */}
          {report.closeTime ? (
            <span className="tabular-nums">{timeIST(report.closeTime)}</span>
          ) : null}
          {!report.isClosed ? <Badge variant="warning">In progress</Badge> : null}
          {!report.closeTime && report.isClosed ? '—' : null}
        </span>
      </Fact>
    </dl>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  )
}

/**
 * Dashboard → Daily Reports → one rep's report.
 *
 * The same report the rep sees in the mobile app, scoped to the selected
 * company: where they worked, the division's figures in every unit, the call
 * counters and the visit remarks. The Morning ↔ Evening toggle stays on the
 * same rep and day; a kind with no report is an empty state, not an error. A
 * company switch refetches — a rep outside the new company gets its own state.
 */
export function DailyReportDetailPage({ data }: DailyReportDetailPageProps) {
  const {
    id,
    kind,
    selectKind,
    date,
    name,
    code,
    report,
    isLoading,
    error,
    missing,
    retry,
    back,
  } = useDailyReportDetail(data)

  if (isForbiddenError(error) && !isCompanyNotSelected(error)) return <Forbidden />

  const backLink = (
    <Link to={back.to} search={back.search} className={HEADER_BUTTON}>
      <ArrowLeft className="size-4" />
      Daily Reports
    </Link>
  )

  let body: ReactNode
  if (!id || missing === 'sales-incharge') {
    body = (
      <EmptyState
        icon={UserX}
        title="This sales incharge isn't in the selected company"
        description="They may belong to a different company. Go back to the list to pick a rep in this one."
        action={backLink}
      />
    )
  } else if (isLoading) {
    body = <DetailSkeleton />
  } else if (missing === 'report') {
    body = (
      <EmptyState
        icon={CalendarX2}
        title={`No ${kind} report for this date`}
        description={
          kind === 'morning'
            ? 'There was no check-in that day, or the first check-in was at or after 12:00 PM.'
            : 'There was no check-in that day.'
        }
      />
    )
  } else if (error || !report) {
    body = (
      <EmptyState
        icon={CalendarX2}
        title="Couldn't load this report"
        description={error?.message || 'Something went wrong. Try again.'}
        action={
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        }
      />
    )
  } else {
    body = (
      <div className="space-y-4">
        <ReportFacts report={report} />
        <ReportCounterTiles counters={report.counters} />
        {report.divisions.map((division) => (
          <DivisionMeasures key={division.companyId} division={division} />
        ))}
        <RemarksList remarks={report.remarks} />
      </div>
    )
  }

  return (
    <div>
      {/* Header — whose report, which one, which day, and the way back. */}
      <div className="mb-5 rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {KIND_LABEL[kind]} Report · {reportDateLabel(date)}
              </p>
              <h1 className="truncate font-heading text-xl font-semibold tracking-tight">
                {name ?? 'Sales incharge'}
              </h1>
              {code ? (
                <span className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <Hash className="size-3" />
                  {code}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {id && missing !== 'sales-incharge' ? (
              <Tabs value={kind} onValueChange={selectKind}>
                <TabsList>
                  {DAILY_REPORT_KINDS.map((item) => (
                    <TabsTrigger key={item.value} value={item.value} className="cursor-pointer">
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : null}
            {backLink}
          </div>
        </div>
      </div>

      {body}
    </div>
  )
}
