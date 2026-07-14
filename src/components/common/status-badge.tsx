import { Badge } from '@/components/ui/badge'

type Status = string

const MAP: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  online: 'success',
  paid: 'success',
  pending: 'warning',
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
  const variant = MAP[key] ?? 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}
