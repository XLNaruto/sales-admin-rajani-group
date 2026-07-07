import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

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
        const to = '/' + parts.slice(0, i + 1).join('/')
        const isLast = i === parts.length - 1
        return (
          <span key={to} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">{label(p)}</span>
            ) : (
              <Link
                to={to}
                className="transition-colors hover:text-foreground"
              >
                {label(p)}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
