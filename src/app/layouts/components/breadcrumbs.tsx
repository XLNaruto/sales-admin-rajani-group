import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { crumbTarget } from '@/config/navigation'

/** Derives a clickable breadcrumb trail from the current pathname. */
export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const parts = pathname.split('/').filter(Boolean)

  const label = (p: string) =>
    p.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to="/dashboard" className="transition-colors hover:text-foreground">
        Home
      </Link>
      {parts.map((p, i) => {
        const path = '/' + parts.slice(0, i + 1).join('/')
        const isLast = i === parts.length - 1
        // A section like `/journey` has no page of its own, so its crumb links to
        // the section's landing screen — and stays plain text if there isn't one.
        const to = isLast ? undefined : crumbTarget(path)
        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            {to ? (
              <Link
                to={to}
                className="transition-colors hover:text-foreground"
              >
                {label(p)}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{label(p)}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
