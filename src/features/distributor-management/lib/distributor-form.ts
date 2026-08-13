import { z } from 'zod'

// Optional numeric text field — allows empty, otherwise must be a finite number.
const optNum = (msg = 'Enter a valid number') =>
  z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && v.trim() !== ''), msg)

/**
 * An optional dropdown field.
 *
 * "Not chosen" arrives in two shapes — `undefined` (never touched) and `''`
 * (the Combobox's empty value, and what the API sends back for a blank column)
 * — and both must pass, or an untouched optional select shows an error the
 * user can't clear. Anything else must be one of `values`, and when it isn't
 * the message is a plain sentence rather than Zod's raw "Invalid option:
 * expected one of …" dump. The `''` is collapsed to `undefined` on submit (see
 * `optValue` in use-distributor-form).
 */
const optEnum = <const T extends readonly [string, ...string[]]>(
  values: T,
  message: string,
) =>
  // The cast keeps the member literals ("local" | "rural" | …) in the inferred
  // form type — through the generic, `z.enum` alone widens them to `string`.
  z.union([z.enum(values), z.literal('')], { message }).optional() as z.ZodType<
    T[number] | '' | undefined,
    T[number] | '' | undefined
  >

// A list of picked files (optional). The raw `File`s are presigned + uploaded
// on submit; the returned storage keys are what get persisted.
const fileList = () => z.array(z.instanceof(File)).optional()

/** Identifies this form's local drafts (see `lib/form-drafts.ts`). */
export const DISTRIBUTOR_DRAFT_KEY = 'distributor:create'

/** Fields holding `File`s — persisted outside the encrypted draft payload. */
export const DISTRIBUTOR_FILE_FIELDS = [
  'officeImages',
  'godownImages',
  'panPhoto',
  'gstPhoto',
  'advanceChequePhoto',
]

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
  multipleLogin: optEnum(['yes', 'no'], 'Choose Yes or No'),
  email: z.string().email('Enter a valid email address'),
  code: z.string().optional(),
  // API accepts only these three (see /sales-incharge-admin/docs → POST /distributors).
  status: z.enum(['active', 'inactive', 'suspended'], {
    message: 'Select the distributor status',
  }),
  // Companies (tenants) this distributor is attached to — several are allowed.
  // Option values are stringified ids from GET /me/companies; sent as `company_id`.
  companyIds: z.array(z.string()).min(1, 'Select at least one company'),

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
  // Id of a row in the route master (GET /routes), stringified like every other
  // select value; sent as `delivery_route_id`.
  deliveryRouteId: z.string().optional(),
  // Weekday the distributor is served on that route (the API's enum).
  deliveryRouteDay: optEnum(
    [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ],
    'Choose a delivery day from the list',
  ),
  agencyTalukaIds: z.array(z.string()).optional(),
  marketType: optEnum(
    ['local', 'rural', 'local_rural', 'counter_sales'],
    'Choose a market type from the list',
  ),
  villageIds: z.array(z.string()).optional(),
  retailersLocal: optNum('Enter a valid count'),
  retailersRural: optNum('Enter a valid count'),
  marketSystem: optEnum(
    ['ready_stock', 'booking'],
    'Choose a market system from the list',
  ),
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
  deliveryVehicle: optEnum(['yes', 'no'], 'Choose Yes or No'),
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
  // Id of a row in the payment-condition master (Masters → Payment Conditions),
  // stringified like every other select value; sent as `payment_condition_id`.
  paymentConditionId: z.string().optional(),
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
  companyIds: [],
  officeAddress: '',
  godownAddress: '',
  homeAddress: '',
  stateId: '',
  zoneId: '',
  districtId: '',
  talukaId: '',
  cityId: '',
  pincode: '',
  deliveryRouteId: '',
  deliveryRouteDay: '',
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
