import { IdCard, Phone, Store, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RetailerEditRequest } from '../types'

/** The outlet the request changes — its CURRENT shop name and retailer code. */
export function RetailerEditOutlet({
  request,
  size = 'sm',
}: {
  request: Pick<RetailerEditRequest, 'shopName' | 'retailerCode' | 'retailerId'>
  size?: 'sm' | 'lg'
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400',
          size === 'lg' ? 'size-11' : 'size-9',
        )}
      >
        <Store className={size === 'lg' ? 'size-5' : 'size-4.5'} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {request.shopName ?? `Outlet #${request.retailerId}`}
        </p>
        {request.retailerCode ? (
          <p className="mt-0.5 text-xs text-muted-foreground">#{request.retailerCode}</p>
        ) : null}
      </div>
    </div>
  )
}

/** The rep who raised the request — name, employee code and phone. */
export function RetailerEditRequester({
  request,
}: {
  request: Pick<
    RetailerEditRequest,
    'salesInchargeName' | 'salesInchargePhone' | 'employeeCode'
  >
}) {
  const { salesInchargeName, salesInchargePhone, employeeCode } = request
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
        <UserRound className="size-4.5" />
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
