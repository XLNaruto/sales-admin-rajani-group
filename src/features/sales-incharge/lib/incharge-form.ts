import { z } from 'zod'

/** Designations for the sales incharge. */
export const DESIGNATIONS = [
  'Sales Officer',
  'Senior Sales Officer',
  'Area Sales Manager',
  'Regional Sales Manager',
] as const

// Numeric inputs stay strings so the schema's input and output types match
// (react-hook-form types `useForm` against the resolver's input type).
const reqNum = (msg = 'Enter a valid amount') =>
  z
    .string()
    .min(1, msg)
    .refine((v) => Number(v) >= 0 && v.trim() !== '', msg)

const phone = (msg = 'Enter a valid 10-digit number') => z.string().regex(/^\d{10}$/, msg)

export const salesInchargeSchema = z
  .object({
    name: z.string().min(2, 'Enter the name'),
    employerCompany: z.string().min(2, 'Enter the employer company'),
    address: z.string().min(4, 'Enter the address'),
    dateOfBirth: z.string().min(1, 'Select date of birth'),
    marriageAnniversary: z.string().optional(),
    mobile: phone(),
    alternateMobile: phone().optional().or(z.literal('')),
    dateOfJoining: z.string().min(1, 'Select date of joining'),
    dateOfExit: z.string().optional(),
    email: z.string().email('Enter a valid email'),
    basicSalary: reqNum('Enter the basic salary'),
    allowance: reqNum('Enter the allowance'),
    designation: z.enum(DESIGNATIONS, { message: 'Select a designation' }),
    photoUrl: z.string().min(1, 'Upload a photo'),
    bankDetails: z.object({
      accountName: z.string().min(2, 'Enter the account holder name'),
      accountNumber: z.string().regex(/^\d{9,18}$/, 'Enter a valid account number'),
      ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code'),
      bankName: z.string().min(2, 'Enter the bank name'),
    }),
    aadharNumber: z.string().regex(/^\d{12}$/, 'Enter a valid 12-digit Aadhaar number'),
    aadharFrontUrl: z.string().optional(),
    aadharBackUrl: z.string().optional(),
  })
  .refine((v) => !v.dateOfExit || v.dateOfExit >= v.dateOfJoining, {
    message: 'Exit date must be after the joining date',
    path: ['dateOfExit'],
  })

export type SalesInchargeFormValues = z.infer<typeof salesInchargeSchema>

export const salesInchargeDefaults: Partial<SalesInchargeFormValues> = {
  name: '',
  employerCompany: '',
  address: '',
  dateOfBirth: '',
  marriageAnniversary: '',
  mobile: '',
  alternateMobile: '',
  dateOfJoining: '',
  dateOfExit: '',
  email: '',
  basicSalary: '',
  allowance: '',
  photoUrl: '',
  bankDetails: { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
  aadharNumber: '',
  aadharFrontUrl: '',
  aadharBackUrl: '',
}
