import { format, parseISO } from 'date-fns'
import { Store, Users, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GeoLocationValue } from '@/components/maps/geo-location-value'
import { cn } from '@/lib/utils'
import { useRetailerDetail } from '../api/use-retailers'
import type { RetailerOnboardingStatus, RetailerStatus } from '../types'

/** Format a 'yyyy-MM-dd' string as 'dd-MM-yyyy' (falls back to the raw value). */
function formatDate(value: string | null) {
  if (!value) return 'N/A'
  try {
    return format(parseISO(value), 'dd-MM-yyyy')
  } catch {
    return value
  }
}

/** Format an ISO timestamp as 'dd-MM-yyyy HH:mm' (falls back to the raw value). */
function formatDateTime(value: string | null) {
  if (!value) return 'N/A'
  try {
    return format(parseISO(value), 'dd-MM-yyyy HH:mm')
  } catch {
    return value
  }
}

const STATUS_STYLES: Record<RetailerStatus, string> = {
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  inactive: 'border-border bg-muted text-muted-foreground',
}

const ONBOARDING_STYLES: Record<RetailerOnboardingStatus, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  approved:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

/** Nothing worth rendering — null/undefined, a blank string or an empty node. */
const isBlank = (v: React.ReactNode) =>
  v == null || v === false || (typeof v === 'string' && v.trim() === '')

/** A labelled read-only field. Spans both columns when `wide`. */
function Field({
  label,
  value,
  wide,
}: {
  label: string
  value: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">
        {isBlank(value) ? <span className="text-muted-foreground">N/A</span> : value}
      </dd>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 mt-6 border-b border-border pb-2 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  )
}

interface Props {
  /** The retailer id to show; `null` closes the dialog. */
  id: string | null
  onClose: () => void
}

/**
 * Read-only "view details" modal for a single retailer. Fetches the full record
 * on open and lays it out in labelled sections (shop & owner, address &
 * territory, classification, photo).
 */
export function RetailerDetailDialog({ id, onClose }: Props) {
  const open = id !== null
  const { data, isLoading, isError, error } = useRetailerDetail(id ?? undefined)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showClose={false} className="flex max-h-[85vh] max-w-2xl flex-col p-0">
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex flex-col gap-2">
            <DialogTitle>Retailer Details</DialogTitle>
            <DialogDescription>
              Full shop, owner, address and classification details.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : isError ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {error instanceof Error ? error.message : "Couldn't load this retailer."}
            </p>
          ) : data ? (
            <div>
              {/* Header */}
              <div className="flex items-center gap-4">
                {/* Always the icon — the actual shop photo has its own section below. */}
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <Store className="size-7" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-foreground">
                    {data.shopName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('font-medium capitalize', STATUS_STYLES[data.status])}
                    >
                      {data.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-medium capitalize',
                        ONBOARDING_STYLES[data.onboardingStatus],
                      )}
                    >
                      {data.onboardingStatus}
                    </Badge>
                    {data.code && (
                      <Badge variant="outline" className="font-medium">
                        {data.code}
                      </Badge>
                    )}
                    {data.outletTypeName && (
                      <Badge variant="outline" className="font-medium">
                        {data.outletTypeName}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <SectionTitle>Shop</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Outlet Type" value={data.outletTypeName} />
                <Field label="Market" value={data.market} />
              </dl>

              <SectionTitle>
                Owners &amp; Partners
                {data.owners.length > 0 ? ` (${data.owners.length})` : ''}
              </SectionTitle>
              {data.owners.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No owners / partners on this record.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.owners.map((owner, index) => (
                    <div
                      key={`${owner.mobile}-${index}`}
                      className="rounded-xl border border-border/60 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-muted-foreground" />
                        {/* Migrated single-owner records can have no name. */}
                        <p className="text-sm font-medium text-foreground">
                          {owner.name || `Owner ${index + 1}`}
                        </p>
                      </div>
                      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                        <Field label="Mobile" value={owner.mobile} />
                        <Field label="Alternate Mobile" value={owner.alternateMobile} />
                        <Field
                          label="Birth Date"
                          value={formatDate(owner.birthDate ?? null)}
                        />
                        <Field
                          label="Marriage Anniversary"
                          value={formatDate(owner.anniversaryDate ?? null)}
                        />
                      </dl>
                    </div>
                  ))}
                </div>
              )}

              <SectionTitle>Address</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Address Line" value={data.addressLine} wide />
                <Field label="Address" value={data.address} wide />
                <Field label="Landmark" value={data.landmark} />
                <Field label="Market" value={data.market} />
                {/* Both derived: the nearest beat, and the firms serving it —
                    several when the beat is shared, so they're listed. */}
                <Field label="Beat" value={data.beatName} />
                <Field
                  label={data.distributors.length > 1 ? 'Distributors' : 'Distributor'}
                  value={data.distributors.map((d) => d.name).join(', ')}
                />
                <Field label="State" value={data.stateName} />
                <Field label="Zone" value={data.zoneName} />
                <Field label="District" value={data.districtName} />
                <Field label="Taluka" value={data.talukaName} />
                <Field label="City" value={data.cityName} />
                <Field label="Pincode" value={data.pincode} />
                <Field
                  label="Geo Location"
                  value={<GeoLocationValue value={data.geoLocation} />}
                  wide
                />
                <Field label="Resolved Address" value={data.formattedAddress} wide />
              </dl>

              <SectionTitle>Field Activity</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Visits" value={data.visitCount ?? 0} />
                <Field label="Last Visit" value={formatDateTime(data.lastVisitAt)} />
                <Field label="Last Order" value={formatDateTime(data.lastOrderAt)} />
              </dl>

              {data.shopPhotoUrl && (
                <>
                  <SectionTitle>Shop Photo</SectionTitle>
                  {/* Chat-app style preview: the whole photo stays visible inside a
                      capped box, letterboxed on whichever axis is short. */}
                  <a
                    href={data.shopPhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-fit max-w-full overflow-hidden rounded-lg border border-border"
                  >
                    <img
                      src={data.shopPhotoUrl}
                      alt="Shop"
                      loading="lazy"
                      decoding="async"
                      className="max-h-40 w-auto max-w-64 object-contain"
                    />
                  </a>
                </>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
