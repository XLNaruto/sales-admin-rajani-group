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

export const distributorSchema = z.object({
  // --- Firm & owner details ---
  firmName: z.string().min(2, "Enter the firm's name"),
  firmType: z.enum(['proprietorship', 'partnership', 'company'], {
    message: 'Select the type of firm',
  }),
  ownerName: z.string().min(2, "Enter the owner's / partner's name"),
  ownerMobile: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
  ownerBirthDate: z.string().optional(),
  ownerAnniversaryDate: z.string().optional(),
  communicationMobile: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{10}$/.test(v), 'Enter a valid 10-digit mobile number'),
  multipleLogin: z.enum(['yes', 'no']).optional(),
  email: z.string().email('Enter a valid email address'),
  code: z.string().optional(),
  // API accepts only these three (see /sales-incharge-admin/docs → POST /distributors).
  status: z.enum(['active', 'inactive', 'suspended']),

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
  ownerName: '',
  ownerMobile: '',
  ownerBirthDate: '',
  ownerAnniversaryDate: '',
  communicationMobile: '',
  email: '',
  code: '',
  status: 'active',
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
