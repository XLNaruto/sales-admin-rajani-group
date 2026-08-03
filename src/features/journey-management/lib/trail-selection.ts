/**
 * Selection ids for the two markers that aren't calls.
 *
 * The timeline and the map are linked by one `selectedId`, which is otherwise a
 * `DayVisit.id`. Punch-in and punch-out are rows in the same list and pins on the
 * same map, so they ride the same channel under reserved ids rather than a second
 * piece of state that would have to be kept mutually exclusive with this one.
 * Double-underscored so they can never collide with a real visit id.
 */
export const TRAIL_START_ID = '__day-start__'
export const TRAIL_END_ID = '__day-end__'

/** True for either punch marker — i.e. a selection that is not a call. */
export function isTrailEndId(id: string | null): boolean {
  return id === TRAIL_START_ID || id === TRAIL_END_ID
}
