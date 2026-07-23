import { ArrowLeft, Home, ShieldAlert } from 'lucide-react'
import { Link, useRouter } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ForbiddenProps {
  /** Big gradient headline. */
  title?: string
  /** Supporting line under the title. */
  description?: string
}

/**
 * Theme-aware 403 screen shown when the signed-in user lacks permission for a
 * page or action (an API call came back forbidden). Mirrors the 404 screen so
 * the two read as one family.
 */
export function Forbidden({
  title = 'Access denied',
  description = "You don't have permission to view this page. If you think this is a mistake, contact your administrator to request access.",
}: ForbiddenProps) {
  const router = useRouter()

  return (
    <div className="relative flex min-h-[calc(100vh-7rem)] items-center justify-center overflow-hidden rounded-2xl">
      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-xl px-6 text-center">
        {/* Shield badge with pulsing halo */}
        <div className="cs-rise mx-auto mb-8 grid size-24 place-items-center [animation-delay:.05s]">
          <div className="relative grid size-full place-items-center">
            <span className="absolute inset-0 animate-ping rounded-3xl bg-destructive/20 [animation-duration:2.4s]" />
            <span className="absolute inset-0 rounded-3xl bg-destructive/10" />
            <span className="cs-float grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-destructive to-rose-600 text-white shadow-lg shadow-destructive/30">
              <ShieldAlert className="size-9" />
            </span>
          </div>
        </div>

        {/* 403 code */}
        <div className="cs-rise mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur [animation-delay:.15s]">
          Error 403 · Forbidden
        </div>

        {/* Heading with animated gradient sweep */}
        <h1 className="cs-rise font-heading text-5xl font-bold tracking-tight sm:text-6xl [animation-delay:.25s]">
          <span className="cs-pan bg-gradient-to-r from-destructive via-rose-400 to-destructive bg-clip-text text-transparent">
            {title}
          </span>
        </h1>

        <p className="cs-rise mx-auto mt-4 max-w-md text-balance text-sm leading-relaxed text-muted-foreground sm:text-base [animation-delay:.35s]">
          {description}
        </p>

        {/* Actions */}
        <div className="cs-rise mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:.45s]">
          <button
            type="button"
            onClick={() => router.history.back()}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <ArrowLeft className="size-4" />
            Go back
          </button>
          <Link to="/dashboard" className={cn(buttonVariants({ variant: 'default' }))}>
            <Home className="size-4" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
