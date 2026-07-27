import { z } from 'zod'

// A list of picked files (optional). The raw `File`s are presigned + uploaded
// on submit; the returned storage keys are what get persisted.
const fileList = () => z.array(z.instanceof(File)).optional()

export const retailerSchema = z
  .object({
    // --- Shop & owner ---
    code: z.string().optional(),
    // No `status` field: the create/update bodies reject it — a new record is
    // active/approved on save and the list's toggle owns it from there.
    shopName: z.string().trim().min(2, "Enter the shop's name"),
    ownerName: z.string().optional(),
    ownerMobile: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
    alternateMobile: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{10}$/.test(v), 'Enter a valid 10-digit mobile number'),
    ownerBirthDate: z.string().optional(),
    ownerAnniversaryDate: z.string().optional(),

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
  // Anniversary can't fall on/before the owner's date of birth.
  .refine(
    (v) =>
      !v.ownerAnniversaryDate ||
      !v.ownerBirthDate ||
      v.ownerAnniversaryDate > v.ownerBirthDate,
    {
      message: 'Anniversary must be after the birth date',
      path: ['ownerAnniversaryDate'],
    },
  )

export type RetailerFormValues = z.infer<typeof retailerSchema>

export const retailerDefaults: Partial<RetailerFormValues> = {
  code: '',
  shopName: '',
  ownerName: '',
  ownerMobile: '',
  alternateMobile: '',
  ownerBirthDate: '',
  ownerAnniversaryDate: '',
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
