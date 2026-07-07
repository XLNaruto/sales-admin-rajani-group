import { Cake, Gift, PartyPopper } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Greeting, GreetingCategory } from '../types'

const CATEGORY_ICON: Record<GreetingCategory, LucideIcon> = {
  birthday: Cake,
  anniversary: Gift,
  festival: PartyPopper,
}

export function GreetingCard({ greeting }: { greeting: Greeting }) {
  const Icon = CATEGORY_ICON[greeting.category]
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium">{greeting.recipient}</p>
            <Badge variant="outline">{greeting.category}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{greeting.occasion}</p>
          <p className="mt-1 text-xs text-muted-foreground">{greeting.date}</p>
        </div>
      </CardContent>
    </Card>
  )
}
