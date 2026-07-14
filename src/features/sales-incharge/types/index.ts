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
  | 'designation'
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
}

/** Query params accepted by the list endpoint. */
export interface SalesInchargeListParams {
  limit?: number
  offset?: number
  id?: number
  reportsTo?: number
  search?: string
  status?: SalesInchargeStatus
  sortBy?: SalesInchargeSortBy
  sortOrder?: 'asc' | 'desc'
}

/** Normalised list result (rows + total for pagination). */
export interface SalesInchargeListResult {
  items: SalesIncharge[]
  total: number
}
