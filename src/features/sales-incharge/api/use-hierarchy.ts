import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  createHierarchyEntry,
  deleteHierarchyEntry,
  fetchGeoOptions,
  fetchHierarchyTree,
  fetchSalesInchargeAdminOptions,
  updateHierarchyEntry,
  type HierarchyEntryInput,
} from './hierarchy-api'
import type { HierarchyLevel } from '../lib/hierarchy'

const FIVE_MIN = 5 * 60 * 1000

/**
 * Query options for the org hierarchy tree — shared by the hook and the route
 * loader so link-intent prefetch and the component read the same cache entry.
 */
export function hierarchyTreeQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.hierarchy.tree(),
    queryFn: () => fetchHierarchyTree(),
  })
}

/** GET /sales-incharge-admin/hierarchy — the assembled tree (or `null`). */
export function useHierarchyTree() {
  return useQuery(hierarchyTreeQueryOptions())
}

/** POST /sales-incharge-admin/hierarchy — add a node under a parent. */
export function useCreateHierarchyEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      parentId,
      input,
    }: {
      parentId: number | null
      input: HierarchyEntryInput
    }) => createHierarchyEntry(parentId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  })
}

/** PATCH /sales-incharge-admin/hierarchy/{id} — update a node in place. */
export function useUpdateHierarchyEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: HierarchyEntryInput }) =>
      updateHierarchyEntry(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  })
}

/** DELETE /sales-incharge-admin/hierarchy/{id} — remove a node and its subtree. */
export function useDeleteHierarchyEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteHierarchyEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  })
}

/**
 * Geographic options for the level's master (State/Zone/District/City). Fetched
 * only while the dialog is open and the level has a backing master; cached 5
 * minutes and keyed by level so switching level fetches the right list.
 */
export function useGeoOptions(level: HierarchyLevel, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.hierarchy.geoOptions(level),
    enabled,
    staleTime: FIVE_MIN,
    queryFn: () => fetchGeoOptions(level),
  })
}

/** Sales-incharge-admin accounts — the assignee pool for non-City levels. */
export function useSalesInchargeAdminOptions(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.salesInchargeAdmin.list(),
    enabled,
    staleTime: FIVE_MIN,
    queryFn: () => fetchSalesInchargeAdminOptions(),
  })
}
