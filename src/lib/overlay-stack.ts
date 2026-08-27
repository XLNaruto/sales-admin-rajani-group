/**
 * Which overlay owns the Escape key.
 *
 * `Dialog` and `Sheet` both listen for Escape on `document`, so an overlay that
 * opens *above* one of them — the attachment lightbox — would otherwise dismiss
 * itself and its host modal with a single press. An overlay claims the key while
 * it is up; the modals below only close when nothing has claimed it, so Escape
 * peels the stack one layer at a time.
 *
 * Release as soon as the top overlay *starts* closing, not when it finishes: a
 * fade-out still on screen must not swallow the next press.
 */
let claims = 0

/** Take ownership of Escape. Returns the (idempotent) release function. */
export function claimEscape() {
  claims += 1
  let released = false
  return () => {
    if (released) return
    released = true
    claims = Math.max(0, claims - 1)
  }
}

/** `true` while an overlay above the modals owns the Escape key. */
export function escapeClaimed() {
  return claims > 0
}
