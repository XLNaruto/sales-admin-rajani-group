import { FilterBar } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import { QueueSegments } from './queue-segments'
import { RhythmLegend } from './rhythm-legend'
import type { QueueFilters } from '../hooks/use-approval-queue'
import type { QueueSegment } from '../types'

/**
 * Segment control + the shared FilterBar, stacked above the queue table.
 *
 * Only search is exposed here — with no facets the FilterBar drops its "Filters"
 * trigger, so the segments carry the narrowing on this screen.
 */
export function ApprovalQueueToolbar({
  segment,
  onSegmentChange,
  segmentCounts,
  filters,
  onChange,
  onReset,
  refresh,
}: {
  segment: QueueSegment
  onSegmentChange: (segment: QueueSegment) => void
  segmentCounts: Record<QueueSegment, number>
  filters: QueueFilters
  onChange: (patch: Partial<QueueFilters>) => void
  onReset: () => void
  refresh?: RefreshState
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <QueueSegments value={segment} onChange={onSegmentChange} counts={segmentCounts} />
        <RhythmLegend />
      </div>
      <FilterBar
        search={{
          value: filters.search,
          onChange: (search) => onChange({ search }),
          placeholder: 'Search incharge or code…',
        }}
        refresh={refresh}
        onReset={onReset}
      />
    </div>
  )
}
