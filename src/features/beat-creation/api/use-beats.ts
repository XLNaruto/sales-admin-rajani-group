import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { Beat, BeatInput } from '../types'

// Mock in-memory store so newly created beats appear in the list.
const BEATS: Beat[] = [
  {
    id: 'bt1',
    beatCode: 'BT-RJK-01',
    beatName: 'Rajkot City Central',
    status: 'active',
    marketType: 'local',
    marketSystem: 'ready_stock',
    stateId: 'st-gj',
    zoneId: 'zn-gj-s',
    districtId: 'dt-rajkot',
    talukaId: 'tl-rajkot',
    cityId: 'ct-rajkot',
    villageIds: ['vl-kotharia', 'vl-mavdi'],
    distributorId: 'ds-1',
    visitCycle: 'weekly',
    visitDays: ['Mon', 'Thu'],
    assignedSalesmanId: 'sm1',
    beatProgramId: 'bp-1',
    effectiveDate: '2025-06-01',
    outlets: [
      { retailerId: 'rt-1', sequence: 1, geoLat: 22.3039, geoLng: 70.8022, geoFenceM: 100 },
      { retailerId: 'rt-8', sequence: 2, geoFenceM: 100 },
    ],
  },
  {
    id: 'bt2',
    beatCode: 'BT-VAD-02',
    beatName: 'Vadodara Rural West',
    status: 'active',
    marketType: 'rural',
    marketSystem: 'booking',
    stateId: 'st-gj',
    zoneId: 'zn-gj-c',
    districtId: 'dt-vadodara',
    talukaId: 'tl-vadodara',
    cityId: 'ct-vadodara',
    villageIds: ['vl-waghodia'],
    distributorId: 'ds-2',
    visitCycle: 'fortnightly',
    visitDays: ['Tue', 'Fri'],
    assignedSalesmanId: 'sm4',
    effectiveDate: '2025-04-15',
    outlets: [{ retailerId: 'rt-4', sequence: 1, geoFenceM: 150 }],
  },
  {
    id: 'bt3',
    beatCode: 'BT-PUN-03',
    beatName: 'Pune Counter Sales',
    status: 'inactive',
    marketType: 'counter_sales',
    marketSystem: 'ready_stock',
    stateId: 'st-mh',
    zoneId: 'zn-mh-w',
    districtId: 'dt-pune',
    talukaId: 'tl-haveli',
    cityId: 'ct-pune',
    villageIds: [],
    distributorId: 'ds-3',
    visitCycle: 'monthly',
    visitDays: ['Wed'],
    assignedSalesmanId: 'sm7',
    beatProgramId: 'bp-2',
    effectiveDate: '2025-02-01',
    outlets: [{ retailerId: 'rt-5', sequence: 1, geoFenceM: 100 }],
  },
]

export function useBeats() {
  return useQuery({
    queryKey: queryKeys.beats.list(),
    queryFn: () => mockDelay([...BEATS]),
  })
}

export function useCreateBeat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BeatInput) => {
      const created: Beat = {
        id: `bt-${crypto.randomUUID().slice(0, 8)}`,
        ...payload,
      }
      BEATS.unshift(created)
      return mockDelay(created, 500)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.beats.all }),
  })
}

export function useDeleteBeat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      const idx = BEATS.findIndex((b) => b.id === id)
      if (idx !== -1) BEATS.splice(idx, 1)
      return mockDelay({ id }, 400)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.beats.all }),
  })
}
