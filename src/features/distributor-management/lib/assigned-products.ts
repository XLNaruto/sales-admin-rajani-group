import { ApiError, errorCode, getApiErrorMessage } from '@/lib/api-error'
import type { AssignedProductValues } from './distributor-form'

/** Server error codes that point at one "Assigned Products" row. */
const ROW_ERROR_CODES = new Set([
  'ASSIGNED_PRODUCT_NOT_MAIN_CATEGORY',
  'ASSIGNED_PRODUCT_COMPANY_NOT_SELECTED',
  'ASSIGNED_PRODUCT_DUPLICATE',
])

/**
 * Locate the form row a failed save's assigned-product error belongs to.
 *
 * The API names the offending `category_id` in `details` (except for a
 * duplicate, where the second occurrence is the one to flag). Returns the row
 * index and the server's message, or null when the error isn't one of these or
 * no row matches — the caller then falls back to a toast.
 */
export function assignedProductErrorRow(
  error: unknown,
  rows: AssignedProductValues[],
): { index: number; message: string } | null {
  const code = errorCode(error)
  if (!code || !ROW_ERROR_CODES.has(code)) return null
  const message = getApiErrorMessage(error)

  if (code === 'ASSIGNED_PRODUCT_DUPLICATE') {
    const seen = new Set<string>()
    const index = rows.findIndex((r) => {
      if (seen.has(r.categoryId)) return true
      seen.add(r.categoryId)
      return false
    })
    return index >= 0 ? { index, message } : null
  }

  const details = error instanceof ApiError ? error.details : undefined
  const categoryId =
    details && typeof details === 'object' && 'category_id' in details
      ? String((details as { category_id: unknown }).category_id)
      : null
  const index = categoryId ? rows.findIndex((r) => r.categoryId === categoryId) : -1
  return index >= 0 ? { index, message } : null
}
