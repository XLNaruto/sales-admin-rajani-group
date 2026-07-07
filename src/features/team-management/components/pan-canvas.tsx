import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Grab-to-pan scroll container. Dragging the background pans the (overflowing)
 * content; native wheel/trackpad scrolling still works. Clicks on interactive
 * controls (buttons, links, inputs, or anything marked `data-nopan`) are left
 * alone so the tree's actions stay usable.
 *
 * When `onZoomDelta` is provided, Ctrl/⌘ + wheel zooms instead of scrolling
 * (delta is +1 to zoom in, -1 to zoom out).
 */
export function PanCanvas({
  className,
  onZoomDelta,
  children,
}: {
  className?: string
  onZoomDelta?: (delta: number) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const origin = useRef({ x: 0, y: 0, left: 0, top: 0 })
  const [panning, setPanning] = useState(false)

  // Ctrl/⌘ + wheel → zoom. Needs a non-passive listener to preventDefault.
  useEffect(() => {
    const el = ref.current
    if (!el || !onZoomDelta) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      onZoomDelta(e.deltaY < 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoomDelta])

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, [role="listbox"], [data-nopan]'))
      return
    const el = ref.current
    if (!el) return
    origin.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
    setPanning(true)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!panning) return
    const el = ref.current
    if (!el) return
    el.scrollLeft = origin.current.left - (e.clientX - origin.current.x)
    el.scrollTop = origin.current.top - (e.clientY - origin.current.y)
  }

  const stop = () => setPanning(false)

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stop}
      onMouseLeave={stop}
      className={cn('pan-canvas select-none overflow-auto', panning && 'is-panning', className)}
    >
      {children}
    </div>
  )
}
