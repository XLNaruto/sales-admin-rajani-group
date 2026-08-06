import { useState } from 'react'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import {
  useDeletePaymentCondition,
  usePaymentConditionList,
  usePaymentConditionsInfinite,
} from '../api/use-payment-conditions'
import type { PaymentConditionFilters } from '../components/payment-condition-toolbar'
import type { PaymentCondition, PaymentConditionSortBy } from '../types'

/** Empty filter state — also used to reset the toolbar. */
const INITIAL_FILTERS: PaymentConditionFilters = { search: '' }

/** Map a table column id → the list endpoint's `sort_by` value. */
const SORT_BY_COLUMN: Record<string, PaymentConditionSortBy> = {
  name: 'condition_name',
}

/**
 * Orchestrates the payment-condition master screen: filter/pagination/sort
 * state, the live (server-filtered) list query, the delete flow, and the
 * add/edit modal state. The page consumes this and only renders.
 */
export function usePaymentConditionsList() {
  const [filters, setFilters] = useState<PaymentConditionFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // Any filter/sort change resets to the first page.
  const patchFilters = (patch: Partial<PaymentConditionFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }
  const resetFilters = () => {
    setFilters(INITIAL_FILTERS)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }
  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const sort = sorting[0]
  const sortBy = sort ? SORT_BY_COLUMN[sort.id] : undefined

  // "All" selected → lazy/infinite mode; otherwise classic page-by-page.
  const isAll = pagination.pageSize === ALL_PAGE_SIZE

  // Shared server-side filter/sort params (page/size differ per mode).
  const baseParams = {
    search: filters.search.trim() || undefined,
    sortBy,
    sortOrder: sortBy ? (sort.desc ? 'desc' : 'asc') : undefined,
  } as const

  // Only one of the two queries is enabled at a time (based on `isAll`).
  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } =
    usePaymentConditionList(
      {
        ...baseParams,
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      },
      { enabled: !isAll },
    )

  const infinite = usePaymentConditionsInfinite(
    { ...baseParams, pageSize: INFINITE_BATCH_SIZE },
    { enabled: isAll },
  )

  const infiniteRows = infinite.data?.pages.flatMap((p) => p.items) ?? []
  const infiniteTotal = infinite.data?.pages.at(-1)?.total ?? infiniteRows.length

  const rows = isAll ? infiniteRows : (data?.items ?? [])
  const rowCount = isAll ? infiniteTotal : (data?.total ?? 0)
  const listIsLoading = isAll ? infinite.isLoading : isLoading
  const listIsError = isAll ? infinite.isError : isError
  // Surfaced so the page can render the Forbidden screen on a 403.
  const listError = isAll ? infinite.error : error

  // Manual refresh for the toolbar: refetch the active query (paged or
  // infinite) and surface when the rows on screen were last fetched.
  const refresh = {
    onRefresh: () => {
      void (isAll ? infinite.refetch() : refetch())
    },
    updatedAt: isAll ? infinite.dataUpdatedAt : dataUpdatedAt,
    isFetching: isAll ? infinite.isFetching : isFetching,
  }
  const hasActiveFilters = filters.search !== ''

  // Add/edit modal — `editRow === null` in create mode, a row in edit mode.
  // The list row itself seeds the form: it already carries every editable
  // field, so the GET-by-id read would only cost a round trip.
  const [modalOpen, setModalOpen] = useState(false)
  const [editRow, setEditRow] = useState<PaymentCondition | null>(null)
  const openCreate = () => {
    setEditRow(null)
    setModalOpen(true)
  }
  const openEdit = (row: PaymentCondition) => {
    setEditRow(row)
    setModalOpen(true)
  }
  const closeModal = () => setModalOpen(false)

  // Delete flow — confirm in a dialog, then DELETE the selected row. The API
  // refuses (409) while a distributor still trades on the condition; that
  // message is what the toast shows.
  const deletePaymentCondition = useDeletePaymentCondition()
  const [pendingDelete, setPendingDelete] = useState<PaymentCondition | null>(null)
  const confirmDelete = () => {
    if (!pendingDelete) return
    const target = pendingDelete
    deletePaymentCondition.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${target.name} removed`)
        setPendingDelete(null)
      },
      onError: (e) =>
        toast.error(
          e instanceof Error ? e.message : "Couldn't remove the payment condition.",
        ),
    })
  }

  return {
    filters,
    patchFilters,
    resetFilters,
    rows,
    rowCount,
    pagination,
    setPagination,
    sorting,
    onSortingChange,
    refresh,
    isLoading: listIsLoading,
    isError: listIsError,
    error: listError,
    // Infinite ("All") scroll wiring — no-op unless the "All" page size is set.
    onLoadMore: isAll ? () => infinite.fetchNextPage() : undefined,
    hasMore: isAll ? infinite.hasNextPage : false,
    isFetchingMore: isAll ? infinite.isFetchingNextPage : false,
    hasActiveFilters,
    modalOpen,
    editRow,
    openCreate,
    openEdit,
    closeModal,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deletePaymentCondition.isPending,
  }
}
