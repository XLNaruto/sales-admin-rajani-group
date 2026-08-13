/**
 * Human labels for the "when did this last happen" columns. Kept out of the
 * components so the tag reports and the list report read dates the same way.
 */

const DAY_MS = 86_400_000

/** e.g. "12 Jun 2026" — the format the rest of the portal shows dates in. */
export function formatDate(iso?: string): string {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Age of an event in words ("Today", "4 days ago", "3 months ago"), or "Never"
 * when it hasn't happened — the distinction the tag rules turn on.
 */
export function timeSince(iso?: string, asOf: Date = new Date()): string {
  if (!iso) return 'Never'
  const days = Math.max(0, Math.floor((asOf.getTime() - new Date(iso).getTime()) / DAY_MS))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}
