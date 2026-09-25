/**
 * A main (root) product category, as offered by the distributor form's
 * "Assigned Products" picker. Categories are per-company; `companyId` is the
 * company it belongs to, or null when it couldn't be determined.
 */
export interface MainCategoryOption {
  id: number
  name: string
  companyId: number | null
}

/** Query params accepted by the category list endpoint (camelCase). */
export interface CategoryListParams {
  page?: number
  pageSize?: number
  /** `parent` → main (root) categories only; `child` → sub-categories only. */
  type?: 'parent' | 'child'
  status?: 'active' | 'inactive'
  search?: string
}
