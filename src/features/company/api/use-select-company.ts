import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { toastMutationError } from '@/lib/api-toast'
import { useCompanyStore } from '@/stores/company-store'
import { selectMyCompany } from './company-api'
import type { CompaniesState } from '../types'

interface SelectCompanyContext {
  previous: CompaniesState | undefined
  previousId: number | null
  previousName: string | null
}

/**
 * POST /me/company/select — switch the active company (tenant).
 *
 *  1. Optimistically mark the new company active in the `/me/companies` cache
 *     and the company store, so the switcher updates the instant it's clicked.
 *  2. On success, refetch `/me/companies` (the source of truth) and invalidate
 *     every other query so all tenant-scoped data refetches for the new company.
 *  3. On error, roll the cache + store back and toast.
 */
export function useSelectCompany() {
  const queryClient = useQueryClient()
  const setSelectedCompany = useCompanyStore((s) => s.setSelectedCompany)

  return useMutation<void, Error, number, SelectCompanyContext>({
    mutationFn: (companyId) => selectMyCompany(companyId),
    onMutate: async (companyId) => {
      const key = queryKeys.company.list()
      await queryClient.cancelQueries({ queryKey: key })

      const previous = queryClient.getQueryData<CompaniesState>(key)
      const { selectedCompanyId: previousId, selectedCompanyName: previousName } =
        useCompanyStore.getState()

      if (previous) {
        queryClient.setQueryData<CompaniesState>(key, {
          ...previous,
          selectedCompanyId: companyId,
          requiresSelection: false,
        })
      }
      const name = previous?.companies.find((c) => c.id === companyId)?.name ?? null
      setSelectedCompany(companyId, name)

      return { previous, previousId, previousName }
    },
    onError: (error, _companyId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.company.list(), context.previous)
      }
      setSelectedCompany(context?.previousId ?? null, context?.previousName ?? null)
      toastMutationError(error, "Couldn't switch company.")
    },
    onSuccess: () => {
      // Reconcile the selection against the server, then drop everything else —
      // it's all tenant-scoped and must refetch for the new company.
      void queryClient.invalidateQueries({ queryKey: queryKeys.company.all })
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== queryKeys.company.all[0],
      })
    },
  })
}
