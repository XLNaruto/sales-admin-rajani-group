import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
}: {
  label: string
  value: string | number
  delta?: number
  icon?: LucideIcon
  hint?: string
}) {
  const positive = (delta ?? 0) >= 0
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <p className="mt-3 font-heading text-2xl font-semibold tracking-tight">
          {value}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center font-medium',
                positive ? 'text-success' : 'text-destructive',
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
