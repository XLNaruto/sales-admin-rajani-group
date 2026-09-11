import { z } from 'zod'
import { requiredAmount } from '@/lib/validation'

const phone = (msg = 'Enter a valid 10-digit number') => z.string().regex(/^\d{10}$/, msg)

/** Identifies this form's local drafts (see `lib/form-drafts.ts`). */
export const SALES_INCHARGE_DRAFT_KEY = 'sales-incharge:create'

/** Fields holding a `File` — persisted outside the encrypted draft payload. */
export const SALES_INCHARGE_FILE_FIELDS = ['profilePhoto', 'aadharFront', 'aadharBack']

export const salesInchargeSchema = z
  .object({
    name: z.string().min(2, 'Enter the name'),
    // Company (tenant) ids as strings; persisted as the `company_id` array. A
    // sales incharge can cover more than one. Sourced from `/me/companies`.
    employerCompanies: z
      .array(z.string())
      .min(1, 'Select at least one employer company'),
    address: z.string().min(2, 'Enter the address'),
    dateOfBirth: z.string().min(1, 'Select date of birth'),
    marriageAnniversary: z.string().optional(),
    mobile: phone(),
    alternateMobile: phone().optional().or(z.literal('')),
    dateOfJoining: z.string().min(1, 'Select date of joining'),
    dateOfExit: z.string().optional(),
    email: z.string().email('Enter a valid email'),
    // Money fields carry the API's amount limit (12 figures, 2 after the point).
    basicSalary: requiredAmount('Enter the basic salary'),
    allowance: requiredAmount('Enter the allowance'),
    // Display-only: there's no designations master to resolve an id from, so a
    // selected value isn't sent; the record's existing designation is preserved.
    designation: z.string().optional(),
    // Newly-picked files (edit mode also keeps the already-saved paths).
    profilePhoto: z.instanceof(File).optional(),
    bankAccountName: z.string().min(2, 'Enter the account holder name'),
    bankAccountNumber: z.string().regex(/^\d{9,18}$/, 'Enter a valid account number'),
    bankIfsc: z
      .string()
      .refine((v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()), {
        message: 'Enter a valid IFSC code',
      }),
    bankName: z.string().min(2, 'Enter the bank name'),
    aadharNumber: z.string().regex(/^\d{12}$/, 'Enter a valid 12-digit Aadhaar number'),
    aadharFront: z.instanceof(File).optional(),
    aadharBack: z.instanceof(File).optional(),
  })
  .refine((v) => !v.dateOfExit || v.dateOfExit >= v.dateOfJoining, {
    message: 'Exit date must be after the joining date',
    path: ['dateOfExit'],
  })
  // Alternate number, when given, must differ from the primary mobile.
  .refine((v) => !v.alternateMobile || v.alternateMobile !== v.mobile, {
    message: 'Alternate number must be different from the mobile number',
    path: ['alternateMobile'],
  })
  // Anniversary can't fall on/before the date of birth.
  .refine(
    (v) => !v.marriageAnniversary || !v.dateOfBirth || v.marriageAnniversary > v.dateOfBirth,
    { message: 'Anniversary must be after the date of birth', path: ['marriageAnniversary'] },
  )
  // Joining can't fall before the date of birth.
  .refine((v) => !v.dateOfJoining || !v.dateOfBirth || v.dateOfJoining > v.dateOfBirth, {
    message: 'Joining date must be after the date of birth',
    path: ['dateOfJoining'],
  })
  // Exit can't fall before the date of birth.
  .refine((v) => !v.dateOfExit || !v.dateOfBirth || v.dateOfExit > v.dateOfBirth, {
    message: 'Exit date must be after the date of birth',
    path: ['dateOfExit'],
  })

export type SalesInchargeFormValues = z.infer<typeof salesInchargeSchema>

export const salesInchargeDefaults: Partial<SalesInchargeFormValues> = {
  name: '',
  employerCompanies: [],
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
  designation: '',
  profilePhoto: undefined,
  bankAccountName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  bankName: '',
  aadharNumber: '',
  aadharFront: undefined,
  aadharBack: undefined,
}
