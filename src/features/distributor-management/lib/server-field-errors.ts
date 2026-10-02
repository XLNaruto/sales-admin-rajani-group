import { ApiError } from '@/lib/api-error'
import type { DistributorFormValues } from './distributor-form'

type FormField = keyof DistributorFormValues

/**
 * Request-body keys (snake_case) whose form field has a different name. Keys
 * not listed here are tried as-is after a snake → camel conversion, which
 * covers the rest (`firm_name` → `firmName`, `credit_limit` → `creditLimit`…).
 */
const API_TO_FORM: Record<string, FormField> = {
  company_id: 'companyIds',
  taluka_of_agency_ids: 'agencyTalukaIds',
  retailers_local_market: 'retailersLocal',
  retailers_rural_market: 'retailersRural',
  geo_latitude: 'geoLocation',
  geo_longitude: 'geoLocation',
  office_image_paths: 'officeImages',
  godown_image_paths: 'godownImages',
  other_agencies_details: 'otherAgencies',
  similar_category_agencies: 'similarAgencies',
  godown_size_sqft: 'godownSize',
  year_established: 'yearOfEst',
  pan: 'panNumber',
  pan_card_photo_path: 'panPhoto',
  gstin: 'gstNumber',
  gst_photo_path: 'gstPhoto',
  advance_cheque_photo_path: 'advanceChequePhoto',
}

const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

export interface ServerFieldError {
  field: FormField
  message: string
}

/**
 * Pull per-field messages out of a VALIDATION_ERROR response
 * (`details: [{ path, message }]`) and resolve each `path` to its form field.
 * Paths that don't match a known field are dropped — the caller still has the
 * top-level message to toast for those.
 */
export function serverFieldErrors(
  error: unknown,
  knownFields: readonly string[],
): ServerFieldError[] {
  const details = error instanceof ApiError ? error.details : undefined
  if (!Array.isArray(details)) return []

  const known = new Set(knownFields)
  const out: ServerFieldError[] = []
  for (const d of details) {
    if (!d || typeof d !== 'object') continue
    const { path, message } = d as { path?: unknown; message?: unknown }
    if (typeof path !== 'string' || typeof message !== 'string') continue
    // Nested paths (`owners.0.mobile`) pin to their top-level field.
    const root = path.split('.')[0]
    const field = API_TO_FORM[root] ?? toCamel(root)
    if (known.has(field)) out.push({ field: field as FormField, message })
  }
  return out
}
