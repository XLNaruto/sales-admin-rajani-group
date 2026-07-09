import { asset } from '@/lib/asset'
import { Outlet } from '@tanstack/react-router'
import { MapPin, Route, ShieldCheck, Users } from 'lucide-react'

const FEATURES = [
  { Icon: Route, label: 'Beat & tour planning' },
  { Icon: MapPin, label: 'Live GPS tracking' },
  { Icon: Users, label: 'Distributor network' },
  { Icon: ShieldCheck, label: 'Approvals & TA/DA' },
]

export function AuthLayout() {
  return (
    <div className="relative grid min-h-screen overflow-hidden bg-background lg:grid-cols-2">
      {/* ============================================================= */}
      {/* Full-screen background image — theme-aware (lg and up only)     */}
      {/* ============================================================= */}
      {/* Light-mode image */}
      <div
        className="pointer-events-none absolute inset-0 hidden bg-cover bg-center lg:block dark:lg:hidden"
        style={{ backgroundImage: `url('${asset('media/auth/bg-auth-light.png')}')` }}
      />
      {/* Dark-mode image */}
      <div
        className="pointer-events-none absolute inset-0 hidden bg-cover bg-center dark:lg:block"
        style={{ backgroundImage: `url('${asset('media/auth/bg-auth-dark.png')}')` }}
      />
      {/* Gradient scrim — strong fade on the left (behind the marketing text)
          that clears by the middle so the image stays crisp; a little on the
          right for the card. Dark mode darkens more overall for legibility. */}
      <div className="pointer-events-none absolute inset-0 hidden bg-linear-to-r from-background/90 via-background/10 to-background/40 lg:block dark:from-background/90 dark:via-background/45 dark:to-background/95" />
      <div className="animate-auth-float-sl pointer-events-none absolute -left-24 top-1/3 hidden h-72 w-72 rounded-full bg-primary/20 blur-[100px] lg:block" />

      {/* ============================================================= */}
      {/* Brand / marketing panel                                        */}
      {/* ============================================================= */}
      <div className="relative hidden p-8 text-foreground lg:flex lg:flex-col lg:p-12 lg:pb-28">
        {/* Brand */}
        <div className="animate-auth-rise relative flex items-center">
          <img
            src={asset('media/logos/logo.png')}
            alt="Rajani Group"
            className="h-20 w-auto object-contain drop-shadow-lg dark:hidden"
          />
          <img
            src={asset('media/logos/logo-dark.png')}
            alt="Rajani Group"
            className="hidden h-20 w-auto object-contain drop-shadow-lg dark:block"
          />
        </div>

        {/* Headline + feature chips.
            NOTE: no transform/opacity animation on this block or the chips
            container — that flattens the chips' backdrop and kills their blur.
            Entrance animations live on the individual h2/p (siblings, not
            ancestors of the chips). */}
        <div className="relative flex flex-1 flex-col justify-center">
          <h2 className="animate-auth-rise font-heading text-4xl font-bold leading-[1.1] drop-shadow-md lg:text-5xl">
            Field sales,
            <br />
            under one roof.
          </h2>
          <p
            className="animate-auth-rise mt-4 max-w-lg text-base leading-relaxed text-foreground/70 drop-shadow"
            style={{ animationDelay: '.15s' }}
          >
            Distributors, beats, tours, GPS tracking, TA/DA and approvals —
            monitored in real time across every zone.
          </p>

          {/* Feature chips */}
          <div className="mt-8 flex flex-wrap gap-2.5">
            {FEATURES.map(({ Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-xl border border-foreground/15 bg-foreground/5 px-3 py-2 text-xs font-medium backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-foreground/10"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* ============================================================= */}
      {/* Form panel                                                     */}
      {/* ============================================================= */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="relative w-full max-w-md">
          {/* Card — dark glassmorphism.
              NOTE: do NOT put transform/filter/opacity animations on this card
              or any ancestor above it — that flattens the backdrop and kills
              the backdrop-blur (the glass would show the sharp image through). */}
          <div className="rounded-2xl border border-foreground/10 bg-card/60 bg-linear-to-b from-white/10 to-transparent p-7 shadow-2xl shadow-black/25 ring-1 ring-foreground/5 backdrop-blur-3xl sm:p-9 dark:from-white/10 dark:shadow-black/40">
            {/* Brand inside card (left panel hidden on small screens) */}
            <div className="mb-7 flex items-center justify-center lg:hidden">
              <img
                src={asset('media/logos/logo.png')}
                alt="Rajani Group"
                className="h-16 w-auto object-contain dark:hidden"
              />
              <img
                src={asset('media/logos/logo-dark.png')}
                alt="Rajani Group"
                className="hidden h-16 w-auto object-contain dark:block"
              />
            </div>

            <Outlet />
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* Full-width footer                                              */}
      {/* ============================================================= */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 py-5 sm:px-10 lg:px-12">
        <div className="pointer-events-auto flex w-full flex-col items-center justify-between gap-2 text-sm font-medium text-muted-foreground sm:flex-row">
          <p>
            <span className="text-[22px]">©</span> {new Date().getFullYear()}{' '}
            <span className="font-semibold text-foreground">Rajani Group</span>.
            All Rights Reserved.
          </p>
          <a
            href="https://www.xpertlab.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
          >
            <span className="text-foreground">Designed &amp; Developed By</span>
            <img
              alt="XpertLab"
              className="h-6 w-auto object-contain"
              src={asset('media/logos/xpertlab-logo.webp')}
            />
          </a>
        </div>
      </div>

      {/* Invisible reCAPTCHA host for Firebase Phone Auth. Lives on the shared
          layout so it survives navigation between the mobile and OTP steps,
          letting "Resend code" reuse the same verifier. Absolutely positioned
          so it stays out of the grid flow and doesn't affect column layout. */}
      <div id="recaptcha-container" className="pointer-events-none absolute" />
    </div>
  )
}
