import { z } from 'zod'

// A list of picked files (optional). The raw `File`s are presigned + uploaded
// on submit; the returned storage keys are what get persisted.
const fileList = () => z.array(z.instanceof(File)).optional()

/**
 * One owner/partner of an outlet — the shape the API's `owners[]` takes
 * (`name`, `mobile`, `alternate_mobile`, `birth_date`, `marriage_anniversary`).
 * Only name + mobile are required; the alternate line and the two greeting dates
 * stay optional the way the single-owner form had them.
 */
export const retailerOwnerSchema = z
  .object({
    // The API caps an outlet owner's name at 200 characters.
    name: z.string().trim().min(2, "Enter the owner's / partner's name").max(200),
    mobile: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
    alternateMobile: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{10}$/.test(v), 'Enter a valid 10-digit mobile number'),
    birthDate: z.string().optional(),
    anniversaryDate: z.string().optional(),
  })
  // The alternate number is a second line for the same person, not a repeat.
  .refine((v) => !v.alternateMobile || v.alternateMobile !== v.mobile, {
    message: 'Alternate number must differ from the mobile number',
    path: ['alternateMobile'],
  })
  // Anniversary can't fall on/before the owner's date of birth.
  .refine((v) => !v.anniversaryDate || !v.birthDate || v.anniversaryDate > v.birthDate, {
    message: 'Anniversary must be after the birth date',
    path: ['anniversaryDate'],
  })

export type RetailerOwnerValues = z.infer<typeof retailerOwnerSchema>

export const retailerSchema = z
  .object({
    // --- Shop & owner ---
    code: z.string().optional(),
    // No `status` field: the create/update bodies reject it — a new record is
    // active/approved on save and the list's toggle owns it from there.
    shopName: z.string().trim().min(2, "Enter the shop's name"),
    // Every owner/partner of the outlet. The API replaces its whole `owners`
    // list on each save, so this array is always sent complete — and the first
    // entry doubles as the record's primary owner (the legacy `owner_*`
    // columns), which is why at least one is required.
    owners: z
      .array(retailerOwnerSchema)
      .min(1, 'Add at least one owner / partner')
      .max(20, 'At most 20 owners / partners can be added'),

    // --- Address / geography ---
    addressLine: z.string().optional(),
    address: z.string().optional(),
    landmark: z.string().optional(),
    market: z.string().optional(),
    stateId: z.string().min(1, 'Select a state'),
    zoneId: z.string().min(1, 'Select a zone'),
    districtId: z.string().min(1, 'Select a district'),
    talukaId: z.string().min(1, 'Select a taluka'),
    cityId: z.string().min(1, 'Select a city'),
    pincode: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{6}$/.test(v), 'Enter a valid 6-digit pincode'),

    // No `beatId` either: the server assigns the beat nearest the pinned
    // coordinates (within 25 km), and the distributor follows from that beat.

    // Captured by the map picker as "lat, lng"; split into latitude/longitude
    // on submit. `formattedAddress` is derived from it, never typed.
    geoLocation: z.string().optional(),
    formattedAddress: z.string().optional(),

    // --- Classification & photo ---
    outletTypeId: z.string().optional(),
    shopPhoto: fileList(),
  })

export type RetailerFormValues = z.infer<typeof retailerSchema>

export const retailerDefaults: Partial<RetailerFormValues> = {
  code: '',
  shopName: '',
  owners: [],
  addressLine: '',
  address: '',
  landmark: '',
  market: '',
  stateId: '',
  zoneId: '',
  districtId: '',
  talukaId: '',
  cityId: '',
  pincode: '',
  geoLocation: '',
  formattedAddress: '',
  outletTypeId: '',
  shopPhoto: [],
}
