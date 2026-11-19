import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowRight, Check, Trash2, X } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { errorStatus, getApiErrorMessage } from '@/lib/api-error'
import { useFaceRequest } from '../api/use-face-requests'
import type { CurrentFace, FaceRequest, FaceRequestDetail } from '../types'
import { FaceImageStrip } from './face-image-strip'
import { FaceRequestRequester, FaceRequestTypeBadge } from './face-request-requester'

/** An ISO-8601 timestamp as "25 Jun 2026, 03:10 AM". */
function stampLabel(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM yyyy, hh:mm a')
  } catch {
    return iso
  }
}

/** "Pixel 8 · Android 15 · app 2.5.0", skipping blanks. */
function deviceLabel(d: {
  device?: string | null
  model?: string | null
  os?: string | null
  appVersion?: string | null
}): string {
  const parts = [
    [d.device, d.model].filter(Boolean).join(' '),
    d.os,
    d.appVersion ? `app ${d.appVersion}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

/** The device the live face was last captured on (`updated_*` wins over the original). */
function currentFaceDevice(f: CurrentFace): string {
  const edited = f.updatedDevice || f.updatedModel || f.updatedOs || f.updatedAppVersion
  return edited
    ? deviceLabel({
        device: f.updatedDevice,
        model: f.updatedModel,
        os: f.updatedOs,
        appVersion: f.updatedAppVersion,
      })
    : deviceLabel(f)
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

/**
 * The requested side of one image bucket. On an `edit`, `null` means the rep
 * did not re-send it (the live images stay), and `[]` means he asked to clear it.
 */
function RequestedBucket({
  keys,
  type,
  label,
}: {
  keys: string[] | null
  type: FaceRequest['type']
  label: string
}) {
  if (keys === null) {
    return (
      <FaceImageStrip
        keys={[]}
        label={label}
        emptyNote={type === 'edit' ? 'Not re-captured — current images stay' : 'No images'}
      />
    )
  }
  return (
    <FaceImageStrip
      keys={keys}
      label={label}
      emptyNote={type === 'edit' ? 'Will be cleared on approval' : 'No images'}
      emptyIsWarning={type === 'edit'}
    />
  )
}

/** Live face vs. requested capture, one bucket per row. */
function Comparison({ view }: { view: FaceRequestDetail }) {
  const live = view.currentFace
  const rows = [
    {
      title: 'Primary capture',
      liveKeys: live?.poseImages.map((i) => i.key) ?? [],
      requested: view.images,
    },
    {
      title: 'Secondary capture',
      liveKeys: live?.secondaryImages.map((i) => i.key) ?? [],
      requested: view.secondaryImages,
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="hidden grid-cols-[1fr_auto_1fr] items-end gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5 sm:grid">
        <div>
          <p className="text-sm font-medium text-foreground">Current face (live)</p>
          <p className="text-xs text-muted-foreground">
            {live ? currentFaceDevice(live) : 'No face registered yet'}
          </p>
        </div>
        <span />
        <div>
          <p className="text-sm font-medium text-foreground">Requested</p>
          <p className="text-xs text-muted-foreground">{deviceLabel(view)}</p>
        </div>
      </div>

      {rows.map((r) => (
        <div key={r.title} className="border-b border-border/60 px-4 py-3 last:border-b-0">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {r.title}
          </p>
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <div className="min-w-0">
              <p className="mb-1.5 text-xs text-muted-foreground sm:hidden">Current (live)</p>
              <FaceImageStrip
                keys={r.liveKeys}
                label={`Current ${r.title.toLowerCase()}`}
                emptyNote={live ? 'No images' : 'No face registered yet'}
              />
            </div>
            <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
            <div className="min-w-0">
              <p className="mb-1.5 text-xs text-muted-foreground sm:hidden">Requested</p>
              <RequestedBucket
                keys={r.requested}
                type={view.type}
                label={`Requested ${r.title.toLowerCase()}`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props {
  /** The row to show; `null` closes the dialog. */
  request: FaceRequest | null
  onClose: () => void
  onApprove: (request: FaceRequest) => void
  onReject: (request: FaceRequest) => void
  canApprove: boolean
  /** Ask to delete the rep's live face (the page confirms, then calls the API). */
  onDeleteFace: (request: FaceRequest) => void
  canDeleteFace: boolean
}

/**
 * One face request, re-read by id on open (another admin may have answered it,
 * and the read carries the rep's live `current_face`), shown next to the face
 * it would replace.
 */
export function FaceRequestDetailDialog({
  request,
  onClose,
  onApprove,
  onReject,
  canApprove,
  onDeleteFace,
  canDeleteFace,
}: Props) {
  const open = request !== null
  const { data, isLoading, isError, error } = useFaceRequest(request?.id ?? null)

  // Prefer the fresh read; fall back to the row so the dialog never opens empty.
  const view: FaceRequest | null = data ?? request
  const isPending = data?.status === 'pending'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
        showClose
        onClose={onClose}
      >
        <DialogHeader className="pr-10">
          <DialogTitle>Face request</DialogTitle>
          <DialogDescription>
            Approving makes the requested face live for attendance matching. Rejecting
            leaves the current face as it is.
          </DialogDescription>
        </DialogHeader>

        {view ? (
          <div className="mt-2 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <FaceRequestRequester request={view} size="lg" />
              <div className="flex items-center gap-2">
                <FaceRequestTypeBadge type={view.type} />
                {/* Wait for the re-read — a stale status is the one thing worth getting wrong. */}
                {isLoading ? (
                  <Skeleton className="h-6 w-20 rounded-full" />
                ) : (
                  <StatusBadge status={view.status} />
                )}
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Requested" value={stampLabel(view.createdAt)} />
              <Field label="Answered" value={stampLabel(view.reviewedAt)} />
              {view.rejectReason ? (
                <Field label="Reject reason" value={view.rejectReason} wide />
              ) : null}
            </dl>

            {isError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
                {errorStatus(error) === 404
                  ? 'This face request no longer exists in the selected company.'
                  : getApiErrorMessage(error, "Couldn't load this request.")}
              </p>
            ) : isLoading || !data ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : (
              <Comparison view={data} />
            )}
          </div>
        ) : null}

        <DialogFooter className="mt-6 gap-2 sm:justify-end">
          {/* The API refuses a delete while a request is pending, so only offer
              it on an answered request whose rep still has a live face. */}
          {canDeleteFace && data?.currentFace && !isPending ? (
            <Button
              variant="outline"
              className="cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
              onClick={() => onDeleteFace(data)}
            >
              <Trash2 /> Delete current face
            </Button>
          ) : null}
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
              <Button className="cursor-pointer" onClick={() => onApprove(data)}>
                <Check /> Approve
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
