import { useMemo } from 'react'
import type { ColumnDef, OnChangeFn, PaginationState } from '@tanstack/react-table'
import { Footprints, PackageCheck, ReceiptText, Store, type LucideIcon } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { Hint } from '@/components/common/hint'
import { Badge } from '@/components/ui/badge'
import {
  formatAmount,
  formatQty,
  salesDetailsRowKind,
  timeIST,
  type SalesDetailsRowKind,
} from '../lib/daily-summary-format'
import type { SalesDetailsCallType, SalesDetailsRow } from '../types'

const CELL = 'px-3 text-xs [&:is(th)]:h-10 [&:is(th)]:text-[11px] [&:is(td)]:py-2.5'
const NOWRAP = `${CELL} whitespace-nowrap`
const NUMERIC = `${CELL} whitespace-nowrap text-right tabular-nums`

const CALL_TYPE_LABEL: Record<SalesDetailsCallType, string> = {
  in_turn: 'In turn',
  out_of_turn: 'Out of turn',
  telephonic: 'Telephonic',
}

const PARTY_TYPE_LABEL = { retailer: 'Retailer', distributor: 'Distributor' } as const

const KIND_BADGE: Record<
  SalesDetailsRowKind,
  { label: string; hint: string; icon: LucideIcon; className: string }
> = {
  visit_and_order: {
    label: 'Visit + Order',
    hint: 'Visited, and an order of the selected company was booked on this call',
    icon: Store,
    className:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
  },
  visit_only: {
    label: 'Visit only',
    hint: 'Visited, but no order in the selected company. An order may have been booked under another company.',
    icon: Footprints,
    className:
      'border-blue-500/40 bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
  },
  order_only: {
    label: 'Order only',
    hint: 'An order booked with no visit behind it',
    icon: PackageCheck,
    className: 'border-primary/40 bg-primary/10 text-primary ring-primary/20',
  },
}

/** Says what the row is — every row gets one. */
function KindBadge({ kind }: { kind: SalesDetailsRowKind }) {
  const { label, hint, icon: Icon, className } = KIND_BADGE[kind]
  return (
    <Hint label={hint}>
      <Badge
        variant="outline"
        className={`cursor-help gap-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${className}`}
      >
        <Icon className="size-3" />
        {label}
      </Badge>
    </Hint>
  )
}

/** Placeholder for a missing text value. */
const NA = <span className="text-muted-foreground">N/A</span>

/** Rupees with the ₹ sign, two decimals; a zero reads `₹0` rather than `₹0.00`. */
const amount = (value: number) => `₹${value === 0 ? '0' : formatAmount(value)}`

/**
 * A figure cell. On a visit-only row every figure is zero by design (no order
 * in the selected company), so the zeros are muted rather than read as a
 * missing order.
 */
function Figure({ row, children }: { row: SalesDetailsRow; children: string }) {
  return salesDetailsRowKind(row) === 'visit_only' ? (
    <span className="text-muted-foreground">{children}</span>
  ) : (
    <>{children}</>
  )
}

/** A numeric header, right-aligned to sit over its figures. */
const right = (title: string) => () => <span className="block text-right">{title}</span>

interface SalesDetailsTableProps {
  rows: SalesDetailsRow[]
  total: number
  isLoading: boolean
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  pageSizeOptions: number[]
}

/**
 * A rep's calls on the day in time order, one row per call with the orders
 * booked in it summed. Server-paged, so it has no totals footer — that would
 * only sum the current page. The page shows the whole-day totals instead.
 */
export function SalesDetailsTable({
  rows,
  total,
  isLoading,
  pagination,
  onPaginationChange,
  pageSizeOptions,
}: SalesDetailsTableProps) {
  const columns = useMemo<ColumnDef<SalesDetailsRow>[]>(
    () => [
      {
        id: 'at',
        header: 'Time',
        meta: { className: NOWRAP },
        cell: ({ row }) => {
          const time = timeIST(row.original.at)
          return (
            <div className="flex flex-col items-start gap-1">
              {time ? <span className="tabular-nums">{time}</span> : NA}
              <KindBadge kind={salesDetailsRowKind(row.original)} />
            </div>
          )
        },
      },
      {
        id: 'beat',
        header: 'Beat',
        meta: { className: `${CELL} min-w-56 whitespace-nowrap` },
        cell: ({ row }) =>
          row.original.beatName ?? NA,
      },
      {
        id: 'party',
        header: 'Outlet',
        meta: { className: `${CELL} min-w-64 whitespace-nowrap` },
        cell: ({ row }) => {
          const { partyName, partyType } = row.original
          return (
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">{partyName ?? NA}</span>
              <span className="flex flex-wrap gap-1">
                {partyType && (
                  <Badge variant={partyType === 'distributor' ? 'default' : 'secondary'} className="text-[10px]">
                    {PARTY_TYPE_LABEL[partyType]}
                  </Badge>
                )}
              </span>
            </div>
          )
        },
      },
      {
        id: 'call_type',
        header: 'Call Type',
        meta: { className: NOWRAP },
        cell: ({ row }) =>
          row.original.callType ? CALL_TYPE_LABEL[row.original.callType] : NA,
      },
      {
        id: 'ovt',
        header: 'OVT',
        meta: { className: NOWRAP },
        cell: ({ row }) => (row.original.isOvt ? <Badge variant="warning">Yes</Badge> : 'No'),
      },
      {
        id: 'productive',
        header: 'Productive',
        meta: { className: NOWRAP },
        cell: ({ row }) =>
          row.original.isProductive ? <Badge variant="success">Yes</Badge> : 'No',
      },
      {
        id: 'qty',
        header: right('Qty (Unit)'),
        meta: { className: NUMERIC },
        cell: ({ row }) => <Figure row={row.original}>{formatQty(row.original.qty)}</Figure>,
      },
      {
        id: 'std_qty',
        header: right('Qty (Std Unit)'),
        meta: { className: NUMERIC },
        cell: ({ row }) => <Figure row={row.original}>{formatQty(row.original.stdQty)}</Figure>,
      },
      {
        id: 'value',
        header: right('Value'),
        meta: { className: NUMERIC },
        cell: ({ row }) => <Figure row={row.original}>{amount(row.original.value)}</Figure>,
      },
      {
        id: 'discount',
        header: right('Discount'),
        meta: { className: NUMERIC },
        cell: ({ row }) => <Figure row={row.original}>{amount(row.original.discount)}</Figure>,
      },
      {
        id: 'net_sales',
        header: right('Net Sales'),
        meta: { className: NUMERIC },
        cell: ({ row }) => (
          <span className="font-medium">
            <Figure row={row.original}>{amount(row.original.netSales)}</Figure>
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      itemName="calls"
      maxHeight="60vh"
      pageSize={pagination.pageSize}
      pageSizeOptions={pageSizeOptions}
      manualPagination
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      rowCount={total}
      emptyState={
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <ReceiptText className="size-6" />
          </span>
          <div>
            <p className="font-medium text-foreground">No calls or orders</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Nothing was recorded for this rep on this day. Try another date.
            </p>
          </div>
        </div>
      }
    />
  )
}
