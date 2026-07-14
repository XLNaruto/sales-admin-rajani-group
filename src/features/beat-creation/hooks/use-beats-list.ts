import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useSalesmen } from '@/features/sales-incharge'
import { useBeats, useDeleteBeat } from '../api/use-beats'
import { INITIAL_FILTERS, type BeatFilters } from '../components/beat-toolbar'
import type { Beat } from '../types'

/**
 * Orchestrates the beats list screen: the list + salesmen queries, filter
 * state, client-side filtering, the delete flow and navigation. The page
 * consumes this and only renders (JSX + table column definitions).
 */
export function useBeatsList() {
  const navigate = useNavigate()
  const { data, isLoading } = useBeats()
  const { data: salesmen } = useSalesmen()
  const deleteBeat = useDeleteBeat()

  const salesmanName = useMemo(() => {
    const map = new Map((salesmen ?? []).map((s) => [s.id, s.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [salesmen])

  const [filters, setFilters] = useState<BeatFilters>(INITIAL_FILTERS)
  const patchFilters = (patch: Partial<BeatFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const resetFilters = () => setFilters(INITIAL_FILTERS)

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return (data ?? []).filter((b) => {
      const matchesSearch =
        !q || b.beatName.toLowerCase().includes(q) || b.beatCode.toLowerCase().includes(q)
      const matchesMarket = filters.marketType === 'all' || b.marketType === filters.marketType
      const matchesStatus = filters.status === 'all' || b.status === filters.status
      return matchesSearch && matchesMarket && matchesStatus
    })
  }, [data, filters])

  const hasActiveFilters =
    filters.search !== '' || filters.marketType !== 'all' || filters.status !== 'all'

  const [pendingDelete, setPendingDelete] = useState<Beat | null>(null)

  const confirmDelete = () => {
    if (!pendingDelete) return
    const b = pendingDelete
    deleteBeat.mutate(b.id, {
      onSuccess: () => toast.success(`${b.beatName} removed`),
      onError: () => toast.error("Couldn't remove the beat."),
    })
  }

  const goToCreate = () => navigate({ to: '/beats/create' })
  const goToEdit = () => navigate({ to: '/beats/create' })

  return {
    filters,
    patchFilters,
    resetFilters,
    filtered,
    isLoading,
    hasActiveFilters,
    salesmanName,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    deleteIsPending: deleteBeat.isPending,
    goToCreate,
    goToEdit,
  }
}
