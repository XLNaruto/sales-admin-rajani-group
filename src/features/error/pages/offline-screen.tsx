import { RefreshCw, WifiOff } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OfflineScreenProps {
  /** Big gradient headline. */
  title?: string
  /** Supporting line under the title. */
  description?: string
}

/**
 * Theme-aware full-screen overlay shown whenever the browser loses network
 * connectivity. Rendered globally from the root and dismissed automatically
 * once the connection is restored (see `useOnlineStatus`).
 */
export function OfflineScreen({
  title = 'Connection lost',
  description = "You're offline. Check your internet connection — this page will refresh automatically once you're back online.",
}: OfflineScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background">
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
        {/* WifiOff badge with pulsing halo */}
        <div className="cs-rise mx-auto mb-8 grid size-24 place-items-center [animation-delay:.05s]">
          <div className="relative grid size-full place-items-center">
            <span className="absolute inset-0 animate-ping rounded-3xl bg-destructive/20 [animation-duration:2.4s]" />
            <span className="absolute inset-0 rounded-3xl bg-destructive/10" />
            <span className="cs-float grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-destructive/30">
              <WifiOff className="size-9" />
            </span>
          </div>
        </div>

        {/* Status pill */}
        <div className="cs-rise mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur [animation-delay:.15s]">
          No internet connection
        </div>

        {/* Heading with animated gradient sweep */}
        <h1 className="cs-rise font-heading text-5xl font-bold tracking-tight sm:text-6xl [animation-delay:.25s]">
          <span className="cs-pan bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 bg-clip-text text-transparent">
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
            onClick={() => window.location.reload()}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            <RefreshCw className="size-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}
