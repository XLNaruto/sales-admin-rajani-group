import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { mediaUrl } from '@/lib/media'
import { asApiError } from '@/lib/api-error'
import { uploadFiles } from '@/lib/upload'
import {
  retailerDetailSchema,
  retailerListResponseSchema,
  type RetailerRow,
} from '../schemas'
import type { RetailerFormValues } from '../lib/retailer-form'
import type {
  Retailer,
  RetailerCreateInput,
  RetailerDetailView,
  RetailerExistingFiles,
  RetailerLifecycleStatus,
  RetailerListParams,
  RetailerListResult,
  RetailerOnboardingAction,
  RetailerUpdateInput,
} from '../types'

/** Map a validated API row to the client-facing (camelCase) `Retailer`. */
function toRetailer(row: RetailerRow): Retailer {
  return {
    id: row.id,
    code: row.retailer_code ?? '',
    shopName: row.shop_name,
    ownerName: row.owner_name ?? '',
    ownerMobile: row.owner_mobile ?? '',
    status: row.status,
    onboardingStatus: row.onboarding_status,
    market: row.market ?? undefined,
    cityId: row.city_id != null ? String(row.city_id) : '',
    cityName: row.city_name ?? undefined,
    beatId: row.beat_id != null ? String(row.beat_id) : '',
    beatName: row.beat_name ?? undefined,
    distributorName: row.distributor_name ?? undefined,
    outletTypeName: row.outlet_type_name ?? undefined,
  }
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: RetailerListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.status) q.status = params.status
  if (params.onboardingStatus) q.onboarding_status = params.onboardingStatus
  if (params.outletTypeId) q.outlet_type_id = params.outletTypeId
  if (params.beatId) q.beat_id = params.beatId
  if (params.stateId) q.state_id = params.stateId
  if (params.districtId) q.district_id = params.districtId
  if (params.talukaId) q.taluka_id = params.talukaId
  if (params.cityId) q.city_id = params.cityId
  if (params.distributorId) q.distributor_id = params.distributorId
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** GET /sales-incharge-admin/retailers — one page of the server-filtered list. */
export async function fetchRetailers(
  params: RetailerListParams = {},
): Promise<RetailerListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.RETAILER.LIST, {
      params: toQuery(params),
    })
    const res = retailerListResponseSchema.parse(raw)
    const items = res.retailers.map(toRetailer)
    return {
      items,
      total: res.total ?? items.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? items.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load retailers.')
  }
}

/* ------------------------------ Request body ----------------------------- */

/**
 * Normalise a reference id for the request body. Reference APIs return numeric
 * ids, so a numeric-looking string is sent as a number; anything else passes
 * through as-is so a selected value is never silently dropped. Only genuinely
 * empty selections collapse to undefined.
 */
function toId(value?: string): number | string | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : value
}

/** Collapse a blank/whitespace-only string to undefined so it's dropped from the body. */
const str = (v?: string) => (v && v.trim() !== '' ? v.trim() : undefined)

/**
 * Build the non-file portion of the create/update body — shared by both, since
 * PATCH is a full resubmit of the same shape. Two fields are deliberately
 * absent: `status` (rejected here — PATCH …/status owns it) and `beat_id` (the
 * server picks the beat nearest the coordinates, and the distributor follows
 * from that beat). `shop_photo_path` is filled in by the caller once the upload
 * resolves.
 */
function buildScalarBody(input: RetailerCreateInput) {
  return {
    retailer_code: str(input.code),
    shop_name: input.shopName,
    owner_name: str(input.ownerName),
    owner_mobile: input.ownerMobile,
    alternate_mobile: str(input.alternateMobile),
    owner_birth_date: str(input.ownerBirthDate),
    owner_marriage_anniversary: str(input.ownerAnniversaryDate),

    address_line: str(input.addressLine),
    address: str(input.address),
    formatted_address: str(input.formattedAddress),
    landmark: str(input.landmark),
    market: str(input.market),
    state_id: toId(input.stateId),
    zone_id: toId(input.zoneId),
    district_id: toId(input.districtId),
    taluka_id: toId(input.talukaId),
    city_id: toId(input.cityId),
    pincode: str(input.pincode),

    // Stored as two separate string columns, not one "lat, lng" field.
    latitude: str(input.latitude),
    longitude: str(input.longitude),

    outlet_type_id: toId(input.outletTypeId),
  }
}

/**
 * Presign + upload the picked shop photo and return its storage key. The field
 * holds a single image — `shop_photo_path` is one key, not a list — so only the
 * first picked file is uploaded.
 */
async function uploadShopPhoto(files: File[]): Promise<string | undefined> {
  const [key] = await uploadFiles(
    endpoints.RETAILER.SHOP_PHOTO_PRESIGN,
    files.slice(0, 1),
  )
  return key
}

/**
 * POST /sales-incharge-admin/retailers — presign + upload the shop photo, then
 * create the record with the returned storage key. Records created from this
 * panel come back `approved`.
 */
export async function createRetailer(input: RetailerCreateInput): Promise<void> {
  try {
    const key = await uploadShopPhoto(input.shopPhoto ?? [])
    await http.post<unknown>(endpoints.RETAILER.CREATE, {
      ...buildScalarBody(input),
      shop_photo_path: key,
    })
  } catch (error) {
    throw asApiError(error, 'Failed to create the retailer.')
  }
}

/**
 * PATCH /sales-incharge-admin/retailers/{id} — a full resubmit of the create
 * body, so an omitted field clears it. A newly picked photo replaces the stored
 * one; leaving the field untouched resends the saved path so the image
 * survives. Note the beat is re-derived from the submitted coordinates.
 */
export async function updateRetailer(input: RetailerUpdateInput): Promise<void> {
  try {
    const key = await uploadShopPhoto(input.shopPhoto ?? [])
    await http.patch<unknown>(endpoints.RETAILER.UPDATE(input.id), {
      ...buildScalarBody(input),
      shop_photo_path: key ?? str(input.existing.shopPhotoPath),
    })
  } catch (error) {
    throw asApiError(error, 'Failed to update the retailer.')
  }
}

/**
 * GET /sales-incharge-admin/retailers/{id} — load a full record and map it into
 * form-ready values (all scalar/select fields as strings, file inputs left
 * empty) plus the storage path already saved, so the edit form can seed itself
 * and retain the existing photo the user doesn't re-pick.
 */
export async function fetchRetailer(id: string): Promise<{
  id: string
  values: RetailerFormValues
  existing: RetailerExistingFiles
}> {
  try {
    const raw = await http.get<unknown>(endpoints.RETAILER.GET(id))
    const r = retailerDetailSchema.parse(raw)
    const idStr = (v: number | null | undefined) => (v != null ? String(v) : '')
    const values: RetailerFormValues = {
      code: r.retailer_code ?? '',
      shopName: r.shop_name,
      ownerName: r.owner_name ?? '',
      ownerMobile: r.owner_mobile ?? '',
      alternateMobile: r.alternate_mobile ?? '',
      ownerBirthDate: r.owner_birth_date ?? '',
      ownerAnniversaryDate: r.owner_marriage_anniversary ?? '',

      addressLine: r.address_line ?? '',
      address: r.address ?? '',
      landmark: r.landmark ?? '',
      market: r.market ?? '',
      stateId: idStr(r.state_id),
      zoneId: idStr(r.zone_id),
      districtId: idStr(r.district_id),
      talukaId: idStr(r.taluka_id),
      cityId: idStr(r.city_id),
      pincode: r.pincode ?? '',

      geoLocation: joinLatLng(r.latitude, r.longitude) ?? '',
      formattedAddress: r.formatted_address ?? '',

      outletTypeId: idStr(r.outlet_type_id),
      shopPhoto: [],
    }
    return {
      id: r.id,
      values,
      existing: { shopPhotoPath: r.shop_photo_path ?? '' },
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the retailer.')
  }
}

/** Assemble the two stored coordinate columns into the picker's "lat, lng" string. */
function joinLatLng(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): string | null {
  if (lat == null || lng == null || lat === '' || lng === '') return null
  return `${lat}, ${lng}`
}

/**
 * GET /sales-incharge-admin/retailers/{id} — load a record and map it to a
 * read-only, display-oriented view (camelCase, photo path resolved to a full
 * media URL). Powers the "view details" modal on the list screen.
 */
export async function fetchRetailerDetail(id: string): Promise<RetailerDetailView> {
  try {
    const raw = await http.get<unknown>(endpoints.RETAILER.GET(id))
    const r = retailerDetailSchema.parse(raw)
    return {
      id: r.id,
      code: r.retailer_code ?? null,
      status: r.status,
      onboardingStatus: r.onboarding_status,

      shopName: r.shop_name,
      ownerName: r.owner_name ?? null,
      ownerMobile: r.owner_mobile ?? null,
      alternateMobile: r.alternate_mobile ?? null,
      ownerBirthDate: r.owner_birth_date ?? null,
      ownerAnniversaryDate: r.owner_marriage_anniversary ?? null,

      addressLine: r.address_line ?? null,
      address: r.address ?? null,
      formattedAddress: r.formatted_address ?? null,
      landmark: r.landmark ?? null,
      market: r.market ?? null,
      stateName: r.state_name ?? null,
      zoneName: r.zone_name ?? null,
      districtName: r.district_name ?? null,
      talukaName: r.taluka_name ?? null,
      cityName: r.city_name ?? null,
      pincode: r.pincode ?? null,
      beatName: r.beat_name ?? null,
      distributorName: r.distributor_name ?? null,

      geoLocation: joinLatLng(r.latitude, r.longitude),

      outletTypeName: r.outlet_type_name ?? null,
      shopPhotoUrl: mediaUrl(r.shop_photo_path),

      lastOrderAt: r.last_order_at ?? null,
      lastVisitAt: r.last_visit_at ?? null,
      visitCount: r.visit_count ?? null,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the retailer.')
  }
}

/** DELETE /sales-incharge-admin/retailers/{id} — soft-delete a record. */
export async function deleteRetailer(id: string): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.RETAILER.DELETE(id))
  } catch (error) {
    throw asApiError(error, 'Failed to delete the retailer.')
  }
}

/** PATCH /sales-incharge-admin/retailers/{id}/status — change the lifecycle status. */
export async function setRetailerStatus(
  id: string,
  status: RetailerLifecycleStatus,
): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.RETAILER.STATUS(id), { status })
  } catch (error) {
    throw asApiError(error, 'Failed to update the status.')
  }
}

/**
 * PATCH /sales-incharge-admin/retailers/{id}/beat — allocate the outlet to a
 * beat, leaving the rest of the record alone. Body is exactly `{ beat_id }`;
 * pass `null` to leave it unassigned. Because an outlet's distributors come from
 * its beat, this is also what moves it between firms. 404s when the outlet or
 * the beat is missing.
 */
export async function setRetailerBeat(id: string, beatId: string | null): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.RETAILER.BEAT(id), {
      beat_id: beatId ? toId(beatId) : null,
    })
  } catch (error) {
    throw asApiError(error, 'Failed to allocate the beat.')
  }
}

/**
 * PATCH /sales-incharge-admin/retailers/{id}/onboarding — review an outlet
 * captured in the field. Body is exactly `{ action: 'approve' | 'reject' }`.
 * Approving activates the outlet and assigns its nearest beat when it has none;
 * rejecting deactivates it (a later edit reopens the request as `pending`).
 * 409s when the outlet is already in the requested state.
 */
export async function updateRetailerOnboarding(
  id: string,
  action: RetailerOnboardingAction,
): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.RETAILER.ONBOARDING(id), { action })
  } catch (error) {
    throw asApiError(error, 'Failed to update the onboarding status.')
  }
}
