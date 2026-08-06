import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  createPaymentCondition,
  deletePaymentCondition,
  fetchPaymentCondition,
  fetchPaymentConditions,
  updatePaymentCondition,
} from './payment-condition-api'
import type { PaymentConditionInput, PaymentConditionListParams } from '../types'

/** GET /sales-incharge-admin/payment-conditions — live, server-filtered list. */
export function usePaymentConditionList(
  params: PaymentConditionListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.masters.paymentConditions(params as Record<string, unknown>),
    queryFn: () => fetchPaymentConditions(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/payment-conditions — infinite ("All") variant.
 * Loads one batch per page and appends the next as the list is scrolled;
 * drives the DataTable's infinite-scroll mode. `params` should NOT include
 * `page` (the hook owns paging) but may carry search/sort.
 */
export function usePaymentConditionsInfinite(
  params: Omit<PaymentConditionListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.masters.paymentConditionsInfinite(
      params as Record<string, unknown>,
    ),
    queryFn: ({ pageParam }) => fetchPaymentConditions({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/**
 * The master as a dropdown source — every condition in one page, sorted by
 * name. The master rarely changes, so it's cached for 5 minutes.
 */
export function usePaymentConditions(params: PaymentConditionListParams = {}) {
  return useQuery({
    queryKey: queryKeys.masters.paymentConditions(params as Record<string, unknown>),
    // The master is small enough to fetch in one page (`page_size` caps at 100).
    queryFn: () =>
      fetchPaymentConditions({
        pageSize: 100,
        sortBy: 'condition_name',
        sortOrder: 'asc',
        ...params,
      }),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * GET /sales-incharge-admin/payment-conditions/{id} — a single condition. The
 * list screen seeds its edit form from the row it already holds, so this is
 * for callers that arrive with only an id.
 */
export function usePaymentCondition(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.masters.paymentCondition(id ?? 0),
    queryFn: () => fetchPaymentCondition(id as number),
    enabled: id != null,
  })
}

/** POST /sales-incharge-admin/payment-conditions — create, then refresh. */
export function useCreatePaymentCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PaymentConditionInput) => createPaymentCondition(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.all }),
  })
}

/** PATCH /sales-incharge-admin/payment-conditions/{id} — update, then refresh. */
export function useUpdatePaymentCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: PaymentConditionInput }) =>
      updatePaymentCondition(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.all }),
  })
}

/** DELETE /sales-incharge-admin/payment-conditions/{id} — remove, then refresh. */
export function useDeletePaymentCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePaymentCondition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.all }),
  })
}
