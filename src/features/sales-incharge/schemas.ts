import { z } from 'zod'

/** Status values the list endpoint returns. */
export const salesInchargeStatusSchema = z.enum([
  'active',
  'invited',
  'suspended',
  'inactive',
])

/**
 * A single row from GET /sales-incharge-admin/sales-incharges. Optional/nullable
 * fields are tolerated so a sparsely-populated record still validates.
 */
export const salesInchargeRowSchema = z.object({
  id: z.number(),
  display_name: z.string(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  employee_code: z.string().nullish(),
  // The list may send the resolved name (`designation_name`) and/or a legacy
  // `designation` string — accept either.
  designation: z.string().nullish(),
  designation_id: z.number().nullish(),
  designation_name: z.string().nullish(),
  territory: z.string().nullish(),
  date_of_joining: z.string().nullish(),
  status: salesInchargeStatusSchema.catch('inactive'),
  reports_to: z.number().nullish(),
})

/**
 * The list endpoint envelope: a page of rows plus its pagination metadata
 * (`total`/`page`/`page_size`/`total_pages`). See
 * GET /sales-incharge-admin/sales-incharges → salesInchargeAdminListSalesIncharges.
 */
export const salesInchargeListResponseSchema = z.object({
  sales_incharges: z.array(salesInchargeRowSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
})

export type SalesInchargeRow = z.infer<typeof salesInchargeRowSchema>
export type SalesInchargeListResponse = z.infer<typeof salesInchargeListResponseSchema>

/**
 * Full record from GET /sales-incharge-admin/sales-incharges/{id}. Every
 * optional column is nullish-tolerant so a sparsely-filled record still parses.
 */
export const salesInchargeDetailSchema = z.object({
  id: z.number(),
  phone: z.string().nullish(),
  display_name: z.string(),
  email: z.string().nullish(),
  status: salesInchargeStatusSchema.catch('inactive'),
  employee_code: z.string().nullish(),
  designation_id: z.number().nullish(),
  designation_name: z.string().nullish(),
  reports_to: z.number().nullish(),
  territory: z.string().nullish(),
  date_of_joining: z.string().nullish(),
  address: z.string().nullish(),
  birth_date: z.string().nullish(),
  marriage_anniversary: z.string().nullish(),
  alternate_phone: z.string().nullish(),
  date_of_exit: z.string().nullish(),
  profile_photo_path: z.string().nullish(),
  basic_salary: z.string().nullish(),
  allowance: z.string().nullish(),
  salary: z.string().nullish(),
  bank_account_name: z.string().nullish(),
  bank_account_number: z.string().nullish(),
  bank_ifsc: z.string().nullish(),
  bank_name: z.string().nullish(),
  aadhar_number: z.string().nullish(),
  aadhar_front_photo_path: z.string().nullish(),
  aadhar_back_photo_path: z.string().nullish(),
})

export type SalesInchargeDetail = z.infer<typeof salesInchargeDetailSchema>

/**
 * The designations list envelope: rows under `designations` alongside the
 * `total`/`page`/`page_size`/`total_pages` pagination fields. See
 * GET /sales-incharge-admin/designations → salesInchargeAdminListDesignations.
 */
export const designationRowSchema = z.object({
  id: z.number(),
  name: z.string(),
})

export const designationListResponseSchema = z.object({
  designations: z.array(designationRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

export type DesignationRow = z.infer<typeof designationRowSchema>

/**
 * A node in GET /sales-incharge-admin/sales-incharges/hierarchy. The spec ships
 * this schema empty (a `$ref` to an unemitted component), so we validate
 * defensively: an incharge-shaped node plus its nested reports. The child array
 * key isn't pinned by the spec, so `childReports` accepts whichever of the
 * common names the server uses (`reports`/`children`/`direct_reports`/
 * `subordinates`) and normalises it to `reports`.
 */
export interface SalesInchargeHierarchyNodeRaw {
  id: number
  display_name: string
  designation_name?: string | null
  profile_photo_path?: string | null
  status?: SalesInchargeStatusValue
  is_root?: boolean
  reports: SalesInchargeHierarchyNodeRaw[]
}

type SalesInchargeStatusValue = z.infer<typeof salesInchargeStatusSchema>

/** Copy whichever child-array key the node uses into a canonical `reports`. */
const normaliseReports = (raw: unknown): unknown => {
  if (raw == null || typeof raw !== 'object') return raw
  const o = raw as Record<string, unknown>
  const reports = o.reports ?? o.children ?? o.direct_reports ?? o.subordinates ?? []
  return { ...o, reports }
}

export const salesInchargeHierarchyNodeSchema: z.ZodType<SalesInchargeHierarchyNodeRaw> =
  z.lazy(() =>
    z.preprocess(
      normaliseReports,
      z
        .object({
          id: z.number(),
          display_name: z.string(),
          designation_name: z.string().nullish(),
          profile_photo_path: z.string().nullish(),
          status: salesInchargeStatusSchema.optional(),
          is_root: z.boolean().optional(),
          reports: z.array(salesInchargeHierarchyNodeSchema),
        })
        .passthrough(),
    ) as z.ZodType<SalesInchargeHierarchyNodeRaw>,
  )

/**
 * Envelope for GET …/hierarchy. The tree is single-rooted: `hierarchy` is the
 * one designated root node (its reports nested under `children`), or `null`
 * when no root has been designated yet.
 */
export const salesInchargeHierarchyResponseSchema = z.object({
  hierarchy: salesInchargeHierarchyNodeSchema.nullable(),
})

/**
 * Response from POST …/documents/presign — one slot per file, echoing its
 * `doc_type`/`filename` and carrying the S3 `key` + short-lived `upload_url`.
 */
export const inchargePresignResponseSchema = z.object({
  items: z.array(
    z.object({
      doc_type: z.enum(['profile', 'aadhar_front', 'aadhar_back']),
      filename: z.string(),
      key: z.string(),
      upload_url: z.string(),
    }),
  ),
})
