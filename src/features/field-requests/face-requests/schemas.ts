import { z } from 'zod'

export const faceRequestStatusSchema = z.enum(['pending', 'approved', 'rejected'])
export const faceRequestTypeSchema = z.enum(['add', 'edit'])

/** Shortest / longest rejection reason the API accepts (after trimming). */
export const REJECT_REASON_MIN = 3
export const REJECT_REASON_MAX = 500

/**
 * An image bucket: `null` (not re-sent — unchanged), `[]` (clear it), or keys.
 * Kept nullable on purpose; collapsing `null` into `[]` would tell the admin
 * an edit wipes images it actually leaves alone.
 */
const imageBucketSchema = z.array(z.string()).nullish().transform((v) => v ?? null)

/**
 * One face-request row as the API sends it — the same shape on the list, the
 * GET-by-id read and the review response. Mapped to camelCase here, so nothing
 * downstream deals in snake_case.
 */
const faceRequestRowObject = z.object({
  id: z.number(),
  sales_incharge_id: z.number(),
  type: faceRequestTypeSchema,
  status: faceRequestStatusSchema,
  reject_reason: z.string().nullish(),
  reviewed_at: z.string().nullish(),
  reviewed_by: z.number().nullish(),
  created_at: z.string(),
  sales_incharge_name: z.string().nullish(),
  sales_incharge_phone: z.string().nullish(),
  employee_code: z.string().nullish(),
  images: imageBucketSchema,
  secondary_images: imageBucketSchema,
  device: z.string().nullish(),
  os: z.string().nullish(),
  model: z.string().nullish(),
  app_version: z.string().nullish(),
})

type FaceRequestRowRaw = z.infer<typeof faceRequestRowObject>

function mapRow(r: FaceRequestRowRaw) {
  return {
    id: r.id,
    salesInchargeId: r.sales_incharge_id,
    type: r.type,
    status: r.status,
    rejectReason: r.reject_reason ?? null,
    reviewedAt: r.reviewed_at ?? null,
    reviewedBy: r.reviewed_by ?? null,
    createdAt: r.created_at,
    salesInchargeName: r.sales_incharge_name ?? null,
    salesInchargePhone: r.sales_incharge_phone ?? null,
    employeeCode: r.employee_code ?? null,
    images: r.images,
    secondaryImages: r.secondary_images,
    device: r.device ?? null,
    os: r.os ?? null,
    model: r.model ?? null,
    appVersion: r.app_version ?? null,
  }
}

export const faceRequestRowSchema = faceRequestRowObject.transform(mapRow)

const faceImageSchema = z.object({ id: z.number().nullish(), key: z.string() })

/** The rep's live face, in the full face shape. */
const currentFaceSchema = z
  .object({
    id: z.number(),
    sales_incharge_id: z.number(),
    device: z.string().nullish(),
    os: z.string().nullish(),
    model: z.string().nullish(),
    app_version: z.string().nullish(),
    updated_device: z.string().nullish(),
    updated_os: z.string().nullish(),
    updated_model: z.string().nullish(),
    updated_app_version: z.string().nullish(),
    pose_images: z.array(faceImageSchema).nullish(),
    secondary_images: z.array(faceImageSchema).nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
  })
  .transform((f) => ({
    id: f.id,
    salesInchargeId: f.sales_incharge_id,
    device: f.device ?? null,
    os: f.os ?? null,
    model: f.model ?? null,
    appVersion: f.app_version ?? null,
    updatedDevice: f.updated_device ?? null,
    updatedOs: f.updated_os ?? null,
    updatedModel: f.updated_model ?? null,
    updatedAppVersion: f.updated_app_version ?? null,
    poseImages: (f.pose_images ?? []).map((i) => ({ id: i.id ?? null, key: i.key })),
    secondaryImages: (f.secondary_images ?? []).map((i) => ({
      id: i.id ?? null,
      key: i.key,
    })),
    createdAt: f.created_at ?? null,
    updatedAt: f.updated_at ?? null,
  }))

/** GET /face-requests/{id} — a list row plus `current_face`. */
export const faceRequestDetailSchema = faceRequestRowObject
  .extend({ current_face: currentFaceSchema.nullish() })
  .transform((r) => ({ ...mapRow(r), currentFace: r.current_face ?? null }))

/** The face-request list envelope (rows + pagination metadata). */
export const faceRequestListResponseSchema = z.object({
  face_requests: z.array(faceRequestRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/** PATCH /face-requests/{id}/status — the request as it now stands. */
export const faceRequestReviewResponseSchema = z
  .object({ face_request: faceRequestRowSchema })
  .transform((r) => r.face_request)
