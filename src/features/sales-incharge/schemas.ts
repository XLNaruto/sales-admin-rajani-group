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
  profile_photo_path: z.string().nullish(),
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
  company_id: z.number().nullish(),
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

/* ------------------------------ Org hierarchy ----------------------------- */

/** Ids arrive as numbers, but tolerate stringified ids too. */
const idField = z.union([z.number(), z.string()]).nullish()

/**
 * A flat row from GET /sales-incharge-admin/hierarchy. The tree relationships
 * live in `parent_id`; a row's level is inferred from the deepest geo id set
 * (city → City, … state → State, none → National). The `*_name` fields let the
 * tree render geography labels without a side lookup.
 */
export const hierarchyItemSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    parent_id: idField,
    designation_id: idField,
    designation_name: z.string().nullish(),
    sales_incharge_id: idField,
    sales_incharge_admin_id: idField,
    state_id: idField,
    zone_id: idField,
    district_id: idField,
    city_id: idField,
    state_name: z.string().nullish(),
    zone_name: z.string().nullish(),
    district_name: z.string().nullish(),
    city_name: z.string().nullish(),
    user_type: z.string().nullish(),
    user_name: z.string().nullish(),
    created_at: z.string().nullish(),
  })
  .passthrough()

export type HierarchyItem = z.infer<typeof hierarchyItemSchema>

/** Envelope for GET …/hierarchy — the flat rows to assemble into the tree. */
export const hierarchyListResponseSchema = z.object({
  items: z.array(hierarchyItemSchema).default([]),
})

/**
 * A sales-incharge-admin account row — the assignee pool for non-City levels.
 * From GET /sales-incharge-admin/hierarchy/available-sales-incharge-admins →
 * salesInchargeAdminListAvailableSalesInchargeAdmins. Only the fields the
 * assignee combobox needs are pinned; the rest is tolerated via passthrough.
 */
export const salesInchargeAdminRowSchema = z
  .object({
    id: z.number(),
    display_name: z.string(),
    phone: z.string().nullish(),
    email: z.string().nullish(),
    employee_code: z.string().nullish(),
    designation_name: z.string().nullish(),
    status: salesInchargeStatusSchema.catch('inactive'),
  })
  .passthrough()

/** Envelope: a page of rows plus the standard `total`/`page`/… pagination. */
export const salesInchargeAdminListResponseSchema = z.object({
  sales_incharge_admins: z.array(salesInchargeAdminRowSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
})

export type SalesInchargeAdminRow = z.infer<typeof salesInchargeAdminRowSchema>

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
