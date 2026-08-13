import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { popoverZ } from '@/lib/z-layers'

/** Gap between the trigger and the panel, in px. */
const GAP = 4
/** Keep the panel this far off the viewport edges, in px. */
const VIEWPORT_PADDING = 8
/** Assumed panel height when deciding whether to open upward, in px. */
const DEFAULT_HEIGHT = 300

interface PanelCoords {
  left: number
  top: number
  /** Resolved panel width — the `width` prop, or the trigger's own. */
  width: number
  /** True when the panel is anchored by its bottom edge (opens upward). */
  dropUp: boolean
}

/**
 * Click-to-open panel anchored to a trigger. Closes on outside-click or Escape.
 *
 * The panel is **portalled to `document.body` with fixed positioning**, which is
 * the whole point of the component: an absolutely-positioned popover is clipped by
 * any `overflow-hidden`/`overflow-auto` ancestor, and the places that want one —
 * a row inside a scrolling list, a field inside a dialog — are exactly the places
 * that have such an ancestor. `<Combobox>` solves the same problem the same way;
 * this is that mechanism without the list of options attached to it.
 *
 * Zero-dependency, matching the rest of `components/ui`.
 */
export function Popover({
  trigger,
  children,
  align = 'start',
  width,
  height = DEFAULT_HEIGHT,
  disabled = false,
  onOpenChange,
  className,
  wrapClassName,
}: {
  /** Rendered as-is and wrapped in the click target. */
  trigger: ReactNode
  /** Panel contents. Only mounted while open. */
  children: ReactNode
  /** Which trigger edge the panel lines up with. */
  align?: 'start' | 'end' | 'center'
  /** Panel width in px. Defaults to the trigger's own width. */
  width?: number
  /** Rough panel height — only used to decide whether to open upward. */
  height?: number
  disabled?: boolean
  /** Told about every open/close, for a caller that mirrors the state. */
  onOpenChange?: (open: boolean) => void
  /** Extra classes on the panel. */
  className?: string
  /**
   * Classes on the element the panel is measured against — use it to make the
   * wrapper hug or fill its slot. It must stay a real box: `display: contents`
   * generates none, so `getBoundingClientRect` would read all zeros and the panel
   * would land in the corner of the screen.
   */
  wrapClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Held in a ref so `setOpenState` is stable: the effects below depend on it,
  // and a caller passing an inline `onOpenChange` would otherwise rebind the
  // document listeners on every render.
  const notify = useRef(onOpenChange)
  notify.current = onOpenChange

  const setOpenState = useCallback((next: boolean) => {
    setOpen(next)
    notify.current?.(next)
  }, [])

  // Position against the trigger in fixed/viewport coordinates so the panel
  // escapes any clipping ancestor. Recomputed on scroll and resize — `true` on
  // the scroll listener catches scrolling *inside* an ancestor, not just the page.
  useLayoutEffect(() => {
    if (!open) return

    const reposition = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropUp = spaceBelow < height && rect.top > spaceBelow
      const panelWidth = width ?? rect.width
      let left = rect.left
      if (align === 'end') left = rect.right - panelWidth
      else if (align === 'center') left = rect.left + rect.width / 2 - panelWidth / 2
      const maxLeft = window.innerWidth - panelWidth - VIEWPORT_PADDING
      left = Math.min(
        Math.max(VIEWPORT_PADDING, left),
        Math.max(VIEWPORT_PADDING, maxLeft),
      )
      setCoords({
        left,
        top: dropUp ? rect.top - GAP : rect.bottom + GAP,
        width: panelWidth,
        dropUp,
      })
    }

    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, align, width, height])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      // The panel counts as inside: clicking a date must not close the calendar.
      if (wrapRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpenState(false)
    }
    const onKey = (e: KeyboardEvent) => {
      // Stopped, or Escape would close the dialog this popover is sitting in.
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpenState(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, setOpenState])

  // A trigger that goes disabled while open must close, not leave an orphan
  // panel behind.
  useEffect(() => {
    if (disabled && open) setOpenState(false)
  }, [disabled, open, setOpenState])

  return (
    <div
      ref={wrapRef}
      className={cn('inline-flex', wrapClassName)}
      onClick={() => {
        if (!disabled) setOpenState(!open)
      }}
    >
      {trigger}

      {open && !disabled && coords
        ? createPortal(
            <div
              ref={panelRef}
              // A portal still bubbles its events up the REACT tree, so without
              // this every click inside the panel reaches the trigger's toggle
              // below and shuts the panel — picking a date would close the
              // calendar on the first click.
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: coords.left,
                top: coords.dropUp ? undefined : coords.top,
                bottom: coords.dropUp ? window.innerHeight - coords.top : undefined,
                width: coords.width,
              }}
              className={cn(
                'rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg',
                popoverZ(wrapRef.current),
                className,
              )}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
