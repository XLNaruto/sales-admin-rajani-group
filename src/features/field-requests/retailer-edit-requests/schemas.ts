import { z } from 'zod'

export const retailerEditRequestStatusSchema = z.enum(['pending', 'approved', 'rejected'])

/** Longest review reason the textarea allows. */
export const REVIEW_REASON_MAX = 500

/** Coordinates are stored as strings, but a numeric value still validates. */
const coordSchema = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v == null || v === '' ? null : String(v)))

const ownerSchema = z
  .object({
    name: z.string().nullish(),
    mobile: z.string(),
    alternate_mobile: z.string().nullish(),
    birth_date: z.string().nullish(),
    marriage_anniversary: z.string().nullish(),
  })
  .transform((o) => ({
    name: o.name ?? null,
    mobile: o.mobile,
    alternateMobile: o.alternate_mobile ?? null,
    birthDate: o.birth_date ?? null,
    marriageAnniversary: o.marriage_anniversary ?? null,
  }))

/** The outlet fields shared by `payload` and `current_retailer` (snake_case). */
const editFieldsShape = {
  shop_name: z.string().nullish(),
  owners: z.array(ownerSchema).nullish(),
  address_line: z.string().nullish(),
  address: z.string().nullish(),
  formatted_address: z.string().nullish(),
  landmark: z.string().nullish(),
  market: z.string().nullish(),
  state_id: z.number().nullish(),
  zone_id: z.number().nullish(),
  district_id: z.number().nullish(),
  taluka_id: z.number().nullish(),
  city_id: z.number().nullish(),
  pincode: z.string().nullish(),
  latitude: coordSchema,
  longitude: coordSchema,
  outlet_type_id: z.number().nullish(),
  // `.nullable().optional()`, not `.nullish()` + `??` — on a payload, a missing
  // key ("keep the beat") and `null` ("unassign it") mean different things.
  beat_id: z.number().nullable().optional(),
  shop_photo_path: z.string().nullish(),
}

type EditFieldsRaw = z.infer<z.ZodObject<typeof editFieldsShape>>

function mapFields(f: EditFieldsRaw) {
  return {
    shopName: f.shop_name ?? null,
    owners: f.owners ?? [],
    addressLine: f.address_line ?? null,
    address: f.address ?? null,
    formattedAddress: f.formatted_address ?? null,
    landmark: f.landmark ?? null,
    market: f.market ?? null,
    stateId: f.state_id ?? null,
    zoneId: f.zone_id ?? null,
    districtId: f.district_id ?? null,
    talukaId: f.taluka_id ?? null,
    cityId: f.city_id ?? null,
    pincode: f.pincode ?? null,
    latitude: f.latitude,
    longitude: f.longitude,
    outletTypeId: f.outlet_type_id ?? null,
    beatId: f.beat_id,
    shopPhotoPath: f.shop_photo_path ?? null,
  }
}

const payloadSchema = z.object(editFieldsShape).transform(mapFields)

/**
 * One retailer-edit-request row as the API sends it — the same shape on the
 * list, the GET-by-id read and the review response. Mapped to camelCase here.
 */
const rowObject = z.object({
  id: z.number(),
  retailer_id: z.number(),
  shop_name: z.string().nullish(),
  retailer_code: z.string().nullish(),
  sales_incharge_id: z.number().nullish(),
  sales_incharge_name: z.string().nullish(),
  sales_incharge_phone: z.string().nullish(),
  employee_code: z.string().nullish(),
  payload: payloadSchema,
  status: retailerEditRequestStatusSchema,
  reviewed_at: z.string().nullish(),
  review_reason: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string().nullish(),
})

export const retailerEditRequestRowSchema = rowObject.transform((r) => ({
  id: r.id,
  retailerId: r.retailer_id,
  shopName: r.shop_name ?? null,
  retailerCode: r.retailer_code ?? null,
  salesInchargeId: r.sales_incharge_id ?? null,
  salesInchargeName: r.sales_incharge_name ?? null,
  salesInchargePhone: r.sales_incharge_phone ?? null,
  employeeCode: r.employee_code ?? null,
  payload: r.payload,
  status: r.status,
  reviewedAt: r.reviewed_at ?? null,
  reviewReason: r.review_reason ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? null,
}))

/** The outlet as it is now. Its `*_name` fields are null here — names come from ids. */
const currentRetailerSchema = z
  .object({
    ...editFieldsShape,
    id: z.number(),
    retailer_code: z.string().nullish(),
    onboarding_status: z.string().nullish(),
    status: z.string().nullish(),
  })
  .transform((r) => ({
    ...mapFields(r),
    // The live record always has a beat column; collapse "absent" to null.
    beatId: r.beat_id ?? null,
    id: r.id,
    retailerCode: r.retailer_code ?? null,
    onboardingStatus: r.onboarding_status ?? null,
    status: r.status ?? null,
  }))

/** GET /retailer-edit-requests/{id} — the request plus `current_retailer`. */
export const retailerEditRequestDetailSchema = z
  .object({
    retailer_edit_request: retailerEditRequestRowSchema,
    current_retailer: currentRetailerSchema.nullish(),
  })
  .transform((r) => ({
    ...r.retailer_edit_request,
    currentRetailer: r.current_retailer ?? null,
  }))

/** The list envelope (rows + pagination metadata). */
export const retailerEditRequestListResponseSchema = z.object({
  retailer_edit_requests: z.array(retailerEditRequestRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/** PATCH /retailer-edit-requests/{id}/status — the request as it now stands. */
export const retailerEditReviewResponseSchema = z
  .object({ retailer_edit_request: retailerEditRequestRowSchema })
  .transform((r) => r.retailer_edit_request)
