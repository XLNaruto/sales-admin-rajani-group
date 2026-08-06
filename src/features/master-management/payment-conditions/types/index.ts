/**
 * A payment-condition master row (id + display name, mapped from
 * `condition_name`) — the terms a distributor trades on, e.g. `Credit 30 Days`.
 */
export interface PaymentCondition {
  id: number
  name: string
}

/** Body for creating/updating a payment condition (everything but the id). */
export interface PaymentConditionInput {
  name: string
}

/** Columns the list endpoint can sort by (its documented `sort_by` enum). */
export type PaymentConditionSortBy = 'condition_name' | 'created_at' | 'updated_at'

/** Query params accepted by the payment-condition list endpoint (camelCase). */
export interface PaymentConditionListParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: PaymentConditionSortBy
  sortOrder?: 'asc' | 'desc'
}

/** Normalised payment-condition list result: a page of rows + pagination. */
export interface PaymentConditionListResult {
  items: PaymentCondition[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
