import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { encryptParams } from '@/lib/crypto'
import { errorStatus, getApiErrorMessage } from '@/lib/api-error'
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from '@/components/data-table'
import { useOnCompanySwitch } from '@/features/company'
import {
  useRetailers,
  useRetailersInfinite,
  useDeleteRetailer,
  useSetRetailerStatus,
  useUpdateRetailerOnboarding,
} from '../api/use-retailers'
import type { RetailerFilters } from '../components/retailer-toolbar'
import type {
  Retailer,
  RetailerLifecycleStatus,
  RetailerOnboardingAction,
  RetailerOnboardingStatus,
  RetailerSortBy,
  RetailerStatus,
} from '../types'

/**
 * Map a table column id → the list endpoint's `sort_by` value. The owner column
 * is absent on purpose: an outlet can have several owners, so the endpoint won't
 * sort on them.
 */
const SORT_BY_COLUMN: Record<string, RetailerSortBy> = {
  shopName: 'shop_name',
  city: 'city_id',
  status: 'status',
}

/** Empty filter state — also used to reset the toolbar. */
const INITIAL_FILTERS: RetailerFilters = {
  search: '',
  outletTypeId: 'all',
  onboardingStatus: 'all',
  status: 'all',
}

/**
 * Orchestrates the retailer list screen: filter state, the list query, derived
 * rows/flags, the delete/approve/reject confirmation flow and navigation. The
 * page consumes this and only renders — no data/handler logic lives in the
 * component.
 */
export function useRetailersList() {
  const navigate = useNavigate()

  const [filters, setFilters] = useState<RetailerFilters>(INITIAL_FILTERS)
  // Server-side pagination + sorting state (mirrors TanStack Table's shapes).
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // Any filter/sort change resets to the first page — otherwise you could land
  // on a page that no longer exists for the narrower result set.
  const patchFilters = (patch: Partial<RetailerFilters>) => {
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

  // Every filter is applied server-side by the endpoint. The facet values are
  // plain strings ('all' when unset), so narrow them to the documented enums.
  const baseParams = {
    search: filters.search.trim() || undefined,
    status: filters.status !== 'all' ? (filters.status as RetailerStatus) : undefined,
    onboardingStatus:
      filters.onboardingStatus !== 'all'
        ? (filters.onboardingStatus as RetailerOnboardingStatus)
        : undefined,
    outletTypeId: filters.outletTypeId !== 'all' ? filters.outletTypeId : undefined,
    sortBy,
    sortOrder: sortBy ? (sort.desc ? 'desc' : 'asc') : undefined,
  } as const

  // Only one of the two queries is enabled at a time (based on `isAll`).
  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } =
    useRetailers(
    {
      ...baseParams,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !isAll },
  )

  const infinite = useRetailersInfinite(
    { ...baseParams, pageSize: INFINITE_BATCH_SIZE },
    { enabled: isAll },
  )

  const deleteRetailer = useDeleteRetailer()
  const setStatus = useSetRetailerStatus()
  const setOnboarding = useUpdateRetailerOnboarding()

  const infiniteRows = infinite.data?.pages.flatMap((p) => p.items) ?? []
  const infiniteTotal = infinite.data?.pages.at(-1)?.total ?? infiniteRows.length

  const rows = isAll ? infiniteRows : (data?.items ?? [])
  const rowCount = isAll ? infiniteTotal : (data?.total ?? 0)
  const listIsLoading = isAll ? infinite.isLoading : isLoading
  const listIsError = isAll ? infinite.isError : isError
  // Surfaced so the page can render the Forbidden screen on a 403.
  const listError = isAll ? infinite.error : error

  // Manual refresh for the toolbar: refetch the active query (paged or
  // infinite) and surface when the rows on screen were last fetched, so a
  // background change made by someone else is one click away.
  const refresh = {
    onRefresh: () => {
      void (isAll ? infinite.refetch() : refetch())
    },
    updatedAt: isAll ? infinite.dataUpdatedAt : dataUpdatedAt,
    isFetching: isAll ? infinite.isFetching : isFetching,
  }

  const hasActiveFilters =
    filters.search !== '' ||
    filters.outletTypeId !== 'all' ||
    filters.onboardingStatus !== 'all' ||
    filters.status !== 'all'

  const [pendingDelete, setPendingDelete] = useState<Retailer | null>(null)
  const [pendingApprove, setPendingApprove] = useState<Retailer | null>(null)
  const [pendingReject, setPendingReject] = useState<Retailer | null>(null)

  // Inline status change from the list toggle — PATCH the record's status.
  const changeStatus = (id: string, status: RetailerLifecycleStatus) => {
    setStatus.mutate(
      { id, status },
      {
        onSuccess: () => toast.success('Status updated'),
        onError: () => toast.error("Couldn't update the status."),
      },
    )
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const r = pendingDelete
    deleteRetailer.mutate(r.id, {
      onSuccess: () => {
        toast.success(`${r.shopName} removed`)
        setPendingDelete(null)
      },
      onError: (error) => {
        // A 409 means a business rule blocks the delete (e.g. the retailer is
        // still mapped to a beat). Surface the server's explanation instead of
        // a generic failure, and keep the dialog open so it stays visible next
        // to the action.
        if (errorStatus(error) === 409) {
          toast.error(`Can't remove ${r.shopName}`, {
            description: getApiErrorMessage(error),
          })
          return
        }
        toast.error("Couldn't remove the retailer.")
      },
    })
  }

  /**
   * Approve / reject the onboarding request. The endpoint takes only
   * `{ action }`, and 409s when the outlet already sits in the requested state —
   * surface the server's explanation for that instead of a generic failure.
   */
  const reviewOnboarding = (
    retailer: Retailer,
    action: RetailerOnboardingAction,
    done: () => void,
  ) => {
    setOnboarding.mutate(
      { id: retailer.id, action },
      {
        onSuccess: () => {
          toast.success(`${retailer.shopName} ${action}d`)
          done()
        },
        onError: (error) => {
          if (errorStatus(error) === 409) {
            toast.error(`Can't ${action} ${retailer.shopName}`, {
              description: getApiErrorMessage(error),
            })
            return
          }
          toast.error(`Couldn't ${action} the retailer.`)
        },
      },
    )
  }

  const confirmApprove = () => {
    if (pendingApprove)
      reviewOnboarding(pendingApprove, 'approve', () => setPendingApprove(null))
  }

  const confirmReject = () => {
    if (pendingReject)
      reviewOnboarding(pendingReject, 'reject', () => setPendingReject(null))
  }

  const goToCreate = () => navigate({ to: '/retailers/create' })
  // Edit reuses the create page; the raw id is encrypted into `?data=` so it's
  // never exposed in the address bar.
  const goToEdit = (id: string) =>
    navigate({ to: '/retailers/create', search: { data: encryptParams({ id }) } })
  // Resuming a local draft reuses the create page too — same `?data=` token,
  // carrying a `draftId` instead of a record id.
  const goToDraft = (draftId: string) =>
    navigate({ to: '/retailers/create', search: { data: encryptParams({ draftId }) } })


  // Switching the active company invalidates every row on screen: let go of any
  // record-pinned dialog target (its id belongs to the old tenant) and reset the
  // filters, whose option ids are tenant-scoped too.
  useOnCompanySwitch(() => {
    setPendingDelete(null)
    setPendingApprove(null)
    setPendingReject(null)
    resetFilters()
  })

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
    pendingDelete,
    setPendingDelete,
    pendingApprove,
    setPendingApprove,
    pendingReject,
    setPendingReject,
    confirmDelete,
    confirmApprove,
    confirmReject,
    changeStatus,
    isDeleting: deleteRetailer.isPending,
    isSettingStatus: setStatus.isPending,
    isSettingOnboarding: setOnboarding.isPending,
    goToCreate,
    goToDraft,
    goToEdit,
  }
}
