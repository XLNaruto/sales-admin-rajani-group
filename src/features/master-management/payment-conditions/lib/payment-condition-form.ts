import { z } from 'zod'

/** The payment-condition form — the master's one editable field. */
export const paymentConditionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the payment condition name')
    // The API caps `condition_name` at 100 characters.
    .max(100, 'Name is too long'),
})

export type PaymentConditionFormValues = z.infer<typeof paymentConditionSchema>

export const paymentConditionDefaults: PaymentConditionFormValues = {
  name: '',
}
