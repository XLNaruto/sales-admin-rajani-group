import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import type { ComboboxOption } from '@/components/ui/combobox'
import {
  fetchCities,
  fetchDistricts,
  fetchStates,
  fetchZones,
} from '@/features/location'
import {
  hierarchyListResponseSchema,
  salesInchargeAdminListResponseSchema,
} from '../schemas'
import {
  buildTree,
  LEVEL_GEO_FIELD,
  type HierarchyLevel,
  type StructureNode,
} from '../lib/hierarchy'

/** Everything a create/update needs, in the client's own (camelCase) shape. */
export interface HierarchyEntryInput {
  level: HierarchyLevel
  designationId: number
  /** null for National (no geography). */
  geoId: number | null
  assigneeId: number
  /** City nodes assign a Sales Incharge; higher levels a Sales Incharge Admin. */
  isCityLevel: boolean
}

/** Build the POST/PATCH body shared by both flows from the client input. */
function toBody(input: HierarchyEntryInput): Record<string, number> {
  const geoField = LEVEL_GEO_FIELD[input.level]
  return {
    designation_id: input.designationId,
    ...(input.isCityLevel
      ? { sales_incharge_id: input.assigneeId }
      : { sales_incharge_admin_id: input.assigneeId }),
    ...(geoField && input.geoId != null ? { [geoField]: input.geoId } : {}),
  }
}

/**
 * GET /sales-incharge-admin/hierarchy — the flat rows, assembled into the
 * nested tree client-side. Returns `null` when the hierarchy is empty.
 */
export async function fetchHierarchyTree(): Promise<StructureNode | null> {
  try {
    const raw = await http.get<unknown>(endpoints.HIERARCHY.LIST)
    const { items } = hierarchyListResponseSchema.parse(raw)
    return buildTree(items)
  } catch (error) {
    throw asApiError(error, 'Failed to load the hierarchy.')
  }
}

/** POST /sales-incharge-admin/hierarchy — add a node under `parentId`. */
export async function createHierarchyEntry(
  parentId: number | null,
  input: HierarchyEntryInput,
): Promise<void> {
  try {
    await http.post<unknown>(endpoints.HIERARCHY.CREATE, {
      parent_id: parentId,
      ...toBody(input),
    })
  } catch (error) {
    throw asApiError(error, 'Failed to add the hierarchy entry.')
  }
}

/** PATCH /sales-incharge-admin/hierarchy/{id} — update a node in place. */
export async function updateHierarchyEntry(
  id: string,
  input: HierarchyEntryInput,
): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.HIERARCHY.UPDATE(id), toBody(input))
  } catch (error) {
    throw asApiError(error, 'Failed to update the hierarchy entry.')
  }
}

/** DELETE /sales-incharge-admin/hierarchy/{id} — soft-delete a node + subtree. */
export async function deleteHierarchyEntry(id: string): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.HIERARCHY.DELETE(id))
  } catch (error) {
    throw asApiError(error, 'Failed to delete the hierarchy entry.')
  }
}

/**
 * The geographic master matching a level (State → states … City → cities),
 * mapped to combobox options. National has no geography, so it returns `[]`.
 * Reuses the Location feature's fetchers (validation + camelCase mapping).
 */
export async function fetchGeoOptions(
  level: HierarchyLevel,
): Promise<ComboboxOption[]> {
  const toOptions = (items: Array<{ id: number; name: string }>) =>
    items.map((i) => ({ value: String(i.id), label: i.name }))
  const params = { pageSize: 100, sortBy: 'name', sortOrder: 'asc' } as const
  switch (level) {
    case 'State':
      return toOptions((await fetchStates(params)).items)
    case 'Zone':
      return toOptions((await fetchZones(params)).items)
    case 'District':
      return toOptions((await fetchDistricts(params)).items)
    case 'City':
      return toOptions((await fetchCities(params)).items)
    default:
      return []
  }
}

/**
 * GET /sales-incharge-admin/hierarchy/available-sales-incharge-admins — the
 * assignee pool for non-City levels, mapped to combobox options. Pulls the
 * first page (max size) sorted by display name.
 */
export async function fetchSalesInchargeAdminOptions(): Promise<ComboboxOption[]> {
  try {
    const raw = await http.get<unknown>(endpoints.HIERARCHY.AVAILABLE_ADMINS, {
      params: { page: 1, page_size: 100, sort_by: 'display_name', sort_order: 'asc' },
    })
    const { sales_incharge_admins } = salesInchargeAdminListResponseSchema.parse(raw)
    return sales_incharge_admins.map((r) => ({ value: String(r.id), label: r.display_name }))
  } catch (error) {
    throw asApiError(error, 'Failed to load sales incharge admins.')
  }
}
