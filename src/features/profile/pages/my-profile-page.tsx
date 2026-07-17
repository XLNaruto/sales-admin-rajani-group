import { differenceInMonths, differenceInYears, format, parseISO } from 'date-fns'
import {
  CalendarClock,
  CalendarDays,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMyProfile } from '../api/use-profile'
import type { ProfileStatus } from '../types'

/** Format an ISO date/date-time as 'dd MMM yyyy' (falls back to the raw value). */
function formatDate(value: string | null) {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'dd MMM yyyy')
  } catch {
    return value
  }
}

/** Drop the +91 country code for display (keeps other formats untouched). */
function formatPhone(value: string) {
  return value.replace(/^\+91/, '')
}

/** Friendly account tenure from the created-at date (e.g. "Less than a month"). */
function tenureLabel(createdAt: string) {
  try {
    const start = parseISO(createdAt)
    const now = new Date()
    const years = differenceInYears(now, start)
    if (years >= 1) return `${years} year${years > 1 ? 's' : ''}`
    const months = differenceInMonths(now, start)
    if (months >= 1) return `${months} month${months > 1 ? 's' : ''}`
    return 'Less than a month'
  } catch {
    return '—'
  }
}

const STATUS_DOT: Record<ProfileStatus, string> = {
  active: 'bg-emerald-500',
  invited: 'bg-blue-500',
  suspended: 'bg-amber-500',
  inactive: 'bg-muted-foreground',
}

const STATUS_PILL: Record<ProfileStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  invited: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  suspended: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  inactive: 'bg-muted text-muted-foreground',
}

/** A labelled read-only field tile with a soft-tinted circular icon. */
function Field({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Mail
  label: string
  value: React.ReactNode
  tint: string
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full',
          tint,
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-semibold text-foreground">
          {value ?? '—'}
        </p>
      </div>
    </Card>
  )
}

/**
 * "My Profile" — a read-only view of the signed-in sales admin's own account,
 * sourced from GET /sales-incharge-admin/me.
 */
export function MyProfilePage() {
  const { data, isLoading, isError, error } = useMyProfile()

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="View Profile"
        description="Your account details as they appear across the panel."
      />

      {isLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {error instanceof Error ? error.message : "Couldn't load your profile."}
            </p>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="space-y-5">
          {/* Header card */}
          <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative shrink-0">
                <span className="grid size-16 place-items-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">
                  {data.displayName
                    .split(' ')
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-background',
                    STATUS_DOT[data.status],
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-heading text-xl font-semibold text-foreground">
                  {data.displayName}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="size-3.5" />
                  {formatPhone(data.phone)}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                  STATUS_PILL[data.status],
                )}
              >
                <span className={cn('size-1.5 rounded-full', STATUS_DOT[data.status])} />
                {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Detail tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              icon={UserRound}
              label="Full Name"
              value={data.displayName}
              tint="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <Field
              icon={Phone}
              label="Mobile Number"
              value={formatPhone(data.phone)}
              tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <Field
              icon={Mail}
              label="Email"
              value={data.email}
              tint="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            />
            <Field
              icon={ShieldCheck}
              label="Status"
              value={data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              tint="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <Field
              icon={CalendarDays}
              label="Date Of Joining"
              value={formatDate(data.dateOfJoining)}
              tint="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <Field
              icon={CalendarClock}
              label="Been Here For"
              value={tenureLabel(data.createdAt)}
              tint="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
