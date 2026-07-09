import { z } from 'zod'
import type { ComboboxOption } from '@/components/ui/combobox'

export const ALLOCATION_SOURCES: ComboboxOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'field_request', label: 'Field Request' },
]

export const APPROVAL_STATUSES: ComboboxOption[] = [
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
]

/** Fallback day options when no beat is selected yet. */
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const LABELS: Record<string, string> = {
  admin: 'Admin',
  field_request: 'Field Request',
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  active: 'Active',
  ended: 'Ended',
}

export const labelFor = (value: string) => LABELS[value] ?? value

export const allocationSchema = z
  .object({
    beatId: z.string().min(1, 'Select a beat'),
    salesmanId: z.string().min(1, 'Assign a salesman'),
    visitDays: z.array(z.string()).min(1, 'Select at least one visit day'),
    effectiveFrom: z.string().min(1, 'Select the start date'),
    // Empty string = open-ended allocation.
    effectiveTo: z.string().optional(),
    source: z.enum(['admin', 'field_request']),
    approvalStatus: z.enum(['approved', 'pending', 'rejected']),
  })
  .refine((v) => !v.effectiveTo || v.effectiveTo >= v.effectiveFrom, {
    message: 'End date must be on or after the start date',
    path: ['effectiveTo'],
  })

export type AllocationFormValues = z.infer<typeof allocationSchema>

export const allocationDefaults: Partial<AllocationFormValues> = {
  beatId: '',
  salesmanId: '',
  visitDays: [],
  effectiveFrom: '',
  effectiveTo: '',
  source: 'admin',
  approvalStatus: 'approved',
}
