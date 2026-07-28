const HINT_DISMISS_EVENT = 'hint:dismiss'

/**
 * Force-closes every open `Hint` tooltip. Overlays (dialogs, comboboxes) call
 * this when they open: the pointer never leaves the trigger that opened them,
 * so the tooltip would otherwise stay floating above the overlay.
 */
export function dismissHints() {
  document.dispatchEvent(new Event(HINT_DISMISS_EVENT))
}

/** Subscribes to {@link dismissHints}. Returns the unsubscribe function. */
export function onDismissHints(handler: () => void) {
  document.addEventListener(HINT_DISMISS_EVENT, handler)
  return () => document.removeEventListener(HINT_DISMISS_EVENT, handler)
}
