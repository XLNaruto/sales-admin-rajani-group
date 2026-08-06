import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  paymentConditionDeleteResponseSchema,
  paymentConditionListResponseSchema,
  paymentConditionRowSchema,
} from '../schemas'
import type {
  PaymentCondition,
  PaymentConditionInput,
  PaymentConditionListParams,
  PaymentConditionListResult,
} from '../types'

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(
  params: PaymentConditionListParams,
): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** Build the create/update request body from the client-facing input. */
function toBody(input: PaymentConditionInput) {
  return { condition_name: input.name.trim() }
}

/**
 * GET /sales-incharge-admin/payment-conditions — one page of the
 * server-filtered master.
 */
export async function fetchPaymentConditions(
  params: PaymentConditionListParams = {},
): Promise<PaymentConditionListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.PAYMENT_CONDITION.LIST, {
      params: toQuery(params),
    })
    const res = paymentConditionListResponseSchema.parse(raw)
    return {
      items: res.payment_conditions,
      total: res.total ?? res.payment_conditions.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? res.payment_conditions.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load payment conditions.')
  }
}

/** GET /sales-incharge-admin/payment-conditions/{id} — a single condition. */
export async function fetchPaymentCondition(id: number): Promise<PaymentCondition> {
  try {
    const raw = await http.get<unknown>(endpoints.PAYMENT_CONDITION.GET(id))
    return paymentConditionRowSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to load the payment condition.')
  }
}

/**
 * POST /sales-incharge-admin/payment-conditions — create. `409`s when the name
 * collides with a live one; the API's message is surfaced as-is.
 */
export async function createPaymentCondition(
  input: PaymentConditionInput,
): Promise<PaymentCondition> {
  try {
    const raw = await http.post<unknown>(
      endpoints.PAYMENT_CONDITION.CREATE,
      toBody(input),
    )
    return paymentConditionRowSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to create the payment condition.')
  }
}

/** PATCH /sales-incharge-admin/payment-conditions/{id} — rename a condition. */
export async function updatePaymentCondition(
  id: number,
  input: PaymentConditionInput,
): Promise<PaymentCondition> {
  try {
    const raw = await http.patch<unknown>(
      endpoints.PAYMENT_CONDITION.UPDATE(id),
      toBody(input),
    )
    return paymentConditionRowSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to update the payment condition.')
  }
}

/**
 * DELETE /sales-incharge-admin/payment-conditions/{id} — remove a condition.
 * The API refuses with `409 PAYMENT_CONDITION_IN_USE` while any distributor
 * still trades on it; that message reaches the caller unchanged.
 */
export async function deletePaymentCondition(id: number): Promise<void> {
  try {
    const raw = await http.delete<unknown>(endpoints.PAYMENT_CONDITION.DELETE(id))
    paymentConditionDeleteResponseSchema.parse(raw)
  } catch (error) {
    throw asApiError(error, 'Failed to delete the payment condition.')
  }
}
