import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  distributorListResponseSchema,
  presignResponseSchema,
  type DistributorListResponse,
  type DistributorRow,
} from '../schemas'
import type {
  Distributor,
  DistributorCreateInput,
  DistributorListParams,
  DistributorListResult,
  DistributorMarketType,
  DistributorStatus,
  FirmType,
  MarketSystem,
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
    // Fields not returned by the list endpoint — filled on the detail screen.
    officeAddress: '',
    stateId: '',
    zoneId: '',
    districtId: '',
    talukaId: '',
    cityId: row.city_id != null ? String(row.city_id) : '',
    marketType: (row.market_type ?? undefined) as DistributorMarketType | undefined,
    marketSystem: (row.market_system ?? undefined) as MarketSystem | undefined,
  }
}

/** Pull rows + total out of whichever envelope the backend returned. */
function unwrap(res: DistributorListResponse): { rows: DistributorRow[]; total?: number } {
  if (Array.isArray(res)) return { rows: res }
  if ('data' in res) return { rows: res.data, total: res.total ?? res.count }
  if ('items' in res) return { rows: res.items, total: res.total ?? res.count }
  return { rows: res.results, total: res.total ?? res.count }
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: DistributorListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.limit != null) q.limit = params.limit
  if (params.offset != null) q.offset = params.offset
  if (params.search) q.search = params.search
  if (params.status) q.status = params.status
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /sales-incharge-admin/distributors — live, server-filtered list. */
export async function fetchDistributors(
  params: DistributorListParams = {},
): Promise<DistributorListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.DISTRIBUTOR.LIST, {
      params: toQuery(params),
    })
    const { rows, total } = unwrap(distributorListResponseSchema.parse(raw))
    const items = rows.map(toDistributor)
    return { items, total: total ?? items.length }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load distributors.'))
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
    throw new Error(getApiErrorMessage(error, 'Failed to upload images.'))
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
    throw new Error(getApiErrorMessage(error, 'Failed to upload documents.'))
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

    const body = {
      distributor_code: str(input.code),
      status: input.status,
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
      geo_location: str(input.geoLocation),
      office_image_paths: officeKeys,
      godown_image_paths: godownKeys,
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
      pan_card_photo_path: docKeys.pan_card.join(',') || undefined,
      gst_photo_path: docKeys.gst.join(',') || undefined,
      advance_cheque_numbers: str(input.advanceChequeNumbers),
      advance_cheque_photo_path: docKeys.advance_cheque.join(',') || undefined,
      payment_condition: input.paymentCondition,
      bank_account_name: str(input.bankAccountName),
      bank_account_number: str(input.bankAccountNumber),
      bank_ifsc: str(input.bankIfsc),
      bank_name: str(input.bankName),
    }

    await http.post<unknown>(D.CREATE, body)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to create the distributor.'))
  }
}
