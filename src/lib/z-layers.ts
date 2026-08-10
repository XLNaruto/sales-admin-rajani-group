/**
 * One place for the app's stacking order. Everything that portals to <body>
 * escapes its parent's stacking context, so the layers only stay predictable
 * while they all read their z-index from here.
 *
 *   popover (60)  page-level popovers/comboboxes — deliberately UNDER the topbar
 *   topbar  (70)
 *   sidebar (80/90) mobile drawer covers the topbar
 *   modal   (100) dialogs & sheets cover the whole shell
 *   popoverInModal (110) a popover opened inside a modal still has to clear it
 */
export const Z = {
  popover: 'z-60',
  topbar: 'z-70',
  sidebarBackdrop: 'z-80',
  sidebar: 'z-90',
  modal: 'z-100',
  popoverInModal: 'z-[110]',
  /** Tooltips are transient and never occlude anything — always on top. */
  tooltip: 'z-[120]',
} as const

/**
 * Which layer a body-portalled popover belongs on, decided by where its anchor
 * lives: inside a modal it has to sit above it, otherwise it stays below the
 * topbar.
 */
export function popoverZ(anchor: Element | null | undefined) {
  return anchor?.closest('[role="dialog"]') ? Z.popoverInModal : Z.popover
}
