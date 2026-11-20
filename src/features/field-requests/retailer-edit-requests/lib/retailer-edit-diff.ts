import type { RetailerEditFields, RetailerEditOwner } from '../types'

/** One compared field, already formatted for display. */
export interface RetailerEditDiffRow {
  key: string
  label: string
  /** The outlet's value now; null renders as a dash. */
  before: string | null
  /** The value after approval; null renders as a dash (i.e. cleared). */
  after: string | null
  changed: boolean
  /** A short explanation shown under the proposed value. */
  note?: string
}

/** Lookups for the fields the API sends only as ids. */
export interface RetailerEditNameResolvers {
  outletType: (id: number) => string | undefined
  beat: (id: number) => string | undefined
}

const blank = (v: string | null | undefined) => (v == null || v.trim() === '' ? null : v.trim())

function idLabel(id: number | null | undefined, resolve?: (id: number) => string | undefined) {
  if (id == null) return null
  return resolve?.(id) ?? `#${id}`
}

function location(f: RetailerEditFields) {
  const lat = blank(f.latitude)
  const lng = blank(f.longitude)
  return lat && lng ? `${lat}, ${lng}` : null
}

/**
 * Line the proposed payload up against the outlet as it is now, one row per
 * field. The payload is a full replace, so a field it leaves out is shown as
 * cleared — except the beat, which stays when the key is missing.
 *
 * Rows that are empty on both sides are dropped (nothing to compare).
 */
export function buildRetailerEditDiff(
  current: RetailerEditFields | null,
  proposed: RetailerEditFields,
  names: RetailerEditNameResolvers,
): RetailerEditDiffRow[] {
  const row = (
    key: string,
    label: string,
    pick: (f: RetailerEditFields) => string | null,
  ): RetailerEditDiffRow => {
    const before = current ? pick(current) : null
    const after = pick(proposed)
    return { key, label, before, after, changed: before !== after }
  }

  const rows: RetailerEditDiffRow[] = [
    row('shopName', 'Shop name', (f) => blank(f.shopName)),
    row('outletType', 'Outlet type', (f) => idLabel(f.outletTypeId, names.outletType)),
    row('addressLine', 'Address line', (f) => blank(f.addressLine)),
    row('address', 'Address', (f) => blank(f.address)),
    row('formattedAddress', 'Formatted address', (f) => blank(f.formattedAddress)),
    row('landmark', 'Landmark', (f) => blank(f.landmark)),
    row('market', 'Market', (f) => blank(f.market)),
    row('pincode', 'Pincode', (f) => blank(f.pincode)),
    row('location', 'Location (lat, lng)', location),
    // Geography arrives as ids only (`*_name` is null on this read).
    row('state', 'State', (f) => idLabel(f.stateId)),
    row('zone', 'Zone', (f) => idLabel(f.zoneId)),
    row('district', 'District', (f) => idLabel(f.districtId)),
    row('taluka', 'Taluka', (f) => idLabel(f.talukaId)),
    row('city', 'City', (f) => idLabel(f.cityId)),
  ]

  // The beat is the one field where a missing key means "keep".
  const beatBefore = current ? idLabel(current.beatId, names.beat) : null
  if (proposed.beatId === undefined) {
    rows.push({
      key: 'beat',
      label: 'Beat',
      before: beatBefore,
      after: beatBefore,
      changed: false,
      note: 'Not sent — stays as it is',
    })
  } else {
    const beatAfter = idLabel(proposed.beatId, names.beat)
    rows.push({
      key: 'beat',
      label: 'Beat',
      before: beatBefore,
      after: beatAfter,
      changed: beatBefore !== beatAfter,
      note: proposed.beatId === null && beatBefore ? 'Will be unassigned' : undefined,
    })
  }

  return rows.filter((r) => r.before !== null || r.after !== null)
}

/** True when the two owner lists differ in any field or order. */
export function ownersChanged(
  before: RetailerEditOwner[],
  after: RetailerEditOwner[],
): boolean {
  const norm = (list: RetailerEditOwner[]) =>
    JSON.stringify(
      list.map((o) => [
        blank(o.name),
        blank(o.mobile),
        blank(o.alternateMobile),
        blank(o.birthDate),
        blank(o.marriageAnniversary),
      ]),
    )
  return norm(before) !== norm(after)
}

/** How many fields (incl. owners and photo) the request would change. */
export function countChanges(
  rows: RetailerEditDiffRow[],
  current: RetailerEditFields | null,
  proposed: RetailerEditFields,
): number {
  let n = rows.filter((r) => r.changed).length
  if (ownersChanged(current?.owners ?? [], proposed.owners)) n += 1
  if (blank(current?.shopPhotoPath) !== blank(proposed.shopPhotoPath)) n += 1
  return n
}
