/**
 * The month strip, brought up to date with what is **on screen** rather than
 * what was last saved.
 *
 * `month_strip` is the server's verdict on every date, derived at read time, and
 * it is the right thing to draw the calendar from. But both write surfaces live
 * on the same screen as the calendar, so between two saves it drifts from what
 * the admin is looking at:
 *
 * - He gives an `unscheduled` date a piece of work in the correction pass. The
 *   row grows the entry, and the label beside it still says nothing is on the
 *   date — while the "N / 30 dated" figure above it stays one short.
 * - He clears a `planned` date. The entries go, the label stays planned.
 * - He pins a date on an allocation bucket. Nothing below it moves at all, even
 *   though that pin IS a dated day of work the moment the allocation saves.
 *
 * So the label is recomputed from the same three sources the counts already use:
 * the schedule draft, the pins the plan already holds, and the pins in the
 * allocation draft.
 *
 * **History is never relabelled.** `worked`, `missed` and `holiday` are the
 * server's account of what happened — a visit landed, a date passed empty, the
 * date is a non-working day — and none of that is a thing a draft can change.
 * Only the pair the draft genuinely owns is touched: `planned` ⇄ `unscheduled`.
 *
 * Pure, so the rule is testable without a calendar in front of it.
 */
import type { MonthStripDay } from '../types'

/** A strip day plus why it differs from what the server said, when it does. */
export interface LiveStripDay extends MonthStripDay {
  /**
   * Unsaved work behind this date's label:
   *
   * - `'schedule'` — the correction pass put work on it, or took it off.
   * - `'pin'` — an allocation bucket pins it, and the pin has not been saved yet.
   *
   * `null` on every date whose label is the server's own. Drives the marker that
   * tells the admin which Save the date is waiting on.
   */
  pending: 'schedule' | 'pin' | null
}

/** The dates a label may move between. Everything else is history. */
const MUTABLE = new Set(['planned', 'unscheduled'])

export function liveStrip(
  strip: MonthStripDay[],
  /** The schedule draft — `date` → its entries. Pinned work is NOT in here. */
  draft: Map<string, { entries: { activityId: number }[] }>,
  /**
   * Dates the plan already holds a PINNED entry on. They are deliberately absent
   * from the draft (the server keeps them whatever is sent), so without this a
   * date carrying only pinned work would read as one the admin had emptied.
   */
  pinnedDates: Set<string>,
  /**
   * Dates pinned by the allocation draft on screen — saved or not. A pin is a
   * dated day of work, so the calendar shows it as one rather than waiting for
   * the allocation's own Save to tell it.
   *
   * It cuts **both** ways, and the second direction is the one that used to be
   * missing: a saved pin the admin has just taken off a bucket is still on the
   * plan, so reading `pinnedDates` alone left the date sitting there as planned
   * with nothing to say the day was on its way out. A pin the draft no longer
   * holds therefore stops holding its date here.
   */
  allocationDates: Set<string> = new Set(),
): LiveStripDay[] {
  return strip.map((day) => {
    if (!MUTABLE.has(day.label)) return { ...day, pending: null }

    // An activity-less row is a picker the admin has opened and not answered. It
    // is dropped on save, so it does not date the day here either.
    const drafted = (draft.get(day.date)?.entries ?? []).some(
      (entry) => entry.activityId > 0,
    )
    const allocated = allocationDates.has(day.date)
    // A pin only holds its date while the allocation on screen still pins it.
    const pinned = pinnedDates.has(day.date) && allocated
    /** The admin has taken a SAVED pin off this date — it goes on the next save. */
    const unpinned = pinnedDates.has(day.date) && !allocated
    const scheduled = drafted || pinned || allocated

    const label = scheduled ? 'planned' : 'unscheduled'
    if (label === day.label) {
      // The label agrees with the server, but the date can still be carrying an
      // unsaved pin — added onto a date he had already dated himself, or removed
      // from one that keeps its label because he has dated it too. Worth the
      // marker either way: it is the allocation's Save that commits it.
      const pinChange = unpinned || (allocated && !drafted && !pinnedDates.has(day.date))
      return { ...day, pending: pinChange ? 'pin' : null }
    }

    return {
      ...day,
      label,
      // A label that moved because a pin came off is the allocation's to commit,
      // whatever else the date carries.
      pending: unpinned || (allocated && !drafted) ? 'pin' : 'schedule',
    }
  })
}
