import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

export interface PanCanvasHandle {
  /** Re-center the target node (the tree's root) in the viewport. */
  center: () => void
}

interface PanCanvasProps {
  /** Current zoom scale (1 = 100%). */
  zoom: number
  /** Ctrl/⌘ + wheel zoom step (+1 to zoom in, -1 to zoom out). */
  onZoomDelta?: (delta: number) => void
  /** CSS selector for the node to center on (defaults to the hierarchy root). */
  centerSelector?: string
  className?: string
  children: ReactNode
}

/**
 * Figma-style infinite pan/zoom surface. The content is positioned with a CSS
 * transform (translate + scale), so it can be dragged freely in any direction
 * with no scroll bounds. Drag the background to pan; Ctrl/⌘ + wheel zooms;
 * plain wheel / trackpad pans. Clicks on buttons / links / `[data-nopan]` are
 * left alone so the node actions stay usable.
 */
export const PanCanvas = forwardRef<PanCanvasHandle, PanCanvasProps>(function PanCanvas(
  { zoom, onZoomDelta, centerSelector = '[data-hierarchy-root]', className, children },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  // Mirror pan in a ref so the native wheel listener reads the latest value
  // without being re-bound on every pan update.
  const panRef = useRef(pan)
  panRef.current = pan
  // Mirror zoom too, so `center()` computes against the current scale without
  // being re-created on every zoom change.
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const [panning, setPanning] = useState(false)

  // Re-center the target node. We derive the target's position from its layout
  // offsets (`offsetLeft`/`offsetTop`), which ignore the CSS transform — so the
  // pan is computed exactly even while a previous pan/zoom is still mid-
  // transition. (Measuring the live `getBoundingClientRect()` instead read an
  // in-flight position, which is why re-centering used to need a second click.)
  const center = useCallback(() => {
    const cont = containerRef.current
    // Bail while the container has no measurable width yet (e.g. mid-mount on a
    // refresh) — centering now would divide against a stale size and land the
    // tree off to the left. The ResizeObserver below re-runs us once it's sized.
    if (!cont || !cont.clientWidth) return
    const content = cont.firstElementChild as HTMLElement | null
    const target = cont.querySelector(centerSelector) as HTMLElement | null
    if (!content || !target) return
    const z = zoomRef.current
    // Centre the whole tree's box horizontally (so a wide child row stays
    // centred, not just the root), and anchor the root near the top — org charts
    // grow downward, so we sit it 72px below the viewport's top edge. Both use
    // layout offsets, unaffected by the CSS transform.
    setPan({
      x: cont.clientWidth / 2 - z * (content.offsetWidth / 2),
      y: 72 - z * target.offsetTop,
    })
  }, [centerSelector])
  useImperativeHandle(ref, () => ({ center }), [center])

  // Auto-center on first mount, once the container is actually sized. On a hard
  // refresh the container's width isn't final on the first frame, so a rAF-timed
  // center measured a zero/partial width and left the tree stuck to the left.
  // A one-shot ResizeObserver centers exactly when a real size is available.
  const didInit = useRef(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const tryCenter = () => {
      if (didInit.current || !el.clientWidth || !el.querySelector(centerSelector)) return
      didInit.current = true
      center()
    }
    tryCenter()
    const ro = new ResizeObserver(tryCenter)
    ro.observe(el)
    return () => ro.disconnect()
  }, [center, centerSelector])

  // Ctrl/⌘ + wheel → zoom; plain wheel / trackpad → pan. Registered natively as
  // non-passive so preventDefault() actually stops the page from scrolling.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (!onZoomDelta) return
        e.preventDefault()
        onZoomDelta(e.deltaY < 0 ? 1 : -1)
        return
      }
      e.preventDefault()
      const p = panRef.current
      setPan({ x: p.x - e.deltaX, y: p.y - e.deltaY })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoomDelta])

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, [role="listbox"], [data-nopan]'))
      return
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    setPanning(true)
  }
  const onMouseMove = (e: React.MouseEvent) => {
    const d = drag.current
    if (!d) return
    setPan({ x: d.panX + (e.clientX - d.x), y: d.panY + (e.clientY - d.y) })
  }
  const stop = () => {
    drag.current = null
    setPanning(false)
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stop}
      onMouseLeave={stop}
      className={cn(
        'relative select-none overflow-hidden',
        panning ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
    >
      <div
        className="absolute left-0 top-0 w-max will-change-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: panning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
})
