import { cn } from '@/lib/utils'
import { TRAIL_LEGEND } from '../lib/visit-kinds'
import { trailCount } from '../lib/live-day-metrics'
import type { LiveDayDetail, TrailFilter } from '../types'

/**
 * The map's legend, which is also its filter.
 *
 * One control instead of two: a legend that only explains colours makes you hunt
 * for the three OVC pins by eye. Every chip carries its count — the server's nine
 * `facets`, mapped 1:1 onto these nine chips — so a category the day has none of
 * reads as empty *before* it is clicked, and clicking it is still allowed, because
 * "show me the OVC calls, there are none" is a legitimate thing to confirm.
 */
export function TrailLegend({
  day,
  value,
  onChange,
}: {
  day: LiveDayDetail
  value: TrailFilter
  onChange: (filter: TrailFilter) => void
}) {
  return (
    <div role="tablist" aria-label="Trail markers" className="flex flex-wrap items-center gap-1.5">
      <Chip active={value === 'all'} onClick={() => onChange('all')}>
        All
      </Chip>

      {TRAIL_LEGEND.map((style) => {
        const count = trailCount(day, style.key)
        const active = value === style.key
        return (
          <Chip
            key={style.key}
            active={active}
            onClick={() => onChange(style.key)}
            muted={count === 0}
          >
            {/* Both hues go in as custom properties and the theme picks one: inline
                `style` can't answer a media query, and the light palette is tuned
                for map tiles, not for a dark chip. */}
            <style.icon
              aria-hidden="true"
              className={cn(
                'size-3.5 shrink-0',
                active ? 'text-current' : 'text-(--chip) dark:text-(--chip-dark)',
                style.shape === 'star' &&
                  (active ? 'fill-current' : 'fill-(--chip) dark:fill-(--chip-dark)'),
                count === 0 && 'opacity-60',
              )}
              style={
                {
                  '--chip': style.color,
                  '--chip-dark': style.darkColor,
                } as React.CSSProperties
              }
            />
            {style.label}
            <span className="font-mono text-[11px] tabular-nums opacity-70">{count}</span>
          </Chip>
        )
      })}
    </div>
  )
}

function Chip({
  active,
  muted = false,
  onClick,
  children,
}: {
  active: boolean
  muted?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground dark:border-white/15 dark:bg-primary/15 dark:text-primary'
          : 'border-border/70 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5',
        !active && muted && 'text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}
