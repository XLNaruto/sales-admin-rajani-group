import { X } from 'lucide-react'

/**
 * What the last edit did, in one line.
 *
 * The stat rail and issue list both move when a beat is removed; this says which
 * action caused it, so a recomputed coverage figure never looks like a glitch.
 */
export function PlanNotice({
  message,
  onDismiss,
}: {
  message: string
  /** Omitted for a standing notice — a plan's own state isn't dismissible. */
  onDismiss?: () => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-info/25 bg-info/10 px-4 py-3 text-sm text-foreground"
    >
      <p className="min-w-0 flex-1">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 grid size-5 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
