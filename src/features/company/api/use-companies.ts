import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useCompanyStore } from '@/stores/company-store'
import { fetchMyCompanies } from './company-api'

/**
 * GET /me/companies — the caller's tenants + the active selection. The server
 * is the source of truth, so the resolved `selectedCompanyId` (and its name) is
 * mirrored into the global company store for synchronous topbar rendering.
 *
 * Mounted inside the authenticated shell so it runs right after login.
 */
export function useCompanies() {
  const setSelectedCompany = useCompanyStore((s) => s.setSelectedCompany)

  const query = useQuery({
    queryKey: queryKeys.company.list(),
    queryFn: fetchMyCompanies,
    staleTime: 5 * 60 * 1000,
  })

  const { selectedCompanyId, companies } = query.data ?? {}
  useEffect(() => {
    if (selectedCompanyId == null) return
    const name = companies?.find((c) => c.id === selectedCompanyId)?.name ?? null
    setSelectedCompany(selectedCompanyId, name)
  }, [selectedCompanyId, companies, setSelectedCompany])

  return query
}
