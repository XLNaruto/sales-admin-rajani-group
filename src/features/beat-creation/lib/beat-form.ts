import { z } from 'zod'

// Optional numeric text field — allows empty, otherwise must be a finite number.
const optNum = (msg = 'Enter a valid number') =>
  z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && v.trim() !== ''), msg)

const outletSchema = z.object({
  retailerId: z.string().min(1, 'Select a retailer'),
  // Order is managed by the array position; kept here for the payload.
  sequence: z.number(),
  geoLat: optNum('Enter a valid latitude'),
  geoLng: optNum('Enter a valid longitude'),
  geoFenceM: optNum('Enter a valid radius'),
})

export const beatSchema = z.object({
  // Beat details
  beatCode: z.string().min(2, 'Enter the beat code'),
  beatName: z.string().min(2, 'Enter the beat name'),
  status: z.enum(['active', 'inactive']),
  marketType: z.enum(['local', 'rural', 'counter_sales'], { message: 'Select a market type' }),
  marketSystem: z.enum(['ready_stock', 'booking'], { message: 'Select a market system' }),

  // Territory & distributor
  stateId: z.string().min(1, 'Select a state'),
  zoneId: z.string().min(1, 'Select a zone'),
  districtId: z.string().min(1, 'Select a district'),
  talukaId: z.string().min(1, 'Select a taluka'),
  cityId: z.string().min(1, 'Select a city'),
  villageIds: z.array(z.string()).optional(),
  distributorId: z.string().min(1, 'Select a distributor'),

  // Schedule & allocation
  visitCycle: z.enum(['weekly', 'fortnightly', 'monthly'], { message: 'Select a visit cycle' }),
  visitDays: z.array(z.string()).min(1, 'Select at least one visit day'),
  assignedSalesmanId: z.string().min(1, 'Assign a salesman'),
  beatProgramId: z.string().optional(),
  effectiveDate: z.string().min(1, 'Select the effective date'),

  // Outlets & route
  outlets: z.array(outletSchema).min(1, 'Add at least one outlet'),
})

export type BeatFormValues = z.infer<typeof beatSchema>

export const beatDefaults: Partial<BeatFormValues> = {
  beatCode: '',
  beatName: '',
  status: 'active',
  stateId: '',
  zoneId: '',
  districtId: '',
  talukaId: '',
  cityId: '',
  villageIds: [],
  distributorId: '',
  visitDays: [],
  assignedSalesmanId: '',
  beatProgramId: '',
  effectiveDate: '',
  outlets: [{ retailerId: '', sequence: 1, geoLat: '', geoLng: '', geoFenceM: '100' }],
}
