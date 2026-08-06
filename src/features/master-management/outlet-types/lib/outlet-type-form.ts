import { z } from 'zod'

/** The outlet-type form — the master's one editable field. */
export const outletTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the outlet type name')
    // The API caps `type_name` at 100 characters.
    .max(100, 'Name is too long'),
})

export type OutletTypeFormValues = z.infer<typeof outletTypeSchema>

export const outletTypeDefaults: OutletTypeFormValues = {
  name: '',
}
