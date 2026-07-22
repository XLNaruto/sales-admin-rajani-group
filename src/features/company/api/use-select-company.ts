import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useCompanyStore } from '@/stores/company-store'
import { selectMyCompany } from './company-api'
import type { CompaniesState } from '../types'

/**
 * POST /me/company/select — switch the active company (tenant). On success we:
 *  1. seed the `/me/companies` cache with the returned state,
 *  2. mirror the new selection into the company store, and
 *  3. invalidate every other query so all tenant-scoped data refetches for the
 *     newly selected company.
 */
export function useSelectCompany() {
  const queryClient = useQueryClient()
  const setSelectedCompany = useCompanyStore((s) => s.setSelectedCompany)

  return useMutation<CompaniesState, Error, number>({
    mutationFn: (companyId) => selectMyCompany(companyId),
    onSuccess: (state) => {
      queryClient.setQueryData(queryKeys.company.list(), state)

      const name =
        state.companies.find((c) => c.id === state.selectedCompanyId)?.name ?? null
      setSelectedCompany(state.selectedCompanyId, name)

      // Everything else is tenant-scoped — drop it so it refetches for the new
      // company. Keep the companies list itself (just seeded above).
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== queryKeys.company.all[0],
      })
    },
  })
}
