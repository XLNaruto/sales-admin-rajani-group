import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowRight, Check, ImageOff, X } from 'lucide-react'
import { PreviewTrigger } from '@/components/common/file-preview-lightbox'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { errorStatus, getApiErrorMessage } from '@/lib/api-error'
import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'
import { useRetailerEditRequest } from '../api/use-retailer-edit-requests'
import { useRetailerEditNames } from '../hooks/use-retailer-edit-names'
import {
  buildRetailerEditDiff,
  countChanges,
  ownersChanged,
  type RetailerEditDiffRow,
} from '../lib/retailer-edit-diff'
import type {
  RetailerEditOwner,
  RetailerEditRequest,
  RetailerEditRequestDetail,
} from '../types'
import { RetailerEditOutlet, RetailerEditRequester } from './retailer-edit-cells'

/** An ISO-8601 timestamp as "25 Jun 2026, 03:10 AM". */
function stampLabel(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM yyyy, hh:mm a')
  } catch {
    return iso
  }
}

/** A 'yyyy-MM-dd' date as "14 May 1980". */
function dateLabel(value: string | null): string | null {
  if (!value) return null
  try {
    return format(parseISO(value), 'd MMM yyyy')
  } catch {
    return value
  }
}

function Field({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{value ?? '—'}</dd>
    </div>
  )
}

/** Column headings shared by every comparison block. */
function CompareHeader() {
  return (
    <div className="hidden grid-cols-[9rem_1fr_auto_1fr] gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
      <span>Field</span>
      <span>Current</span>
      <span className="w-4" />
      <span>Requested</span>
    </div>
  )
}

/** One field: current → requested, highlighted when it changes. */
function DiffRow({ row }: { row: RetailerEditDiffRow }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-1 border-b border-border/60 px-4 py-2.5 last:border-b-0 sm:grid-cols-[9rem_1fr_auto_1fr] sm:items-start sm:gap-3',
        row.changed && 'bg-amber-500/5',
      )}
    >
      <span className="text-xs font-medium text-muted-foreground sm:pt-0.5">
        {row.label}
        {row.changed ? (
          <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-px text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">
            Changed
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'min-w-0 break-words text-sm',
          row.changed ? 'text-muted-foreground line-through decoration-rose-500/50' : 'text-foreground',
        )}
      >
        {row.before ?? '—'}
      </span>
      <ArrowRight className="hidden size-4 text-muted-foreground sm:mt-0.5 sm:block" />
      <span className="min-w-0">
        <span
          className={cn(
            'block break-words text-sm',
            row.changed ? 'font-medium text-foreground' : 'text-foreground',
          )}
        >
          {row.after ?? (row.changed ? 'Cleared' : '—')}
        </span>
        {row.note ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{row.note}</span>
        ) : null}
      </span>
    </div>
  )
}

function OwnerList({ owners }: { owners: RetailerEditOwner[] }) {
  if (owners.length === 0) return <p className="text-sm text-muted-foreground">No owners</p>
  return (
    <ul className="space-y-2">
      {owners.map((o, i) => (
        <li key={i} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{o.name ?? 'Unnamed owner'}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {[o.mobile, o.alternateMobile].filter(Boolean).join(' · ')}
          </p>
          {o.birthDate || o.marriageAnniversary ? (
            <p className="text-xs text-muted-foreground">
              {[
                o.birthDate ? `DOB ${dateLabel(o.birthDate)}` : null,
                o.marriageAnniversary
                  ? `Anniversary ${dateLabel(o.marriageAnniversary)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function Photo({ path, label }: { path: string | null; label: string }) {
  const url = mediaUrl(path)
  if (!url) {
    return (
      <div className="grid h-28 place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 text-xs">
          <ImageOff className="size-4" /> No photo
        </span>
      </div>
    )
  }
  return (
    <PreviewTrigger files={[{ src: url, name: label }]} label={`Preview ${label}`} className="block w-full">
      <img
        src={url}
        alt={label}
        loading="lazy"
        decoding="async"
        className="h-28 w-full rounded-lg border border-border object-cover"
      />
    </PreviewTrigger>
  )
}

/** A titled side-by-side block (owners, photo) with a "Changed" marker. */
function SideBySide({
  title,
  changed,
  before,
  after,
}: {
  title: string
  changed: boolean
  before: ReactNode
  after: ReactNode
}) {
  return (
    <div className={cn('border-t border-border/60 px-4 py-3', changed && 'bg-amber-500/5')}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {title}
        {changed ? (
          <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-px text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">
            Changed
          </span>
        ) : null}
      </p>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs text-muted-foreground sm:hidden">Current</p>
          {before}
        </div>
        <ArrowRight className="hidden size-4 self-center text-muted-foreground sm:block" />
        <div className="min-w-0">
          <p className="mb-1.5 text-xs text-muted-foreground sm:hidden">Requested</p>
          {after}
        </div>
      </div>
    </div>
  )
}

/** Current outlet vs. the requested change, field by field. */
export function RetailerEditComparison({ view }: { view: RetailerEditRequestDetail }) {
  const names = useRetailerEditNames(view)
  const current = view.currentRetailer
  const proposed = view.payload
  const rows = buildRetailerEditDiff(current, proposed, names)
  const changes = countChanges(rows, current, proposed)
  const ownersDiffer = ownersChanged(current?.owners ?? [], proposed.owners)
  const photoDiffers = (current?.shopPhotoPath ?? null) !== (proposed.shopPhotoPath ?? null)

  return (
    <div className="space-y-2">
      {current === null ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          This outlet has since been deleted — only the requested values are shown, and the
          request can't be approved.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {changes === 0
            ? 'The request matches the outlet as it is now — approving changes nothing.'
            : `${changes} field${changes === 1 ? '' : 's'} would change. Fields the rep left empty are cleared on approval.`}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-border/60">
        <CompareHeader />
        {rows.map((r) => (
          <DiffRow key={r.key} row={r} />
        ))}
        <SideBySide
          title="Owners / partners"
          changed={ownersDiffer}
          before={<OwnerList owners={current?.owners ?? []} />}
          after={<OwnerList owners={proposed.owners} />}
        />
        <SideBySide
          title="Shop photo"
          changed={photoDiffers}
          before={<Photo path={current?.shopPhotoPath ?? null} label="Current shop photo" />}
          after={<Photo path={proposed.shopPhotoPath} label="Requested shop photo" />}
        />
      </div>
    </div>
  )
}

interface Props {
  /** The row to show; `null` closes the dialog. */
  request: RetailerEditRequest | null
  onClose: () => void
  onApprove: (request: RetailerEditRequest) => void
  onReject: (request: RetailerEditRequest) => void
  canApprove: boolean
}

/**
 * One retailer edit request, re-read by id on open (another admin may have
 * answered it, and the read carries the outlet as it is now), shown as a
 * field-by-field comparison.
 */
export function RetailerEditRequestDetailDialog({
  request,
  onClose,
  onApprove,
  onReject,
  canApprove,
}: Props) {
  const open = request !== null
  const { data, isLoading, isError, error } = useRetailerEditRequest(request?.id ?? null)

  // Prefer the fresh read; fall back to the row so the dialog never opens empty.
  const view: RetailerEditRequest | null = data ?? request
  const isPending = data?.status === 'pending'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
        showClose
        onClose={onClose}
      >
        <DialogHeader className="pr-10">
          <DialogTitle>Retailer edit request</DialogTitle>
          <DialogDescription>
            Approving applies the requested values to the outlet. Rejecting leaves the outlet
            as it is and sends your reason to the rep.
          </DialogDescription>
        </DialogHeader>

        {view ? (
          <div className="mt-2 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <RetailerEditOutlet request={view} size="lg" />
              {/* Wait for the re-read — a stale status is the one thing worth getting wrong. */}
              {isLoading ? (
                <Skeleton className="h-6 w-20 rounded-full" />
              ) : (
                <StatusBadge status={view.status} />
              )}
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Requested by" value={<RetailerEditRequester request={view} />} />
              <Field label="Requested" value={stampLabel(view.createdAt)} />
              <Field label="Answered" value={stampLabel(view.reviewedAt)} />
              {view.reviewReason ? (
                <Field
                  label={view.status === 'rejected' ? 'Reject reason' : 'Review note'}
                  value={view.reviewReason}
                  wide
                />
              ) : null}
            </dl>

            {isError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
                {errorStatus(error) === 404
                  ? 'This edit request no longer exists.'
                  : getApiErrorMessage(error, "Couldn't load this request.")}
              </p>
            ) : isLoading || !data ? (
              <div className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : (
              <RetailerEditComparison view={data} />
            )}
          </div>
        ) : null}

        <DialogFooter className="mt-6 gap-2 sm:justify-end">
          <Button variant="outline" className="cursor-pointer" onClick={onClose}>
            Close
          </Button>
          {/* Only once the re-read confirms the request is still open. */}
          {canApprove && data && isPending ? (
            <>
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={() => onReject(data)}
              >
                <X /> Reject
              </Button>
              {data.currentRetailer ? (
                <Button className="cursor-pointer" onClick={() => onApprove(data)}>
                  <Check /> Approve
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
