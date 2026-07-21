import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { mediaUrl } from '@/lib/media'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  designationListResponseSchema,
  inchargePresignResponseSchema,
  salesInchargeDetailSchema,
  salesInchargeHierarchyResponseSchema,
  salesInchargeListResponseSchema,
  type SalesInchargeHierarchyNodeRaw,
  type SalesInchargeRow,
} from '../schemas'
import type { SalesInchargeFormValues } from '../lib/incharge-form'
import type {
  Designation,
  DesignationListParams,
  DesignationListResult,
  SalesIncharge,
  SalesInchargeDetailView,
  SalesInchargeExistingFiles,
  SalesInchargeHierarchyNode,
  SalesInchargeListParams,
  SalesInchargeListResult,
  SalesInchargePreservedFields,
  SalesInchargeStatus,
} from '../types'

/** Map a validated API row to the client-facing (camelCase) shape. */
function toSalesIncharge(row: SalesInchargeRow): SalesIncharge {
  return {
    id: row.id,
    displayName: row.display_name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    employeeCode: row.employee_code ?? null,
    designation: row.designation_name ?? row.designation ?? null,
    territory: row.territory ?? null,
    dateOfJoining: row.date_of_joining ?? null,
    status: row.status,
    reportsTo: row.reports_to ?? null,
  }
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: SalesInchargeListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.id != null) q.id = params.id
  if (params.reportsTo != null) q.reports_to = params.reportsTo
  if (params.search) q.search = params.search
  if (params.status) q.status = params.status
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /sales-incharge-admin/sales-incharges — one page of sales incharges. */
export async function fetchSalesIncharges(
  params: SalesInchargeListParams = {},
): Promise<SalesInchargeListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.SALES_INCHARGE.LIST, {
      params: toQuery(params),
    })
    const res = salesInchargeListResponseSchema.parse(raw)
    return {
      items: res.sales_incharges.map(toSalesIncharge),
      total: res.total,
      page: res.page,
      pageSize: res.page_size,
      totalPages: res.total_pages,
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load sales incharges.'))
  }
}

/** Translate camelCase designation params into the endpoint's query string. */
function toDesignationQuery(
  params: DesignationListParams,
): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.id != null) q.id = params.id
  if (params.search) q.search = params.search
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /sales-incharge-admin/designations — the designation master list. */
export async function fetchDesignations(
  params: DesignationListParams = {},
): Promise<DesignationListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.DESIGNATION.LIST, {
      params: toDesignationQuery(params),
    })
    const res = designationListResponseSchema.parse(raw)
    const items: Designation[] = res.designations.map((d) => ({
      id: d.id,
      name: d.name,
    }))
    return {
      items,
      total: res.total ?? items.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? items.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load designations.'))
  }
}

/** DELETE /sales-incharge-admin/sales-incharges/{id} — remove a sales incharge. */
export async function deleteSalesIncharge(id: number): Promise<void> {
  try {
    await http.delete<void>(endpoints.SALES_INCHARGE.DELETE(id))
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to delete sales incharge.'))
  }
}

/* ----------------------------- Image uploads ----------------------------- *
 * Profile / Aadhaar photos share one presign endpoint: each file is tagged with
 * its `doc_type`, presigned in one call, PUT to storage, and the returned S3
 * `key` is persisted on the matching `*_photo_path` field.
 * -------------------------------------------------------------------------- */

type IncDocType = 'profile' | 'aadhar_front' | 'aadhar_back'

/** PUT the raw file to its presigned URL (bare fetch — no app interceptors). */
async function putToStorage(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) throw new Error(`Upload failed for ${file.name} (${res.status})`)
}

/** The picked files for this submission, tagged by document type (skips empties). */
function collectDocs(values: SalesInchargeFormValues): { file: File; docType: IncDocType }[] {
  const docs: { file: File; docType: IncDocType }[] = []
  if (values.profilePhoto) docs.push({ file: values.profilePhoto, docType: 'profile' })
  if (values.aadharFront) docs.push({ file: values.aadharFront, docType: 'aadhar_front' })
  if (values.aadharBack) docs.push({ file: values.aadharBack, docType: 'aadhar_back' })
  return docs
}

/** Presign + upload the picked photos, returning the fresh S3 key per doc type. */
async function uploadDocuments(
  docs: { file: File; docType: IncDocType }[],
): Promise<Partial<Record<IncDocType, string>>> {
  const keys: Partial<Record<IncDocType, string>> = {}
  if (docs.length === 0) return keys
  const raw = await http.post<unknown>(endpoints.SALES_INCHARGE.DOCUMENTS_PRESIGN, {
    files: docs.map((d) => ({
      doc_type: d.docType,
      filename: d.file.name,
      content_type: d.file.type || 'application/octet-stream',
    })),
  })
  const { items } = inchargePresignResponseSchema.parse(raw)
  // Match each slot back to its file by doc type + filename, consuming matches.
  const remaining = [...items]
  for (const d of docs) {
    const idx = remaining.findIndex(
      (i) => i.doc_type === d.docType && i.filename === d.file.name,
    )
    if (idx === -1) throw new Error(`No upload URL returned for ${d.file.name}`)
    const [slot] = remaining.splice(idx, 1)
    await putToStorage(slot.upload_url, d.file)
    keys[d.docType] = slot.key
  }
  return keys
}

/* ------------------------------ Body builder ----------------------------- */

/** Collapse a blank/whitespace-only string to null so it's cleared server-side. */
const str = (v?: string) => (v && v.trim() !== '' ? v.trim() : null)
/** Parse an id-bearing string ("3") to a number, or null when blank/invalid. */
const intId = (v?: string) => {
  if (!v || v.trim() === '') return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}
/** A money field ("40000" / "40000.00") passed through, or null when blank. */
const money = (v?: string) => (v && v.trim() !== '' ? v.trim() : null)
/** basic + allowance as the gross salary string, or null when either is blank. */
const grossSalary = (basic?: string, allowance?: string) => {
  const b = Number(basic)
  const a = Number(allowance)
  if (!Number.isFinite(b) || !Number.isFinite(a) || basic === '' || allowance === '')
    return null
  return String(b + a)
}

/**
 * Build the scalar (non-file) portion of the create/update body. Server-managed
 * fields the form doesn't edit (`preserved`) are round-tripped so they're never
 * cleared on save. (Update is a partial PATCH, so omitting them would also be
 * safe, but sending the known values keeps create and update symmetric.)
 */
function buildScalarBody(
  values: SalesInchargeFormValues,
  status: SalesInchargeStatus,
  preserved?: SalesInchargePreservedFields,
) {
  return {
    phone: values.mobile,
    display_name: values.name,
    email: str(values.email),
    status,
    employee_code: preserved?.employeeCode ?? null,
    // The selected designation id from the dropdown (falls back to preserved).
    designation_id: intId(values.designation) ?? preserved?.designationId ?? null,
    reports_to: preserved?.reportsTo ?? null,
    territory: preserved?.territory ?? null,
    date_of_joining: str(values.dateOfJoining),
    address: str(values.address),
    birth_date: str(values.dateOfBirth),
    marriage_anniversary: str(values.marriageAnniversary),
    alternate_phone: str(values.alternateMobile),
    date_of_exit: str(values.dateOfExit),
    basic_salary: money(values.basicSalary),
    allowance: money(values.allowance),
    salary: grossSalary(values.basicSalary, values.allowance),
    bank_account_name: str(values.bankAccountName),
    bank_account_number: str(values.bankAccountNumber),
    bank_ifsc: str(values.bankIfsc),
    bank_name: str(values.bankName),
    aadhar_number: str(values.aadharNumber),
  }
}

/* ------------------------------ Create record ---------------------------- */

/**
 * POST /sales-incharge-admin/sales-incharges — upload any picked photos, then
 * create the record with the returned S3 keys.
 */
export async function createSalesIncharge(values: SalesInchargeFormValues): Promise<void> {
  try {
    const keys = await uploadDocuments(collectDocs(values))
    const status: SalesInchargeStatus = values.dateOfExit ? 'inactive' : 'active'
    const body = {
      ...buildScalarBody(values, status),
      profile_photo_path: keys.profile ?? null,
      aadhar_front_photo_path: keys.aadhar_front ?? null,
      aadhar_back_photo_path: keys.aadhar_back ?? null,
    }
    await http.post<unknown>(endpoints.SALES_INCHARGE.CREATE, body)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to create the sales incharge.'))
  }
}

/**
 * GET /sales-incharge-admin/sales-incharges/{id} — load a record and map it into
 * form-ready values, the already-saved image paths, the designation name (for
 * display) and the server-managed fields to round-trip on save.
 */
export async function fetchSalesIncharge(id: string): Promise<{
  id: string
  values: SalesInchargeFormValues
  existing: SalesInchargeExistingFiles
  preserved: SalesInchargePreservedFields
  /** Designation label for the current record — lets the edit form show the
   *  selected designation even before its page is loaded in the dropdown. */
  designationName: string | null
}> {
  try {
    const raw = await http.get<unknown>(endpoints.SALES_INCHARGE.GET(id))
    const r = salesInchargeDetailSchema.parse(raw)
    // Money comes back as "50000.00" — show it as a clean number in the input.
    const cleanMoney = (v?: string | null) => {
      if (v == null || v.trim() === '') return ''
      const n = Number(v)
      return Number.isFinite(n) ? String(n) : v
    }
    const values: SalesInchargeFormValues = {
      name: r.display_name,
      employerCompany: '',
      address: r.address ?? '',
      dateOfBirth: r.birth_date ?? '',
      marriageAnniversary: r.marriage_anniversary ?? '',
      mobile: r.phone ?? '',
      alternateMobile: r.alternate_phone ?? '',
      dateOfJoining: r.date_of_joining ?? '',
      dateOfExit: r.date_of_exit ?? '',
      email: r.email ?? '',
      basicSalary: cleanMoney(r.basic_salary),
      allowance: cleanMoney(r.allowance),
      // The dropdown is keyed by designation id (as a string).
      designation: r.designation_id != null ? String(r.designation_id) : '',
      profilePhoto: undefined,
      bankAccountName: r.bank_account_name ?? '',
      bankAccountNumber: r.bank_account_number ?? '',
      bankIfsc: r.bank_ifsc ?? '',
      bankName: r.bank_name ?? '',
      aadharNumber: r.aadhar_number ?? '',
      aadharFront: undefined,
      aadharBack: undefined,
    }
    const existing: SalesInchargeExistingFiles = {
      profilePhotoPath: r.profile_photo_path ?? '',
      aadharFrontPhotoPath: r.aadhar_front_photo_path ?? '',
      aadharBackPhotoPath: r.aadhar_back_photo_path ?? '',
    }
    const preserved: SalesInchargePreservedFields = {
      status: r.status,
      employeeCode: r.employee_code ?? null,
      designationId: r.designation_id ?? null,
      reportsTo: r.reports_to ?? null,
      territory: r.territory ?? null,
      salary: r.salary ?? null,
    }
    return { id: String(r.id), values, existing, preserved, designationName: r.designation_name ?? null }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load the sales incharge.'))
  }
}

/**
 * GET /sales-incharge-admin/sales-incharges/{id} — load a record and map it to a
 * read-only, display-oriented view (camelCase, photo paths resolved to full
 * media URLs). Powers the "view details" modal on the list screen.
 */
export async function fetchSalesInchargeDetail(
  id: string,
): Promise<SalesInchargeDetailView> {
  try {
    const raw = await http.get<unknown>(endpoints.SALES_INCHARGE.GET(id))
    const r = salesInchargeDetailSchema.parse(raw)
    return {
      id: r.id,
      displayName: r.display_name,
      status: r.status,
      employeeCode: r.employee_code ?? null,
      designation: r.designation_name ?? null,
      territory: r.territory ?? null,
      reportsTo: r.reports_to ?? null,
      phone: r.phone ?? null,
      alternatePhone: r.alternate_phone ?? null,
      email: r.email ?? null,
      address: r.address ?? null,
      dateOfBirth: r.birth_date ?? null,
      marriageAnniversary: r.marriage_anniversary ?? null,
      dateOfJoining: r.date_of_joining ?? null,
      dateOfExit: r.date_of_exit ?? null,
      basicSalary: r.basic_salary ?? null,
      allowance: r.allowance ?? null,
      salary: r.salary ?? null,
      bankAccountName: r.bank_account_name ?? null,
      bankAccountNumber: r.bank_account_number ?? null,
      bankIfsc: r.bank_ifsc ?? null,
      bankName: r.bank_name ?? null,
      aadharNumber: r.aadhar_number ?? null,
      profilePhotoUrl: mediaUrl(r.profile_photo_path),
      aadharFrontUrl: mediaUrl(r.aadhar_front_photo_path),
      aadharBackUrl: mediaUrl(r.aadhar_back_photo_path),
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load the sales incharge.'))
  }
}

/**
 * PATCH /sales-incharge-admin/sales-incharges/{id} — upload any newly-picked
 * photos, then update the record. Untouched images keep their existing key and
 * server-managed fields are preserved.
 */
export async function updateSalesIncharge(
  id: string,
  values: SalesInchargeFormValues,
  existing: SalesInchargeExistingFiles,
  preserved: SalesInchargePreservedFields,
): Promise<void> {
  try {
    const keys = await uploadDocuments(collectDocs(values))
    const body = {
      ...buildScalarBody(values, preserved.status, preserved),
      profile_photo_path: keys.profile ?? (existing.profilePhotoPath || null),
      aadhar_front_photo_path: keys.aadhar_front ?? (existing.aadharFrontPhotoPath || null),
      aadhar_back_photo_path: keys.aadhar_back ?? (existing.aadharBackPhotoPath || null),
    }
    await http.patch<unknown>(endpoints.SALES_INCHARGE.UPDATE(id), body)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to update the sales incharge.'))
  }
}

/** PATCH /sales-incharge-admin/sales-incharges/{id}/status — flip active/inactive. */
export async function setSalesInchargeStatus(
  id: string,
  status: SalesInchargeStatus,
): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.SALES_INCHARGE.STATUS(id), { status })
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to update the status.'))
  }
}

/* ---------------------------- Reporting hierarchy ------------------------- */

/** Map a validated raw hierarchy node (recursively) to the client-facing shape. */
function toHierarchyNode(raw: SalesInchargeHierarchyNodeRaw): SalesInchargeHierarchyNode {
  return {
    id: raw.id,
    name: raw.display_name,
    designation: raw.designation_name ?? null,
    photoUrl: raw.profile_photo_path ? mediaUrl(raw.profile_photo_path) : undefined,
    status: raw.status ?? null,
    isRoot: raw.is_root ?? false,
    reports: raw.reports.map(toHierarchyNode),
  }
}

/**
 * GET /sales-incharge-admin/sales-incharges/hierarchy — the reporting tree.
 * The tree is single-rooted: returns the one designated root node (with its
 * nested reports), or `null` when no root has been designated yet.
 */
export async function fetchSalesInchargeHierarchy(): Promise<SalesInchargeHierarchyNode | null> {
  try {
    const raw = await http.get<unknown>(endpoints.SALES_INCHARGE.HIERARCHY)
    const res = salesInchargeHierarchyResponseSchema.parse(raw)
    return res.hierarchy ? toHierarchyNode(res.hierarchy) : null
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load the hierarchy.'))
  }
}

/**
 * PATCH /sales-incharge-admin/sales-incharges/{id}/root — designate this
 * incharge as THE single root (top of org). Any current root is atomically
 * demoted and re-parented under the new one. Idempotent if already the root.
 */
export async function setSalesInchargeRoot(id: number): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.SALES_INCHARGE.ROOT(id), {})
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to set the root.'))
  }
}

/**
 * PATCH /sales-incharge-admin/sales-incharges/{id}/reporting-manager — set who a
 * sales incharge reports to. `reportsTo = null` detaches them (makes a root).
 * The server rejects self-references and cycles.
 */
export async function setReportingManager(
  id: number,
  reportsTo: number | null,
): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.SALES_INCHARGE.REPORTING_MANAGER(id), {
      reports_to: reportsTo,
    })
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to update the reporting manager.'))
  }
}

/**
 * DELETE /sales-incharge-admin/sales-incharges/{id}/hierarchy — detach the node
 * and its entire subtree (they all become unassigned roots). Returns the number
 * of incharges detached.
 */
export async function clearSalesInchargeHierarchy(id: number): Promise<number> {
  try {
    const raw = await http.delete<{ cleared?: number }>(
      endpoints.SALES_INCHARGE.HIERARCHY_CLEAR(id),
    )
    return raw?.cleared ?? 0
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to clear the hierarchy.'))
  }
}
