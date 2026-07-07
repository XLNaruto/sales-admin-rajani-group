import { mockDelay } from '@/lib/utils'

/** Raw, untyped shape as it arrives from the external Field Assist feed. */
export interface FieldAssistRawRetailer {
  retailerId: unknown
  outletName: unknown
  outletCode: unknown
  linkedDistributor: unknown
  region: unknown
  outletClass: unknown
  avgMonthlySale: unknown
  active: unknown
}

/**
 * Single wrapper around the Field Assist integration. Hooks/components never
 * hit the Field Assist API directly — they go through this service so the feed
 * can be swapped without touching the UI or query layer. Rows are returned raw
 * (deliberately messy) so the import mutation can Zod-validate them.
 */
class FieldAssistService {
  async fetchRetailers(): Promise<FieldAssistRawRetailer[]> {
    return mockDelay<FieldAssistRawRetailer[]>([
      { retailerId: 'FA-9001', outletName: 'Sai Kirana Store', outletCode: 'RTL-201', linkedDistributor: 'Shree Traders', region: 'North', outletClass: 'A', avgMonthlySale: 84000, active: true },
      { retailerId: 'FA-9002', outletName: 'Balaji Super Market', outletCode: 'RTL-202', linkedDistributor: 'Maruti Distributors', region: 'West', outletClass: 'A', avgMonthlySale: 112000, active: true },
      { retailerId: 'FA-9003', outletName: 'New Ganesh Provision', outletCode: 'RTL-203', linkedDistributor: 'Ganesh Agency', region: 'South', outletClass: 'B', avgMonthlySale: 46000, active: true },
      // Bad row — missing outletName, should be skipped by validation.
      { retailerId: 'FA-9004', outletName: null, outletCode: 'RTL-204', linkedDistributor: 'Om Enterprises', region: 'West', outletClass: 'C', avgMonthlySale: 21000, active: false },
      { retailerId: 'FA-9005', outletName: 'Krishna General Store', outletCode: 'RTL-205', linkedDistributor: 'Krishna Traders', region: 'North', outletClass: 'B', avgMonthlySale: 67000, active: true },
      // Bad row — avgMonthlySale is not a number, should be skipped.
      { retailerId: 'FA-9006', outletName: 'Laxmi Stores', outletCode: 'RTL-206', linkedDistributor: 'Bhagwati Sales', region: 'East', outletClass: 'C', avgMonthlySale: 'NA', active: true },
      { retailerId: 'FA-9007', outletName: 'Annapurna Mart', outletCode: 'RTL-207', linkedDistributor: 'Shree Traders', region: 'North', outletClass: 'A', avgMonthlySale: 98000, active: true },
    ])
  }
}

export const fieldAssistService = new FieldAssistService()
