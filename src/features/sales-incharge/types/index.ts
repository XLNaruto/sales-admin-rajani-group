export type SalesmanStatus = 'active' | 'inactive'

export interface Salesman {
  id: string
  name: string
  employerCompany: string
  address: string
  dateOfBirth: string
  marriageAnniversary?: string
  mobile: string
  alternateMobile?: string
  dateOfJoining: string
  dateOfExit?: string
  email: string
  basicSalary: number
  allowance: number
  designation: string
  photoUrl?: string
  bankAccountName: string
  bankAccountNumber: string
  bankIfsc: string
  bankName: string
  aadharNumber: string
  aadharFrontUrl?: string
  aadharBackUrl?: string
  status: SalesmanStatus
}

/** Payload for creating a sales incharge (everything except the generated id). */
export type SalesmanInput = Omit<Salesman, 'id'>

// --- Live list API (GET /sales-incharge-admin/sales-incharges) --------------

/** Status values returned by the list endpoint. */
export type SalesInchargeStatus = 'active' | 'invited' | 'suspended' | 'inactive'

/** Columns the list endpoint can sort by. */
export type SalesInchargeSortBy =
  | 'display_name'
  | 'phone'
  | 'employee_code'
  | 'designation_id'
  | 'territory'
  | 'date_of_joining'
  | 'status'

/** A single row as returned by the list endpoint. */
export interface SalesIncharge {
  id: number
  displayName: string
  phone: string | null
  email: string | null
  employeeCode: string | null
  designation: string | null
  territory: string | null
  dateOfJoining: string | null
  status: SalesInchargeStatus
  reportsTo: number | null
  /** Full media URL for the profile photo (resolved from `profile_photo_path`). */
  profilePhotoUrl?: string
}

/** Query params accepted by the list endpoint (page-based pagination). */
export interface SalesInchargeListParams {
  /** 1-based page number. */
  page?: number
  /** Rows per page. */
  pageSize?: number
  id?: number
  reportsTo?: number
  search?: string
  status?: SalesInchargeStatus
  sortBy?: SalesInchargeSortBy
  sortOrder?: 'asc' | 'desc'
}

/** Normalised list result: the page of rows plus its pagination metadata. */
export interface SalesInchargeListResult {
  items: SalesIncharge[]
  /** Total rows matching the filter, across all pages. */
  total: number
  /** Current page (1-based). */
  page: number
  /** Rows per page. */
  pageSize: number
  /** Total number of pages — `ceil(total / pageSize)`. */
  totalPages: number
}

/**
 * Display-oriented view of a single sales incharge — the full record from the
 * detail endpoint, mapped to camelCase with photo paths resolved to full media
 * URLs. Powers the read-only "view details" modal on the list screen.
 */
export interface SalesInchargeDetailView {
  id: number
  displayName: string
  status: SalesInchargeStatus
  employeeCode: string | null
  designation: string | null
  territory: string | null
  reportsTo: number | null
  phone: string | null
  alternatePhone: string | null
  email: string | null
  address: string | null
  dateOfBirth: string | null
  marriageAnniversary: string | null
  dateOfJoining: string | null
  dateOfExit: string | null
  basicSalary: string | null
  allowance: string | null
  salary: string | null
  bankAccountName: string | null
  bankAccountNumber: string | null
  bankIfsc: string | null
  bankName: string | null
  aadharNumber: string | null
  profilePhotoUrl: string
  aadharFrontUrl: string
  aadharBackUrl: string
}

// --- Reporting hierarchy (GET …/sales-incharges/hierarchy) ------------------

/**
 * A node on the salesman-hierarchy canvas. Each node is a sales incharge;
 * `id`/`salesmanId` both carry the incharge's id (as a string) and the node
 * carries its own display fields so the tree renders without a side lookup.
 */
export interface HierarchyNode {
  id: string
  salesmanId: string
  name: string
  designation: string | null
  photoUrl?: string
  children: HierarchyNode[]
}

/**
 * A node in the sales-incharge reporting tree (client-facing). Each node is a
 * sales incharge; `reports` holds their direct reports (recursively). The tree
 * is single-rooted — the endpoint returns the one root node (`isRoot: true`)
 * or `null` when none has been designated.
 */
export interface SalesInchargeHierarchyNode {
  id: number
  name: string
  designation: string | null
  /** Full media URL for the profile photo (resolved from the S3 key), if any. */
  photoUrl?: string
  status: SalesInchargeStatus | null
  /** True only for the single top-of-org node. */
  isRoot: boolean
  reports: SalesInchargeHierarchyNode[]
}

// --- Designations master (GET /sales-incharge-admin/designations) -----------

/** A single designation row (client-facing). */
export interface Designation {
  id: number
  name: string
}

/** Query params accepted by the designations list endpoint. */
export interface DesignationListParams {
  page?: number
  pageSize?: number
  id?: number
  search?: string
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

/** Normalised designations result: rows plus pagination metadata. */
export interface DesignationListResult {
  items: Designation[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Storage keys already saved on a record — retained on update so leaving an
 * image field untouched (no new file picked) doesn't wipe the existing photo.
 */
export interface SalesInchargeExistingFiles {
  profilePhotoPath: string
  aadharFrontPhotoPath: string
  aadharBackPhotoPath: string
}

/**
 * Server-managed fields the onboarding form doesn't edit. Captured from the
 * detail on load and sent back unchanged on update, so editing the form never
 * wipes them.
 */
export interface SalesInchargePreservedFields {
  status: SalesInchargeStatus
  employeeCode: string | null
  designationId: number | null
  reportsTo: number | null
  territory: string | null
  salary: string | null
}
