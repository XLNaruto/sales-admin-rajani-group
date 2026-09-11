/**
 * Taking the admin to the field that stopped a save.
 *
 * The plan screen refuses a save in one place — the submit handler — and the
 * field that caused it can be anywhere: inside a capped scroller in the
 * allocation panel, or thirty rows down a month of calendar. A toast that says
 * "one row names no distributor" is then a search task rather than an
 * instruction, which is what this exists to remove.
 *
 * A DOM attribute rather than a ref register, because the offending control is
 * rendered by three different components (a count box, a combobox, a picker
 * trigger) and none of them share a props interface. Marking the host element is
 * the one thing all three can do; `querySelector` then reads them in DOCUMENT
 * order, so "the first invalid field" is the first one on screen.
 */

/** Put this on the element wrapping a control the save is refusing over. */
export const INVALID_FIELD_ATTR = 'data-invalid-field'

/**
 * Put this on an editor's root, naming it.
 *
 * Both editors are on one screen and each has its own Save, so an unscoped
 * search would answer the schedule's refusal by scrolling the admin up into the
 * allocation's fields. A save only ever looks inside its own editor.
 */
export const INVALID_SCOPE_ATTR = 'data-invalid-scope'

const FOCUSABLE = 'input,select,textarea,button,[tabindex]:not([tabindex="-1"])'

/**
 * Scroll the first refused field into view and focus it.
 *
 * Focus is deferred a tick and takes `preventScroll`: the scroll is already in
 * flight, and letting focus scroll as well lands the field at the very edge of
 * the viewport instead of the middle of it.
 */
export function focusFirstInvalidField(scope?: string): void {
  const root = scope
    ? (document.querySelector<HTMLElement>(`[${INVALID_SCOPE_ATTR}="${scope}"]`) ??
      document)
    : document
  const host = root.querySelector<HTMLElement>(`[${INVALID_FIELD_ATTR}]`)
  if (!host) return

  const target = host.matches(FOCUSABLE)
    ? host
    : (host.querySelector<HTMLElement>(FOCUSABLE) ?? host)

  target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  window.setTimeout(() => target.focus({ preventScroll: true }), 0)
}
