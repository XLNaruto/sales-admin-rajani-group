/** Outlet-type master — the sub-module behind Master Management → Outlet Types. */
export { OutletTypesPage } from './pages/outlet-types-page'
export {
  useOutletTypeList,
  useOutletTypesInfinite,
  // The dropdown-shaped read, consumed by the retailer form's Outlet Type select.
  useOutletTypes,
  useOutletType,
  useCreateOutletType,
  useUpdateOutletType,
  useDeleteOutletType,
} from './api/use-outlet-types'
export type {
  OutletType,
  OutletTypeInput,
  OutletTypeListParams,
  OutletTypeListResult,
  OutletTypeSortBy,
} from './types'
