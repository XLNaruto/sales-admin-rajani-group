import type { ReactNode } from 'react'
import { ShieldCheck, ThumbsUp, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { coverageBand } from '../lib/journey-metrics'
import { stampLabel } from '../lib/journey-format'
import type { QueueSummary } from '../types'

const BAND_TEXT = {
  low: 'text-destructive',
  fair: 'text-warning',
  good: 'text-success',
} as const

/** Nothing loaded yet — the cards render at zero rather than jumping in later. */
const EMPTY: QueueSummary = {
  total: 0,
  avgCoverage: 0,
  clean: 0,
  needsLook: 0,
  approved: 0,
  pending: 0,
  draft: 0,
  reviewedPercentage: 0,
  generatedAt: null,
}

/**
 * The period's headline numbers.
 *
 * Every figure here comes from `GET /journey-plans/summary`, computed over the
 * **whole period** rather than the page — which is what keeps the cards and
 * "N awaiting review" steady while the user pages and filters. Three stacked
 * bands with no outer chrome: a provenance line, the review-split rail, and a
 * row of metric cards.
 */
export function RunSummary({ summary }: { summary?: QueueSummary }) {
  const {
    total,
    avgCoverage,
    clean,
    needsLook,
    approved,
    pending,
    reviewedPercentage,
    generatedAt,
    // `pending` is the server's pending_approval count, not `total - approved`:
    // drafts and superseded plans are neither approved nor awaiting review.
  } = summary ?? EMPTY
  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  /** The unapproved remainder, which the rail's two slices have to share. */
  const unapproved = Math.max(0, total - approved)

  return (
    <div className="mb-5">
      {/* Provenance — when the batch was produced. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{total}</span>
        <span>plans</span>
        <span className="text-border">|</span>
        <span>generated {stampLabel(generatedAt)}</span>

        <Hint
          side="bottom"
          align="end"
          label={
            <span className="tabular-nums">
              {approved} approved · {clean} clean · {needsLook} flagged
            </span>
          }
        >
          <span className="ml-auto cursor-default font-mono tabular-nums text-foreground">
            {reviewedPercentage}% reviewed
          </span>
        </Hint>
      </div>

      {/* Review split — where the work sits, as a rail under the provenance line. */}
      <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-muted">
        <Segment className="bg-info" width={pct(approved)} />
        <Segment className="bg-success" width={pct(Math.min(clean, unapproved))} />
        <Segment className="bg-destructive/70" width={pct(Math.min(needsLook, unapproved))} />
      </div>

      {/* Metric cards — 1-up on phones, 2-up from sm, 4-up from lg. */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="Avg coverage">
          <CoverageRing value={avgCoverage} />
          <Footnote>across {total} plans</Footnote>
        </Cell>

        <Cell label="Clean">
          <Count icon={ShieldCheck} tone="success" value={clean} total={total} />
          <Footnote>no solver flags</Footnote>
        </Cell>

        <Cell label="Needs a look">
          <Count icon={TriangleAlert} tone="destructive" value={needsLook} total={total} />
          <Footnote>at least one flag</Footnote>
        </Cell>

        <Cell label="Approved">
          <Count icon={ThumbsUp} tone="info" value={approved} total={total} />
          <Footnote>{pending} awaiting review</Footnote>
        </Cell>
      </div>
    </div>
  )
}

/** One metric card: caps label, the figure, then a one-line footnote. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-[rgba(99,99,99,0.14)_0px_1px_5px_0px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

/**
 * Coverage as a conic-gradient dial. The band colour is set on the ring and picked
 * up by `conic-gradient(currentColor …)`, so one class recolours both the arc and
 * the reading.
 */
function CoverageRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full',
          BAND_TEXT[coverageBand(value)],
        )}
        style={{ background: `conic-gradient(currentColor ${clamped}%, var(--muted) 0)` }}
      >
        <span className="grid size-8 place-items-center rounded-full bg-card" />
      </span>
      <p
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Average beat coverage"
        className={cn(
          'font-heading text-2xl font-semibold leading-none tabular-nums',
          BAND_TEXT[coverageBand(value)],
        )}
      >
        {clamped}
        <span className="text-sm font-medium text-muted-foreground">%</span>
      </p>
    </div>
  )
}

const TONE = {
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
} as const

const TONE_TEXT = {
  success: 'text-success',
  destructive: 'text-destructive',
  info: 'text-info',
} as const

/** A count as icon chip + `value / total`, matching the ring's optical weight. */
function Count({
  icon: Icon,
  tone,
  value,
  total,
}: {
  icon: LucideIcon
  tone: keyof typeof TONE
  value: number
  total: number
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', TONE[tone])}>
        <Icon className="size-5" />
      </span>
      <p className="font-heading text-2xl font-semibold leading-none tabular-nums">
        <span className={TONE_TEXT[tone]}>{value}</span>
        <span className="ml-1 text-sm font-medium text-muted-foreground">/ {total}</span>
      </p>
    </div>
  )
}

function Footnote({ children }: { children: ReactNode }) {
  return <p className="mt-2 truncate text-xs text-muted-foreground">{children}</p>
}

/** A slice of the rail — hidden entirely at zero so no hairline shows. */
function Segment({ className, width }: { className: string; width: number }) {
  if (width <= 0) return null
  return <span className={className} style={{ width: `${width}%` }} />
}
