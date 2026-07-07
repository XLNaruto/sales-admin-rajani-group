import { Sparkles, TrendingUp, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAiAnalytics } from '../api/use-dashboard'
import type { AiInsight } from '../types'

const ICON = {
  positive: TrendingUp,
  warning: AlertTriangle,
  neutral: Info,
} as const

const TONE = {
  positive: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/12',
  neutral: 'text-primary bg-primary/10',
} as const

export function AiInsights() {
  const { data, isLoading } = useAiAnalytics()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> AI Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          : data?.map((insight: AiInsight) => {
              const Icon = ICON[insight.tone]
              return (
                <div key={insight.id} className="flex gap-3 rounded-lg border p-3">
                  <span className={`h-fit rounded-md p-1.5 ${TONE[insight.tone]}`}>
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.detail}</p>
                  </div>
                </div>
              )
            })}
      </CardContent>
    </Card>
  )
}
