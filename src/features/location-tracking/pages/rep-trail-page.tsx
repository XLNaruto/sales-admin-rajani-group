import {
  ArrowLeft,
  BadgeCheck,
  Hash,
  Navigation,
  ShieldAlert,
  UserSearch,
  type LucideIcon,
} from 'lucide-react'
import { DayStepper } from '@/components/common/day-stepper'
import { EmptyState } from '@/components/common/empty-state'
import { Hint } from '@/components/common/hint'
import { RefreshControl } from '@/components/common/refresh-control'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { isForbiddenError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { Forbidden } from '@/features/error'
import { isCompanyNotSelected } from '@/features/company'
import { TrailMap } from '../components/trail-map'
import { TrailTimeline } from '../components/trail-timeline'
import { useRepTrail } from '../hooks/use-rep-trail'
import { DISTANCE_NOTE, fixStamp, toKmPrecise } from '../lib/location-format'

/** One provenance fact in the header, as an icon + value chip. */
function HeaderChip({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: LucideIcon
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  if (!value) return null
  return (
    <Hint label={`${label}: ${value}`}>
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className={cn('truncate', mono && 'font-mono tabular-nums')}>{value}</span>
      </span>
    </Hint>
  )
}

interface RepTrailPageProps {
  /** Encrypted `?data=` token carrying `{ id, date }`. */
  data?: string
}

/**
 * Location Tracking → Rep Day Trail.
 *
 * Where one rep's handset physically was on one day, fix by fix. Normally opened
 * from a row on the Live Fleet Map, which hands over the day it was showing.
 *
 * The distance is the summed straight-line hops between consecutive fixes, so it
 * is labelled approximate everywhere it appears: it under-reports corners taken
 * between samples and over-reports slightly from GPS jitter. It is never
 * presented as road distance, and never as a correction to the Live Day route,
 * which answers a different question entirely.
 */
export function RepTrailPage({ data }: RepTrailPageProps) {
  const {
    incharge,
    inchargeName,
    inchargeCode,
    trackedDate,
    trackedDateLabel,
    today,
    selectDate,
    prevDate,
    nextDate,
    trail,
    points,
    path,
    pathSimplified,
    selectedId,
    setSelectedId,
    isLoading,
    isError,
    error,
    notFound,
    refresh,
    backToFleet,
  } = useRepTrail(data)

  if (isForbiddenError(error) && !isCompanyNotSelected(error)) return <Forbidden />

  const mock = trail?.mockSuspectedCount ?? 0

  return (
    <div>
      {/* Header — whose day, and which day. The name itself is the rep picker. */}
      <div className="mb-5 rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Navigation className="size-5" />
            </span>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                GPS trail (recorded)
              </p>
              <Combobox
                variant="inline"
                withAvatars
                placeholder="Select sales incharge"
                searchPlaceholder="Search sales incharge…"
                fallbackLabel={inchargeName ?? undefined}
                value={incharge.value}
                onChange={incharge.onChange}
                options={incharge.options}
                loading={incharge.loading}
                onScrollEnd={incharge.onScrollEnd}
                onSearchChange={incharge.onSearchChange}
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <HeaderChip icon={Hash} label="Employee code" value={inchargeCode} mono />
                <HeaderChip
                  icon={BadgeCheck}
                  label="Positions recorded"
                  value={
                    trail ? `${trail.totalPoints} position${trail.totalPoints === 1 ? '' : 's'}` : null
                  }
                />
                {mock > 0 && (
                  <Hint label="These points carry the handset's own fake-location report, stored as sent.">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                      <ShieldAlert className="size-3.5 shrink-0" />
                      {mock} fake location
                    </span>
                  </Hint>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RefreshControl {...refresh} />
            <DayStepper
              date={trackedDate}
              label={trackedDateLabel}
              max={today}
              onPrev={prevDate}
              onNext={nextDate}
              onSelect={selectDate}
            />
            {/* Goes back to the fleet map on the day this trail is showing,
                not to wherever history happens to point. */}
            <Hint label="Back to the Live Fleet Map">
              <Button variant="outline" className="cursor-pointer gap-2" onClick={backToFleet}>
                <ArrowLeft className="size-4" /> Back
              </Button>
            </Hint>
          </div>
        </div>
      </div>

      {/* A rep who belongs to another company answers exactly like one that does
          not exist, on purpose — so the copy never distinguishes the two. */}
      {notFound ? (
        <EmptyState
          icon={UserSearch}
          title="Sales incharge not found"
          description="No sales incharge with this id is available here. Pick another from the list."
          action={
            <Button className="cursor-pointer" onClick={backToFleet}>
              Back to fleet map
            </Button>
          }
        />
      ) : isError ? (
        <EmptyState
          icon={ShieldAlert}
          title="Couldn't load the trail"
          description="Something went wrong reading this day. Try refreshing."
          action={
            <Button className="cursor-pointer" onClick={refresh.onRefresh}>
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Positions"
              value={isLoading ? null : trail?.totalPoints ?? 0}
              hint="Fixes recorded by the handset on this day."
            />
            <Stat
              label="Approx. distance travelled"
              value={isLoading ? null : `${toKmPrecise(trail?.distanceMetres)} km`}
              hint={DISTANCE_NOTE}
            />
            <Stat
              label="First seen"
              value={isLoading ? null : fixStamp(trail?.firstSeenAt)}
              hint="Earliest fix of the day, in your local time."
            />
            <Stat
              label="Last seen"
              value={isLoading ? null : fixStamp(trail?.lastSeenAt)}
              hint="Latest fix of the day, in your local time."
            />
          </div>

          {/* A day-level warning, once, above the map — the individual points are
              marked on the map and in the timeline too. */}
          {mock > 0 && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-semibold">
                  {mock} of {trail?.totalPoints ?? 0} positions were reported as a fake
                  location by the device.
                </span>{' '}
                This is the handset's own report, stored as sent — those points are
                marked in red on the map and in the timeline.
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <TrailMap
              path={path}
              points={points}
              selectedId={selectedId}
              onSelect={setSelectedId}
              fitKey={`${incharge.value}:${trackedDate}`}
              isLoading={isLoading}
              height={520}
            />

            <div className="flex min-h-0 flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-heading text-sm font-semibold">Timeline</h2>
                <span className="text-[11px] text-muted-foreground">
                  {points.length} recorded
                  {pathSimplified && ' · line thinned for drawing'}
                </span>
              </div>
              {isLoading ? (
                <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <TrailTimeline
                  points={points}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  className="max-h-[520px]"
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number | null
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
      <Hint label={hint}>
        <p className="w-fit cursor-default text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {label}
        </p>
      </Hint>
      {value === null ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="mt-1 font-heading text-xl font-semibold leading-tight tabular-nums">
          {value}
        </p>
      )}
    </div>
  )
}
