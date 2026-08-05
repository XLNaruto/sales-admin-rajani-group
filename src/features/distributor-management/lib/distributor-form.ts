import { z } from 'zod'

// Optional numeric text field — allows empty, otherwise must be a finite number.
const optNum = (msg = 'Enter a valid number') =>
  z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && v.trim() !== ''), msg)

// A list of picked files (optional). The raw `File`s are presigned + uploaded
// on submit; the returned storage keys are what get persisted.
const fileList = () => z.array(z.instanceof(File)).optional()

/**
 * One owner/partner entry. Mirrors the API's `owners[]` item — the backend only
 * insists on name + mobile, but the onboarding form collects the e-mail and
 * birth date too (they drive greetings/notifications), so both are required
 * here. The marriage anniversary stays optional.
 */
export const distributorOwnerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the owner's / partner's name").max(255),
    mobile: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
    email: z.string().trim().email('Enter a valid email address'),
    birthDate: z.string().min(1, 'Select the birth date'),
    anniversaryDate: z.string().optional(),
  })
  // Anniversary can't fall on/before the owner's date of birth.
  .refine((v) => !v.anniversaryDate || !v.birthDate || v.anniversaryDate > v.birthDate, {
    message: 'Anniversary must be after the birth date',
    path: ['anniversaryDate'],
  })

export type DistributorOwnerValues = z.infer<typeof distributorOwnerSchema>

export const distributorSchema = z.object({
  // --- Firm & owner details ---
  firmName: z.string().min(2, "Enter the firm's name"),
  firmType: z.enum(['proprietorship', 'partnership', 'company'], {
    message: 'Select the type of firm',
  }),
  // Every owner/partner of the firm. The API replaces its whole `owners` list on
  // each save, so this array is always sent complete — and must hold at least one.
  owners: z
    .array(distributorOwnerSchema)
    .min(1, 'Add at least one owner / partner')
    .max(20, 'At most 20 owners / partners can be added'),
  communicationMobile: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{10}$/.test(v), 'Enter a valid 10-digit mobile number'),
  multipleLogin: z.enum(['yes', 'no']).optional(),
  email: z.string().email('Enter a valid email address'),
  code: z.string().optional(),
  // API accepts only these three (see /sales-incharge-admin/docs → POST /distributors).
  status: z.enum(['active', 'inactive', 'suspended']),
  // Product-division ids this distributor handles (option values are stringified ids).
  productDivisions: z.array(z.string()).optional(),

  // --- Location & coverage ---
  officeAddress: z.string().trim().min(1, 'Enter the office address'),
  godownAddress: z.string().optional(),
  homeAddress: z.string().optional(),
  stateId: z.string().min(1, 'Select a state'),
  zoneId: z.string().min(1, 'Select a zone'),
  districtId: z.string().min(1, 'Select a district'),
  talukaId: z.string().min(1, 'Select a taluka'),
  cityId: z.string().min(1, 'Select a city'),
  pincode: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{6}$/.test(v), 'Enter a valid 6-digit pincode'),
  deliveryRoute: z.string().optional(),
  agencyTalukaIds: z.array(z.string()).optional(),
  marketType: z.enum(['local', 'rural', 'local_rural', 'counter_sales']).optional(),
  villageIds: z.array(z.string()).optional(),
  retailersLocal: optNum('Enter a valid count'),
  retailersRural: optNum('Enter a valid count'),
  marketSystem: z.enum(['ready_stock', 'booking']).optional(),
  weeklyOff: z.string().optional(),
  // Captured by the map picker as "lat, lng"; split into the API's
  // geo_latitude / geo_longitude string columns on submit.
  geoLocation: z.string().optional(),
  officeImages: fileList(),
  godownImages: fileList(),

  // --- Business details ---
  otherAgencies: z.string().optional(),
  similarAgencies: z.string().optional(),
  assignedProducts: z.string().optional(),
  productTargets: z.string().optional(),
  deliveryVehicle: z.enum(['yes', 'no']).optional(),
  deliveryVehicleDetail: z.string().optional(),
  godownSize: optNum('Enter a valid size'),
  yearOfEst: optNum('Enter a valid year'),

  // --- Legal & financial ---
  panNumber: z.string().optional(),
  panPhoto: fileList(),
  gstNumber: z.string().optional(),
  gstPhoto: fileList(),
  advanceChequeNumbers: z.string().optional(),
  advanceChequePhoto: fileList(),
  paymentCondition: z.enum(['same_day_cheque', 'due_date_neft_rtgs', 'advance']).optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankName: z.string().optional(),
})

export type DistributorFormValues = z.infer<typeof distributorSchema>

export const distributorDefaults: Partial<DistributorFormValues> = {
  firmName: '',
  owners: [],
  communicationMobile: '',
  email: '',
  code: '',
  status: 'active',
  productDivisions: [],
  officeAddress: '',
  godownAddress: '',
  homeAddress: '',
  stateId: '',
  zoneId: '',
  districtId: '',
  talukaId: '',
  cityId: '',
  pincode: '',
  deliveryRoute: '',
  agencyTalukaIds: [],
  villageIds: [],
  retailersLocal: '',
  retailersRural: '',
  weeklyOff: '',
  geoLocation: '',
  officeImages: [],
  godownImages: [],
  otherAgencies: '',
  similarAgencies: '',
  assignedProducts: '',
  productTargets: '',
  deliveryVehicleDetail: '',
  godownSize: '',
  yearOfEst: '',
  panNumber: '',
  panPhoto: [],
  gstNumber: '',
  gstPhoto: [],
  advanceChequeNumbers: '',
  advanceChequePhoto: [],
  bankAccountName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  bankName: '',
}
