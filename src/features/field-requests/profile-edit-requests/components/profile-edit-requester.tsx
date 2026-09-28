import { IdCard, Phone, Store, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProfileEditRequest } from '../types'

const REQUESTER_LABEL = {
  sales_incharge: 'Sales incharge',
  distributor: 'Distributor',
} as const

/** Who raised a profile edit request — name, type, code and phone. */
export function ProfileEditRequester({
  request,
  size = 'sm',
}: {
  request: Pick<
    ProfileEditRequest,
    'requesterType' | 'requesterName' | 'requesterPhone' | 'requesterCode'
  >
  size?: 'sm' | 'lg'
}) {
  const { requesterType, requesterName, requesterPhone, requesterCode } = request
  const isDistributor = requesterType === 'distributor'
  const Icon = isDistributor ? Store : UserRound
  const label = REQUESTER_LABEL[requesterType]

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-full',
          size === 'lg' ? 'size-11' : 'size-9',
          isDistributor
            ? 'bg-amber-600/10 text-amber-600 dark:text-amber-400'
            : 'bg-blue-600/10 text-blue-600 dark:text-blue-400',
        )}
      >
        <Icon className={size === 'lg' ? 'size-5' : 'size-4.5'} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {/* Null once the requester has been removed — the request outlives them. */}
          {requesterName ?? `Removed ${label.toLowerCase()}`}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{label}</span>
          {requesterCode ? (
            <span className="inline-flex items-center gap-1">
              <IdCard className="size-3.5" />#{requesterCode}
            </span>
          ) : null}
          {requesterPhone ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Phone className="size-3.5" />
              {requesterPhone}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
