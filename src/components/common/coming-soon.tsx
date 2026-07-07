import { Rocket, Sparkles } from 'lucide-react'

interface ComingSoonProps {
  /** Big gradient headline. */
  title?: string
  /** Supporting line under the title. */
  description?: string
  /** Small pill text above the title. */
  eyebrow?: string
}

/** Animated, theme-aware placeholder for modules that aren't built yet. */
export function ComingSoon({
  title = 'Coming Soon',
  description = 'This module is being crafted and will be available here shortly.',
  eyebrow = 'Something great is on the way',
}: ComingSoonProps) {
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
        {/* Rocket badge with pulsing halo */}
        <div className="cs-rise mx-auto mb-8 grid size-24 place-items-center [animation-delay:.05s]">
          <div className="relative grid size-full place-items-center">
            <span className="absolute inset-0 animate-ping rounded-3xl bg-primary/20 [animation-duration:2.4s]" />
            <span className="absolute inset-0 rounded-3xl bg-primary/10" />
            <span className="cs-float grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/30">
              <Rocket className="size-9" />
            </span>
          </div>
        </div>

        {/* Eyebrow */}
        <div className="cs-rise mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur [animation-delay:.15s]">
          <Sparkles className="size-3.5 text-primary" />
          {eyebrow}
        </div>

        {/* Heading with animated gradient sweep */}
        <h1 className="cs-rise font-heading text-5xl font-bold tracking-tight sm:text-6xl [animation-delay:.25s]">
          <span className="cs-pan bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
            {title}
          </span>
        </h1>

        <p className="cs-rise mx-auto mt-4 max-w-md text-balance text-sm leading-relaxed text-muted-foreground sm:text-base [animation-delay:.35s]">
          {description}
        </p>

        {/* Shimmering progress bar */}
        <div className="cs-rise mx-auto mt-8 h-2 w-64 overflow-hidden rounded-full bg-muted [animation-delay:.45s]">
          <div className="relative h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-primary-hover">
            <span className="cs-shimmer absolute inset-y-0 left-0 w-1/3 bg-white/40 blur-[2px]" />
          </div>
        </div>

        {/* Working dots */}
        <div className="cs-rise mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground [animation-delay:.55s]">
          <span>Building</span>
          <span className="cs-dot size-1.5 rounded-full bg-primary" />
          <span className="cs-dot size-1.5 rounded-full bg-primary [animation-delay:.2s]" />
          <span className="cs-dot size-1.5 rounded-full bg-primary [animation-delay:.4s]" />
        </div>
      </div>
    </div>
  )
}
