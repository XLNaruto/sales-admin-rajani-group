import { Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/common/status-badge'
import type { ApprovalItem } from '../types'

const TYPE_LABEL: Record<ApprovalItem['type'], string> = {
  leave: 'Leave',
  tour: 'Tour',
  expense: 'Expense',
  attendance: 'Attendance',
}

export function ApprovalCard({
  item,
  onApprove,
  onReject,
  isBusy,
}: {
  item: ApprovalItem
  onApprove: (item: ApprovalItem) => void
  onReject: (item: ApprovalItem) => void
  isBusy: boolean
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <Avatar name={item.requester} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{item.requester}</span>
            <Badge variant="outline">{TYPE_LABEL[item.type]}</Badge>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{item.summary}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Submitted {item.submittedOn}</p>
        </div>
        {item.status === 'pending' && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => onApprove(item)} disabled={isBusy}>
              <Check /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(item)}
              disabled={isBusy}
            >
              <X /> Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
