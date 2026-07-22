import { useMemo, type ComponentType } from 'react'
import type { ColumnDef, OnChangeFn, PaginationState } from '@tanstack/react-table'
import { Loader2, MapPinned, Search } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { gradeLabel, type Beat } from '@/features/beat-creation'

/** The per-row action a panel renders (Add on the available list, Remove on the allocated one). */
interface PanelAction {
  label: string
  icon: ComponentType<{ className?: string }>
  /** Tailwind classes for the action button's idle state (accent colour). */
  className: string
  onClick: (beat: Beat) => void
}

interface BeatAllocationPanelProps {
  title: string
  /** Header icon + its accent classes. */
  icon: ComponentType<{ className?: string }>
  accent: string
  /** Total rows across all pages (shown as a count badge). */
  rowCount: number
  rows: Beat[]
  isLoading: boolean
  isError: boolean
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  action: PanelAction
  /** Id of the beat with an in-flight add/remove (its button spins + disables). */
  pendingId: string | null
  /** Disable every action button (a mutation is in flight somewhere). */
  actionsDisabled: boolean
  emptyLabel: string
}

/**
 * One side of the beat-allocation screen: a searchable, server-paged beat table
 * with a single per-row action (Add or Remove). Both panels share this so they
 * stay visually identical.
 */
export function BeatAllocationPanel({
  title,
  icon: Icon,
  accent,
  rowCount,
  rows,
  isLoading,
  isError,
  search,
  onSearchChange,
  searchPlaceholder,
  pagination,
  onPaginationChange,
  action,
  pendingId,
  actionsDisabled,
  emptyLabel,
}: BeatAllocationPanelProps) {
  const ActionIcon = action.icon

  const columns = useMemo<ColumnDef<Beat>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination
          return (
            <span className="text-sm text-muted-foreground tabular-nums">
              {pageIndex * pageSize + row.index + 1}
            </span>
          )
        },
      },
      {
        accessorKey: 'beatName',
        header: 'Beat',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <MapPinned className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="font-medium text-foreground">{row.original.beatName}</p>
              {row.original.distributorName && (
                <p className="text-xs text-muted-foreground">
                  {row.original.distributorName}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'beatGrade',
        header: 'Grade',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-medium">
            {gradeLabel(row.original.beatGrade)}
          </Badge>
        ),
      },
      {
        id: 'action',
        header: '',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-right' },
        cell: ({ row }) => {
          const busy = pendingId === row.original.id
          return (
            <button
              type="button"
              title={action.label}
              onClick={() => action.onClick(row.original)}
              disabled={actionsDisabled}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                action.className,
              )}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ActionIcon className="size-3.5" />
              )}
              {action.label}
            </button>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingId, actionsDisabled],
  )

  return (
    <div className="flex flex-col rounded-xl border border-border/50 bg-card shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={cn('grid size-9 place-items-center rounded-lg', accent)}>
            <Icon className="size-4.5" />
          </span>
          <div className="leading-tight">
            <h2 className="font-heading text-sm font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {rowCount} {rowCount === 1 ? 'beat' : 'beats'}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="p-4">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          itemName="beats"
          maxHeight="48vh"
          pageSize={pagination.pageSize}
          pageSizeOptions={[5, 10, 25]}
          manualPagination
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          rowCount={rowCount}
          emptyState={
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <MapPinned className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                {isError ? "Couldn't load beats." : emptyLabel}
              </p>
            </div>
          }
        />
      </div>
    </div>
  )
}
