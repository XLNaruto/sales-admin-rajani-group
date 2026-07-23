import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { mediaUrl } from '@/lib/media'
import { asApiError } from '@/lib/api-error'
import {
  distributorDetailSchema,
  distributorListResponseSchema,
  presignResponseSchema,
  type DistributorRow,
} from '../schemas'
import type { DistributorFormValues } from '../lib/distributor-form'
import type {
  Distributor,
  DistributorCreateInput,
  DistributorDetailView,
  DistributorExistingFiles,
  DistributorLifecycleStatus,
  DistributorListParams,
  DistributorListResult,
  DistributorMarketType,
  DistributorOnboardingAction,
  DistributorStatus,
  DistributorUpdateInput,
  FirmType,
  MarketSystem,
  PaymentCondition,
} from '../types'

/** Map a validated API row to the client-facing (camelCase) `Distributor`. */
function toDistributor(row: DistributorRow): Distributor {
  return {
    id: row.id,
    firmName: row.firm_name,
    firmType: (row.firm_type ?? '') as FirmType,
    ownerName: row.owner_name ?? '',
    ownerMobile: row.owner_mobile ?? '',
    email: row.email ?? '',
    code: row.distributor_code ?? '',
    status: row.status as DistributorStatus,
    onboardingStatus: row.onboarding_status,
    productDivisionNames: row.product_division_names ?? undefined,
    // Fields not returned by the list endpoint — filled on the detail screen.
    officeAddress: '',
    stateId: '',
    zoneId: '',
    districtId: '',
    talukaId: '',
    cityId: row.city_id != null ? String(row.city_id) : '',
    cityName: row.city_name ?? undefined,
    marketType: (row.market_type ?? undefined) as DistributorMarketType | undefined,
    marketSystem: (row.market_system ?? undefined) as MarketSystem | undefined,
  }
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: DistributorListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.status) q.status = params.status
  if (params.firmType) q.firm_type = params.firmType
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /sales-incharge-admin/distributors — one page of the server-filtered list. */
export async function fetchDistributors(
  params: DistributorListParams = {},
): Promise<DistributorListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.DISTRIBUTOR.LIST, {
      params: toQuery(params),
    })
    const res = distributorListResponseSchema.parse(raw)
    const items = res.distributors.map(toDistributor)
    return {
      items,
      total: res.total ?? items.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? items.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load distributors.')
  }
}

/* ----------------------------- Image uploads ----------------------------- *
 * Each image category has a presign endpoint that returns, per file, a storage
 * `key` and a short-lived `upload_url`. The flow is: presign the batch → PUT the
 * raw bytes to each `upload_url` → keep the `key`s to persist on the record.
 * -------------------------------------------------------------------------- */

/** PUT the raw file to its presigned URL. Uses bare `fetch` so the app's axios
 *  interceptors (Authorization header, baseURL) don't touch the storage URL. */
async function putToStorage(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) throw new Error(`Upload failed for ${file.name} (${res.status})`)
}

/**
 * Presign + upload a batch of files for one category, returning the storage
 * `key`s in the same order as the input files. Empty input short-circuits.
 */
export async function uploadImages(presignEndpoint: string, files: File[]): Promise<string[]> {
  if (files.length === 0) return []
  try {
    const raw = await http.post<unknown>(presignEndpoint, {
      files: files.map((f) => ({
        filename: f.name,
        content_type: f.type || 'application/octet-stream',
      })),
    })
    const { items } = presignResponseSchema.parse(raw)
    // Match each presigned slot back to its file by filename, preserving order.
    const keys: string[] = []
    for (const file of files) {
      const slot = items.find((i) => i.filename === file.name)
      if (!slot) throw new Error(`No upload URL returned for ${file.name}`)
      await putToStorage(slot.upload_url, file)
      keys.push(slot.key)
    }
    return keys
  } catch (error) {
    throw asApiError(error, 'Failed to upload images.')
  }
}

/** The three distributor document categories, tagged on each presign entry. */
export type DocType = 'pan_card' | 'gst' | 'advance_cheque'

interface DocFile {
  file: File
  docType: DocType
}

/**
 * Presign + upload PAN / GST / advance-cheque photos in a SINGLE call to the
 * shared documents endpoint — every file is sent in one `files` array tagged
 * with its `doc_type`. The returned keys are split back out per doc type so
 * each lands in its matching `*_photo_path` field.
 */
async function uploadDocuments(docs: DocFile[]): Promise<Record<DocType, string[]>> {
  const keys: Record<DocType, string[]> = { pan_card: [], gst: [], advance_cheque: [] }
  if (docs.length === 0) return keys
  try {
    const raw = await http.post<unknown>(endpoints.DISTRIBUTOR.DOCUMENTS_PRESIGN, {
      files: docs.map((d) => ({
        filename: d.file.name,
        content_type: d.file.type || 'application/octet-stream',
        doc_type: d.docType,
      })),
    })
    const { items } = presignResponseSchema.parse(raw)
    // Match each presigned slot back to its file. Prefer the echoed `doc_type`,
    // fall back to filename, and consume matched slots so duplicate filenames
    // across doc types can't collide.
    const remaining = [...items]
    for (const d of docs) {
      const idx = remaining.findIndex(
        (i) => i.filename === d.file.name && (!i.doc_type || i.doc_type === d.docType),
      )
      if (idx === -1) throw new Error(`No upload URL returned for ${d.file.name}`)
      const [slot] = remaining.splice(idx, 1)
      await putToStorage(slot.upload_url, d.file)
      keys[d.docType].push(slot.key)
    }
    return keys
  } catch (error) {
    throw asApiError(error, 'Failed to upload documents.')
  }
}

/* ------------------------------ Create record ---------------------------- */

/**
 * Normalise a reference id for the request body. Real reference APIs return
 * numeric ids (sent as numbers); the current mock data uses string ids
 * ("st-gj") which are passed through as-is so a selected value is never
 * silently dropped. Only genuinely-empty selections collapse to undefined.
 */
function toId(value?: string): number | string | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : value
}

/** Collapse a blank/whitespace-only string to undefined so it's dropped from the body. */
const str = (v?: string) => (v && v.trim() !== '' ? v.trim() : undefined)

/** Normalise a "lat, lng" string to clean comma-separated "lat,lng" (no spaces). */
const geo = (v?: string) => {
  const s = str(v)
  return s ? s.replace(/\s+/g, '') : undefined
}

/** Upload every image category for a submission and return the fresh keys. */
async function uploadAllImages(input: DistributorCreateInput): Promise<{
  officeKeys: string[]
  godownKeys: string[]
  docKeys: Record<DocType, string[]>
}> {
  const D = endpoints.DISTRIBUTOR
  // PAN / GST / cheque photos are uploaded together in one tagged call.
  const docs: DocFile[] = [
    ...(input.panPhoto ?? []).map((file) => ({ file, docType: 'pan_card' as const })),
    ...(input.gstPhoto ?? []).map((file) => ({ file, docType: 'gst' as const })),
    ...(input.advanceChequePhoto ?? []).map((file) => ({
      file,
      docType: 'advance_cheque' as const,
    })),
  ]
  const [officeKeys, godownKeys, docKeys] = await Promise.all([
    uploadImages(D.OFFICE_IMAGES_PRESIGN, input.officeImages ?? []),
    uploadImages(D.GODOWN_IMAGES_PRESIGN, input.godownImages ?? []),
    uploadDocuments(docs),
  ])
  return { officeKeys, godownKeys, docKeys }
}

/** Join a retained single-string photo path with any newly-uploaded keys. */
const mergePath = (existing: string | undefined, fresh: string[]): string | undefined =>
  [existing, ...fresh].filter(Boolean).join(',') || undefined

/**
 * Build the non-file portion of the create/update body — shared by both.
 * The five image/path fields are filled in by the caller once uploads resolve.
 */
function buildScalarBody(input: DistributorCreateInput) {
  return {
    distributor_code: str(input.code),
    status: input.status,
    product_divisions: (input.productDivisions ?? [])
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0),
    firm_name: input.firmName,
    firm_type: input.firmType,
    owner_name: input.ownerName,
    owner_mobile: input.ownerMobile,
    owner_birth_date: str(input.ownerBirthDate),
    owner_marriage_anniversary: str(input.ownerAnniversaryDate),
    communication_mobile: str(input.communicationMobile),
    multiple_login_allowed: input.multipleLogin === 'yes',
    email: input.email,
    office_address: input.officeAddress,
    godown_address: str(input.godownAddress),
    home_address: str(input.homeAddress),
    state_id: toId(input.stateId),
    zone_id: toId(input.zoneId),
    district_id: toId(input.districtId),
    taluka_id: toId(input.talukaId),
    city_id: toId(input.cityId),
    pincode: str(input.pincode),
    delivery_route: str(input.deliveryRoute),
    taluka_of_agency_ids: (input.agencyTalukaIds ?? [])
      .map(toId)
      .filter((n): n is number | string => n != null),
    market_type: input.marketType,
    village_ids: (input.villageIds ?? [])
      .map(toId)
      .filter((n): n is number | string => n != null),
    retailers_local_market: input.retailersLocal,
    retailers_rural_market: input.retailersRural,
    market_system: input.marketSystem,
    weekly_off: str(input.weeklyOff),
    geo_location: geo(input.geoLocation),
    other_agencies_details: str(input.otherAgencies),
    similar_category_agencies: str(input.similarAgencies),
    assigned_products: str(input.assignedProducts),
    target_per_product: str(input.productTargets),
    delivery_vehicle: input.deliveryVehicle === 'yes',
    delivery_vehicle_detail: str(input.deliveryVehicleDetail),
    godown_size_sqft: input.godownSize,
    year_established: input.yearOfEst ? Number(input.yearOfEst) : undefined,
    pan: str(input.panNumber),
    gstin: str(input.gstNumber),
    advance_cheque_numbers: str(input.advanceChequeNumbers),
    payment_condition: input.paymentCondition,
    bank_account_name: str(input.bankAccountName),
    bank_account_number: str(input.bankAccountNumber),
    bank_ifsc: str(input.bankIfsc),
    bank_name: str(input.bankName),
  }
}

/**
 * POST /sales-incharge-admin/distributors — presign + upload every image
 * category, then create the record with the returned storage keys.
 *
 * `office_image_paths` / `godown_image_paths` are sent as arrays of keys; the
 * single-string photo fields (PAN, GST, advance cheque) carry a comma-joined
 * list of keys since the cheque field can hold multiple files.
 */
export async function createDistributor(input: DistributorCreateInput): Promise<void> {
  try {
    const { officeKeys, godownKeys, docKeys } = await uploadAllImages(input)
    const body = {
      ...buildScalarBody(input),
      office_image_paths: officeKeys,
      godown_image_paths: godownKeys,
      pan_card_photo_path: docKeys.pan_card.join(',') || undefined,
      gst_photo_path: docKeys.gst.join(',') || undefined,
      advance_cheque_photo_path: docKeys.advance_cheque.join(',') || undefined,
    }
    await http.post<unknown>(endpoints.DISTRIBUTOR.CREATE, body)
  } catch (error) {
    throw asApiError(error, 'Failed to create the distributor.')
  }
}

/**
 * GET /sales-incharge-admin/distributors/{id} — load a full record and map it
 * into form-ready values (all scalar/select fields as strings, file inputs
 * left empty) plus the storage paths already saved, so the edit form can seed
 * itself and retain existing images the user doesn't re-pick.
 */
export async function fetchDistributor(id: string): Promise<{
  id: string
  values: DistributorFormValues
  existing: DistributorExistingFiles
}> {
  try {
    const raw = await http.get<unknown>(endpoints.DISTRIBUTOR.GET(id))
    const r = distributorDetailSchema.parse(raw)
    const idStr = (v: number | null | undefined) => (v != null ? String(v) : '')
    const values: DistributorFormValues = {
      firmName: r.firm_name,
      firmType: (r.firm_type ?? '') as FirmType,
      ownerName: r.owner_name ?? '',
      ownerMobile: r.owner_mobile ?? '',
      ownerBirthDate: r.owner_birth_date ?? '',
      ownerAnniversaryDate: r.owner_marriage_anniversary ?? '',
      communicationMobile: r.communication_mobile ?? '',
      multipleLogin: r.multiple_login_allowed == null ? undefined : r.multiple_login_allowed ? 'yes' : 'no',
      email: r.email ?? '',
      code: r.distributor_code ?? '',
      status: r.status as DistributorFormValues['status'],
      productDivisions: (r.product_divisions ?? []).map(String),
      officeAddress: r.office_address ?? '',
      godownAddress: r.godown_address ?? '',
      homeAddress: r.home_address ?? '',
      stateId: idStr(r.state_id),
      zoneId: idStr(r.zone_id),
      districtId: idStr(r.district_id),
      talukaId: idStr(r.taluka_id),
      cityId: idStr(r.city_id),
      pincode: r.pincode ?? '',
      deliveryRoute: r.delivery_route ?? '',
      agencyTalukaIds: (r.taluka_of_agency_ids ?? []).map(String),
      marketType: (r.market_type ?? undefined) as DistributorMarketType | undefined,
      villageIds: (r.village_ids ?? []).map(String),
      retailersLocal: r.retailers_local_market != null ? String(r.retailers_local_market) : '',
      retailersRural: r.retailers_rural_market != null ? String(r.retailers_rural_market) : '',
      marketSystem: (r.market_system ?? undefined) as MarketSystem | undefined,
      weeklyOff: r.weekly_off ?? '',
      geoLocation: r.geo_location ?? '',
      officeImages: [],
      godownImages: [],
      otherAgencies: r.other_agencies_details ?? '',
      similarAgencies: r.similar_category_agencies ?? '',
      assignedProducts: r.assigned_products ?? '',
      productTargets: r.target_per_product ?? '',
      deliveryVehicle: r.delivery_vehicle == null ? undefined : r.delivery_vehicle ? 'yes' : 'no',
      deliveryVehicleDetail: r.delivery_vehicle_detail ?? '',
      godownSize: r.godown_size_sqft != null ? String(r.godown_size_sqft) : '',
      yearOfEst: r.year_established != null ? String(r.year_established) : '',
      panNumber: r.pan ?? '',
      panPhoto: [],
      gstNumber: r.gstin ?? '',
      gstPhoto: [],
      advanceChequeNumbers: r.advance_cheque_numbers ?? '',
      advanceChequePhoto: [],
      paymentCondition: (r.payment_condition ?? undefined) as PaymentCondition | undefined,
      bankAccountName: r.bank_account_name ?? '',
      bankAccountNumber: r.bank_account_number ?? '',
      bankIfsc: r.bank_ifsc ?? '',
      bankName: r.bank_name ?? '',
    }
    const existing: DistributorExistingFiles = {
      officeImagePaths: r.office_image_paths ?? [],
      godownImagePaths: r.godown_image_paths ?? [],
      panCardPhotoPath: r.pan_card_photo_path ?? '',
      gstPhotoPath: r.gst_photo_path ?? '',
      advanceChequePhotoPath: r.advance_cheque_photo_path ?? '',
    }
    return { id: r.id, values, existing }
  } catch (error) {
    throw asApiError(error, 'Failed to load the distributor.')
  }
}

/**
 * GET /sales-incharge-admin/distributors/{id} — load a record and map it to a
 * read-only, display-oriented view (camelCase, image paths resolved to full
 * media URLs). Powers the "view details" modal on the list screen.
 */
export async function fetchDistributorDetail(id: string): Promise<DistributorDetailView> {
  try {
    const raw = await http.get<unknown>(endpoints.DISTRIBUTOR.GET(id))
    const r = distributorDetailSchema.parse(raw)
    const idStr = (v: number | null | undefined) => (v != null ? String(v) : null)
    return {
      id: r.id,
      code: r.distributor_code ?? null,
      status: r.status as DistributorStatus,

      firmName: r.firm_name,
      firmType: (r.firm_type ?? null) as FirmType | null,
      legalName: r.legal_name ?? null,
      ownerName: r.owner_name ?? null,
      ownerMobile: r.owner_mobile ?? null,
      ownerBirthDate: r.owner_birth_date ?? null,
      ownerAnniversaryDate: r.owner_marriage_anniversary ?? null,
      communicationMobile: r.communication_mobile ?? null,
      multipleLogin: r.multiple_login_allowed ?? null,
      email: r.email ?? null,

      officeAddress: r.office_address ?? null,
      godownAddress: r.godown_address ?? null,
      homeAddress: r.home_address ?? null,
      stateId: idStr(r.state_id),
      stateName: r.state_name ?? null,
      zoneName: r.zone_name ?? null,
      districtName: r.district_name ?? null,
      cityId: idStr(r.city_id),
      cityName: r.city_name ?? null,
      talukaId: idStr(r.taluka_id),
      talukaName: r.taluka_name ?? null,
      pincode: r.pincode ?? null,
      deliveryRoute: r.delivery_route ?? null,
      marketType: r.market_type ?? null,
      marketSystem: r.market_system ?? null,
      weeklyOff: r.weekly_off ?? null,
      geoLocation: r.geo_location ?? null,
      retailersLocal: r.retailers_local_market ?? null,
      retailersRural: r.retailers_rural_market ?? null,
      officeImageUrls: (r.office_image_paths ?? []).map((p) => mediaUrl(p)),
      godownImageUrls: (r.godown_image_paths ?? []).map((p) => mediaUrl(p)),

      productDivisionNames: r.product_division_names ?? [],
      otherAgencies: r.other_agencies_details ?? null,
      similarAgencies: r.similar_category_agencies ?? null,
      assignedProducts: r.assigned_products ?? null,
      productTargets: r.target_per_product ?? null,
      deliveryVehicle: r.delivery_vehicle ?? null,
      deliveryVehicleDetail: r.delivery_vehicle_detail ?? null,
      godownSize: r.godown_size_sqft ?? null,
      yearOfEst: r.year_established ?? null,

      panNumber: r.pan ?? null,
      panPhotoUrl: mediaUrl(r.pan_card_photo_path),
      gstNumber: r.gstin ?? null,
      gstPhotoUrl: mediaUrl(r.gst_photo_path),
      advanceChequeNumbers: r.advance_cheque_numbers ?? null,
      advanceChequePhotoUrl: mediaUrl(r.advance_cheque_photo_path),
      paymentCondition: r.payment_condition ?? null,
      bankAccountName: r.bank_account_name ?? null,
      bankAccountNumber: r.bank_account_number ?? null,
      bankIfsc: r.bank_ifsc ?? null,
      bankName: r.bank_name ?? null,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the distributor.')
  }
}

/**
 * PATCH /sales-incharge-admin/distributors/{id} — same body as create. Any
 * newly-picked files are uploaded and their keys merged with the paths already
 * on the record, so images the user leaves untouched are preserved.
 */
export async function updateDistributor(input: DistributorUpdateInput): Promise<void> {
  try {
    const { officeKeys, godownKeys, docKeys } = await uploadAllImages(input)
    const body = {
      ...buildScalarBody(input),
      office_image_paths: [...input.existing.officeImagePaths, ...officeKeys],
      godown_image_paths: [...input.existing.godownImagePaths, ...godownKeys],
      pan_card_photo_path: mergePath(input.existing.panCardPhotoPath, docKeys.pan_card),
      gst_photo_path: mergePath(input.existing.gstPhotoPath, docKeys.gst),
      advance_cheque_photo_path: mergePath(
        input.existing.advanceChequePhotoPath,
        docKeys.advance_cheque,
      ),
    }
    await http.patch<unknown>(endpoints.DISTRIBUTOR.UPDATE(input.id), body)
  } catch (error) {
    throw asApiError(error, 'Failed to update the distributor.')
  }
}

/** DELETE /sales-incharge-admin/distributors/{id} — permanently remove a record. */
export async function deleteDistributor(id: string): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.DISTRIBUTOR.DELETE(id))
  } catch (error) {
    throw asApiError(error, 'Failed to delete the distributor.')
  }
}

/** PATCH /sales-incharge-admin/distributors/{id}/status — change the lifecycle status. */
export async function setDistributorStatus(
  id: string,
  status: DistributorLifecycleStatus,
): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.DISTRIBUTOR.STATUS(id), { status })
  } catch (error) {
    throw asApiError(error, 'Failed to update the status.')
  }
}

/**
 * PATCH /sales-incharge-admin/distributors/{id}/onboarding — approve or reject a
 * pending onboarding request. Body is `{ action: 'approve' | 'reject' }`.
 */
export async function updateDistributorOnboarding(
  id: string,
  action: DistributorOnboardingAction,
  reason?: string,
): Promise<void> {
  try {
    const body: { action: DistributorOnboardingAction; reason?: string } = { action }
    const trimmed = reason?.trim()
    if (trimmed) body.reason = trimmed
    await http.patch<unknown>(endpoints.DISTRIBUTOR.ONBOARDING(id), body)
  } catch (error) {
    throw asApiError(error, 'Failed to update the onboarding status.')
  }
}
