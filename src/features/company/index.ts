export { CompanySwitcher } from './components/company-switcher'
export { CompanySelectGate } from './components/company-select-gate'
export { useCompanies } from './api/use-companies'
export { useSelectCompany } from './api/use-select-company'
export type { Company, CompaniesState } from './types'
export {
  useCompanyPickerStore,
  useOpenCompanyPickerOnError,
  isCompanyNotSelected,
  COMPANY_NOT_SELECTED,
} from './hooks/use-company-picker'
export {
  useOnCompanySwitch,
  useRedirectOnCompanySwitch,
  useResetDataOnCompanySwitch,
} from './hooks/use-on-company-switch'
