import { CheckCircle2, FileEdit, Inbox, Send, type LucideIcon } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import {
  PLAN_STATUS_HINT,
  PLAN_STATUS_LABEL,
  PLAN_STATUS_TONE,
} from '../lib/plan-status'
import type { PlanStatus } from '../types'

/**
 * An icon per state, so the chain is readable at a glance rather than only by
 * colour: `draft` is a pen, `published` is outbound to the sales incharge, `submitted` is
 * inbound to the admin, `approved` is done.
 */
const ICON: Record<PlanStatus, LucideIcon> = {
  draft: FileEdit,
  published: Send,
  submitted: Inbox,
  approved: CheckCircle2,
}

/**
 * Where a plan sits in the chain, as a chip that carries its own explanation.
 *
 * The hint is not decoration: `draft` means **the sales incharge cannot see the month at
 * all**, and that is not guessable from the word. `submitted` is the only state
 * waiting on the admin, so it is the one that reads loud.
 */
export function StatusChip({
  status,
  size = 'sm',
  className,
}: {
  status: PlanStatus
  size?: 'sm' | 'lg'
  className?: string
}) {
  const Icon = ICON[status]

  return (
    <Hint label={PLAN_STATUS_HINT[status]}>
      <span
        className={cn(
          'inline-flex cursor-default items-center gap-1.5 rounded-full font-semibold',
          size === 'lg' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]',
          PLAN_STATUS_TONE[status],
          className,
        )}
      >
        <Icon className={size === 'lg' ? 'size-3.5' : 'size-3'} />
        {PLAN_STATUS_LABEL[status]}
      </span>
    </Hint>
  )
}
