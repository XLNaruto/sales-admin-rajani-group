import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useCompanyStore } from '@/stores/company-store'
import { fetchCategories } from './category-api'
import type { MainCategoryOption } from '../types'

const PARAMS = { type: 'parent', status: 'active', pageSize: 100 } as const

/**
 * Active main (root) categories for the companies in `companyIds` — the source
 * of the distributor form's "Assigned Products" picker.
 *
 * Kept behind this hook so the source can move to a dedicated options endpoint
 * without touching the form. Today's source, `GET /categories?type=parent`, has
 * two limits: it only returns the admin's *selected* company, and its rows carry
 * no `company_id`. Every row is therefore attributed to the selected company, and
 * `options` is empty when that company isn't among `companyIds`.
 *
 * `all` is every fetched category regardless of `companyIds` — use it to find
 * which company a picked category belongs to (e.g. when a company is un-ticked).
 */
export function useMainCategoryOptions(companyIds: string[]) {
  const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId)

  const query = useQuery({
    queryKey: queryKeys.masters.categories({ ...PARAMS, companyId: selectedCompanyId }),
    queryFn: () => fetchCategories(PARAMS),
    enabled: selectedCompanyId != null,
    staleTime: 5 * 60 * 1000,
  })

  const all = useMemo<MainCategoryOption[]>(
    () =>
      (query.data ?? [])
        // Belt and braces — `type=parent` should only return roots.
        .filter((c) => c.parent_id == null)
        .map((c) => ({
          id: c.id,
          name: c.name,
          companyId: c.company_id ?? selectedCompanyId,
        })),
    [query.data, selectedCompanyId],
  )

  const companyKey = companyIds.join(',')
  const options = useMemo(() => {
    const ticked = new Set(companyKey ? companyKey.split(',') : [])
    return all.filter((c) => c.companyId != null && ticked.has(String(c.companyId)))
  }, [all, companyKey])

  return {
    options,
    all,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
