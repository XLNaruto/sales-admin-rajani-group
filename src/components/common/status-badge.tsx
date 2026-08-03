import { Badge } from '@/components/ui/badge'

type Status = string

const MAP: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  online: 'success',
  paid: 'success',
  pending: 'warning',
  'pending-approval': 'warning',
  'sent-back': 'destructive',
  'in-progress': 'warning',
  'in-review': 'warning',
  scheduled: 'default',
  invited: 'warning',
  suspended: 'destructive',
  draft: 'secondary',
  inactive: 'secondary',
  offline: 'secondary',
  rejected: 'destructive',
  overdue: 'destructive',
  suspicious: 'destructive',
  flagged: 'destructive',
}

/** Maps a domain status string to a coloured badge. */
export function StatusBadge({ status }: { status: Status }) {
  const key = status.toLowerCase().replace(/\s+/g, '-')
  // Fall back to the leading word so phrasings like "approved on 12 Jul" still colour.
  const variant = MAP[key] ?? MAP[key.split('-')[0]] ?? 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}
