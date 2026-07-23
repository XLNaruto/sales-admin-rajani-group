/** A company (tenant) the current sales admin belongs to. */
export interface Company {
  id: number
  name: string
  /** Tenant code (e.g. `DIST-T42VEJ`), when the server provides it. */
  code?: string | null
}

/**
 * The caller's tenant state, returned by both `GET /me/companies` and
 * `POST /me/company/select`.
 */
export interface CompaniesState {
  /** Companies the caller belongs to. */
  companies: Company[]
  /**
   * The active company. Resolves to the sole company for single-company admins;
   * `null` when a multi-company admin hasn't picked yet.
   */
  selectedCompanyId: number | null
  /** True only when there's a real choice: more than one company and none picked. */
  requiresSelection: boolean
}
