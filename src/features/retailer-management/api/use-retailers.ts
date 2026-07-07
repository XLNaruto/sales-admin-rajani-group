import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { Retailer, RetailerAnalytics } from '../types'

const RETAILERS: Retailer[] = [
  { id: 'r1', name: 'Sai Kirana Store', code: 'RTL-201', distributor: 'Shree Traders', zone: 'North', category: 'A', monthlySales: 84000, status: 'active' },
  { id: 'r2', name: 'Balaji Super Market', code: 'RTL-202', distributor: 'Maruti Distributors', zone: 'West', category: 'A', monthlySales: 112000, status: 'active' },
  { id: 'r3', name: 'New Ganesh Provision', code: 'RTL-203', distributor: 'Ganesh Agency', zone: 'South', category: 'B', monthlySales: 46000, status: 'active' },
  { id: 'r4', name: 'Om Enterprises Retail', code: 'RTL-204', distributor: 'Om Enterprises', zone: 'West', category: 'C', monthlySales: 21000, status: 'inactive' },
  { id: 'r5', name: 'Krishna General Store', code: 'RTL-205', distributor: 'Krishna Traders', zone: 'North', category: 'B', monthlySales: 67000, status: 'active' },
  { id: 'r6', name: 'Laxmi Stores', code: 'RTL-206', distributor: 'Bhagwati Sales', zone: 'East', category: 'C', monthlySales: 18000, status: 'pending' },
  { id: 'r7', name: 'Annapurna Mart', code: 'RTL-207', distributor: 'Shree Traders', zone: 'North', category: 'A', monthlySales: 98000, status: 'active' },
  { id: 'r8', name: 'Jai Bhavani Traders', code: 'RTL-208', distributor: 'Maruti Distributors', zone: 'West', category: 'B', monthlySales: 53000, status: 'active' },
]

export function useRetailers() {
  return useQuery({
    queryKey: queryKeys.retailers.list(),
    queryFn: () => mockDelay(RETAILERS),
  })
}

function buildAnalytics(retailers: Retailer[]): RetailerAnalytics {
  const categoryMap = new Map<string, number>()
  const zoneMap = new Map<string, { retailers: number; sales: number }>()

  for (const r of retailers) {
    categoryMap.set(r.category, (categoryMap.get(r.category) ?? 0) + 1)
    const zone = zoneMap.get(r.zone) ?? { retailers: 0, sales: 0 }
    zone.retailers += 1
    zone.sales += r.monthlySales
    zoneMap.set(r.zone, zone)
  }

  return {
    byCategory: [...categoryMap.entries()].map(([name, value]) => ({
      name: `Category ${name}`,
      value,
    })),
    byZone: [...zoneMap.entries()].map(([zone, agg]) => ({
      zone,
      retailers: agg.retailers,
      sales: agg.sales,
    })),
  }
}

export function useRetailerAnalytics() {
  return useQuery({
    queryKey: queryKeys.retailers.analytics(),
    queryFn: () => mockDelay(buildAnalytics(RETAILERS)),
  })
}
