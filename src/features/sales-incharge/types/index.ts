export type SalesmanStatus = 'active' | 'inactive'

export interface BankDetails {
  accountName: string
  accountNumber: string
  ifsc: string
  bankName: string
}

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
  bankDetails: BankDetails
  aadharNumber: string
  aadharFrontUrl?: string
  aadharBackUrl?: string
  status: SalesmanStatus
}

/** Payload for creating a sales incharge (everything except the generated id). */
export type SalesmanInput = Omit<Salesman, 'id'>
