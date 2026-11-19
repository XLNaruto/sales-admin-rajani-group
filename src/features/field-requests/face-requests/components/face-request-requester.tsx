import { IdCard, Phone, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FaceRequest } from '../types'

/** The rep behind a face request — name, employee code and phone. */
export function FaceRequestRequester({
  request,
  size = 'sm',
}: {
  request: Pick<FaceRequest, 'salesInchargeName' | 'salesInchargePhone' | 'employeeCode'>
  size?: 'sm' | 'lg'
}) {
  const { salesInchargeName, salesInchargePhone, employeeCode } = request
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400',
          size === 'lg' ? 'size-11' : 'size-9',
        )}
      >
        <UserRound className={size === 'lg' ? 'size-5' : 'size-4.5'} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {salesInchargeName ?? 'Removed sales incharge'}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {employeeCode ? (
            <span className="inline-flex items-center gap-1">
              <IdCard className="size-3.5" />#{employeeCode}
            </span>
          ) : null}
          {salesInchargePhone ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Phone className="size-3.5" />
              {salesInchargePhone}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const TYPE_LABEL = { add: 'New registration', edit: 'Re-capture' } as const

/** `add` / `edit` as a small pill. */
export function FaceRequestTypeBadge({ type }: { type: FaceRequest['type'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        type === 'add'
          ? 'bg-violet-600/10 text-violet-700 dark:text-violet-300'
          : 'bg-sky-600/10 text-sky-700 dark:text-sky-300',
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  )
}
