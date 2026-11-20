import { useBeat } from '@/features/beat-creation'
import { useOutletTypes } from '@/features/master-management'
import type { RetailerEditNameResolvers } from '../lib/retailer-edit-diff'
import type { RetailerEditRequestDetail } from '../types'

/**
 * Names for the ids a request carries. The detail read returns ids only
 * (`*_name` is null on `current_retailer`), so outlet types come from the
 * master and each beat from its own read. Anything that can't be resolved
 * (no permission, deleted) falls back to `#id` in the diff.
 */
export function useRetailerEditNames(
  detail: RetailerEditRequestDetail | undefined,
): RetailerEditNameResolvers {
  const outletTypes = useOutletTypes()

  const beforeBeat = detail?.currentRetailer?.beatId ?? null
  const afterBeat = detail?.payload.beatId ?? null
  const before = useBeat(beforeBeat != null ? String(beforeBeat) : undefined)
  const after = useBeat(
    afterBeat != null && afterBeat !== beforeBeat ? String(afterBeat) : undefined,
  )

  const beatNames = new Map<number, string>()
  if (beforeBeat != null && before.data) beatNames.set(beforeBeat, before.data.values.beatName)
  if (afterBeat != null && after.data) beatNames.set(afterBeat, after.data.values.beatName)

  return {
    outletType: (id) => outletTypes.data?.items.find((t) => t.id === id)?.name,
    beat: (id) => beatNames.get(id),
  }
}
