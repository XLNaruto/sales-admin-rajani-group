import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { BeatAllocation, BeatAllocationInput } from '../types'

// Mock in-memory store so new allocations appear in the list.
const ALLOCATIONS: BeatAllocation[] = [
  {
    id: 'al1',
    beatId: 'bt1',
    salesmanId: 'sm1',
    visitDays: ['Mon', 'Thu'],
    effectiveFrom: '2025-06-01',
    effectiveTo: null,
    status: 'active',
    source: 'admin',
    approvalStatus: 'approved',
    allocatedBy: 'admin',
  },
  {
    id: 'al2',
    beatId: 'bt2',
    salesmanId: 'sm4',
    visitDays: ['Tue', 'Fri'],
    effectiveFrom: '2025-04-15',
    effectiveTo: null,
    status: 'active',
    source: 'field_request',
    approvalStatus: 'pending',
    allocatedBy: 'sm4',
  },
  {
    id: 'al3',
    beatId: 'bt3',
    salesmanId: 'sm7',
    visitDays: ['Wed'],
    effectiveFrom: '2025-01-01',
    effectiveTo: '2025-03-31',
    status: 'ended',
    source: 'admin',
    approvalStatus: 'approved',
    allocatedBy: 'admin',
  },
]

export function useBeatAllocations() {
  return useQuery({
    queryKey: queryKeys.beatAllocations.list(),
    queryFn: () => mockDelay([...ALLOCATIONS]),
  })
}

export function useCreateBeatAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BeatAllocationInput) => {
      const created: BeatAllocation = {
        id: `al-${crypto.randomUUID().slice(0, 8)}`,
        ...payload,
      }
      ALLOCATIONS.unshift(created)
      return mockDelay(created, 500)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.beatAllocations.all }),
  })
}

/** End an open allocation: sets the end date and flips status to 'ended'. */
export function useEndBeatAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, effectiveTo }: { id: string; effectiveTo: string }) => {
      const row = ALLOCATIONS.find((a) => a.id === id)
      if (row) {
        row.effectiveTo = effectiveTo
        row.status = 'ended'
      }
      return mockDelay({ id }, 400)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.beatAllocations.all }),
  })
}

export function useDeleteBeatAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      const idx = ALLOCATIONS.findIndex((a) => a.id === id)
      if (idx !== -1) ALLOCATIONS.splice(idx, 1)
      return mockDelay({ id }, 400)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.beatAllocations.all }),
  })
}
