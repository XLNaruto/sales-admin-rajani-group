/**
 * Category master (`GET /sales-incharge-admin/categories`) — product categories
 * are managed in the Billing Admin panel; here they're read-only and only back
 * the distributor form's "Assigned Products" picker.
 */
export { useMainCategoryOptions } from './api/use-main-category-options'
export { fetchCategories } from './api/category-api'
export type { MainCategoryOption, CategoryListParams } from './types'
