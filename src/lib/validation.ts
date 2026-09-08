import { z } from 'zod'

/**
 * The API's limit on every money column (salary, allowance, any amount):
 * at most 12 figures before the point and 2 after it. Send anything wider and
 * the request is rejected, so every amount input is checked against the same
 * shape before it leaves the form.
 */
export const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/

/** Shown when the value isn't a plain amount at all (letters, symbols, a minus). */
export const AMOUNT_MESSAGE = 'Enter a valid amount, like 25000 or 25000.50'

/** Shown when the amount is a number, but a bigger one than the record can hold. */
export const AMOUNT_TOO_LARGE_MESSAGE = 'This amount is too large'

/** Shown when the value carries more than two figures after the point. */
export const AMOUNT_TOO_PRECISE_MESSAGE = 'Enter at most two figures after the point, like 25000.50'

/**
 * Which of the three messages fits this value — `null` when it's a valid
 * amount. Split out so the user is told what to change ("too large") rather
 * than being handed one catch-all rule to decode.
 */
function amountProblem(value: string): string | null {
  if (!/^\d+(\.\d+)?$/.test(value)) return AMOUNT_MESSAGE
  const [whole, fraction = ''] = value.split('.')
  if (whole.length > 12) return AMOUNT_TOO_LARGE_MESSAGE
  if (fraction.length > 2) return AMOUNT_TOO_PRECISE_MESSAGE
  return null
}

/**
 * A required amount field. Numeric inputs stay strings so the schema's input
 * and output types match (react-hook-form types `useForm` against the
 * resolver's input type).
 */
export const requiredAmount = (required: string) =>
  z
    .string()
    .trim()
    .min(1, required)
    .superRefine((value, ctx) => {
      const problem = amountProblem(value)
      if (problem) ctx.addIssue({ code: 'custom', message: problem })
    })

/** An amount field that may be left blank; when filled it must still fit. */
export const optionalAmount = () =>
  z
    .string()
    .trim()
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return
      const problem = amountProblem(value)
      if (problem) ctx.addIssue({ code: 'custom', message: problem })
    })
