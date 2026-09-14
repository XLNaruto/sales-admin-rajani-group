import { Building2, FileQuestion, Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorStatus, getApiErrorMessage } from '@/lib/api-error'
import {
  isCompanyNotSelected,
  useCompanies,
  useCompanyPickerStore,
} from '@/features/company'
import { useNotificationCompanyHint } from '@/features/notifications'
import { useCompanyStore } from '@/stores/company-store'
import type { NotificationEntityType } from '@/features/notifications'

interface Props {
  error: unknown
  /** Which kind of request failed to load — drives the copy and the hint lookup. */
  entityType: NotificationEntityType
  entityId: number
  /** What to call it in a sentence, e.g. "beat change request". */
  label: string
  onRetry: () => void
}

/**
 * Why a deep-linked request wouldn't open.
 *
 * Three of these are not "something went wrong" and must not read as it:
 *
 * **404 for the wrong tenant.** The inbox is per-USER; the request reads are
 * scoped to the selected company. So a notification can legitimately point at a
 * request the admin has to switch company to open, and the API says `404`, not
 * `403`. The notification's `metadata.company_ids` is what tells the two apart
 * — and it is the difference between a good experience here and a baffling one.
 *
 * **403 on the permission.** Recipients are every Sales Admin of the rep's
 * company, not only those holding the matching grant, so an admin can hold a
 * notification he cannot open. That is worth stating plainly rather than
 * swallowing the click.
 *
 * **403 COMPANY_NOT_SELECTED.** Not a denial at all — the session lost its
 * tenant. The company picker is the answer; an access-denied page is a dead end.
 */
export function RequestDetailError({
  error,
  entityType,
  entityId,
  label,
  onRetry,
}: Props) {
  const status = errorStatus(error)
  const companyIds = useNotificationCompanyHint(entityType, entityId)
  const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId)
  const requirePick = useCompanyPickerStore((s) => s.requirePick)
  const { data: companies } = useCompanies()

  const wrongCompany =
    status === 404 &&
    companyIds.length > 0 &&
    selectedCompanyId != null &&
    !companyIds.includes(selectedCompanyId)

  const owner = wrongCompany
    ? companies?.companies.find((c) => companyIds.includes(c.id))
    : undefined

  if (wrongCompany) {
    return (
      <Shell
        icon={Building2}
        tone="warning"
        title={
          owner
            ? `This request belongs to ${owner.name}.`
            : 'This request belongs to another company.'
        }
        description="You're acting as a different company right now. Switch company to open it — the notification stays in your bell either way."
      >
        <Button className="cursor-pointer" onClick={requirePick}>
          <Building2 /> Switch company
        </Button>
      </Shell>
    )
  }

  if (status === 403) {
    // The session lost its tenant rather than the user losing a grant; the
    // picker is what fixes it, so offer that instead of an access-denied wall.
    if (isCompanyNotSelected(error)) {
      return (
        <Shell
          icon={Building2}
          tone="warning"
          title="No company selected"
          description="Your session has no active company, so this request can't be read. Pick one to carry on."
        >
          <Button className="cursor-pointer" onClick={requirePick}>
            <Building2 /> Select company
          </Button>
        </Shell>
      )
    }

    return (
      <Shell
        icon={Lock}
        tone="destructive"
        title={`You don't have permission to open this ${label}`}
        description="Notifications go to every sales admin of the rep's company, not only those who can act on them — so this one reached you without the access to read it."
      />
    )
  }

  if (status === 404) {
    return (
      <Shell
        icon={FileQuestion}
        tone="muted"
        title={`This ${label} no longer exists`}
        description="It may have been withdrawn by the rep, or it belongs to a company you're not currently acting as."
      />
    )
  }

  return (
    <Shell
      icon={RefreshCw}
      tone="destructive"
      title={`Couldn't load this ${label}`}
      description={getApiErrorMessage(error)}
    >
      <Button variant="outline" className="cursor-pointer" onClick={onRetry}>
        <RefreshCw /> Try again
      </Button>
    </Shell>
  )
}

const TONE_CLASS = {
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
} as const

function Shell({
  icon: Icon,
  tone,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  tone: keyof typeof TONE_CLASS
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
      <span
        className={`grid size-12 place-items-center rounded-full ${TONE_CLASS[tone]}`}
      >
        <Icon className="size-6" />
      </span>
      <div className="max-w-md">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children ? <div className="mt-2 flex gap-2">{children}</div> : null}
    </div>
  )
}
