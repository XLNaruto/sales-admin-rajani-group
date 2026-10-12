import { Clock, MessageSquareText, Mic } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Hint } from '@/components/common/hint'
import { timeIST } from '@/features/daily-summary'
import { NO_ORDER_REASON_LABEL } from '../lib/daily-report-format'
import type { DailyReportRemark } from '../types'

function partyLabel(remark: DailyReportRemark): string {
  if (remark.partyName) return remark.partyName
  return `${remark.partyType === 'retailer' ? 'Retailer' : 'Distributor'} #${remark.partyId}`
}

/**
 * The window's visit remarks, in the order the server sends them (check-in
 * order). An audio note's `notes` is an S3 key, not text — it is never
 * rendered; a chip stands in for it until the admin API can sign it.
 */
export function RemarksList({ remarks }: { remarks: DailyReportRemark[] }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <header className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <MessageSquareText className="size-4 text-primary" />
        <h2 className="font-heading text-base font-semibold">Remarks</h2>
        {remarks.length ? (
          <span className="text-sm text-muted-foreground">({remarks.length})</span>
        ) : null}
      </header>

      {remarks.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No remarks in this report
        </p>
      ) : (
        <ol className="divide-y divide-border/40">
          {remarks.map((remark) => (
            <li key={remark.visitId} className="space-y-1.5 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{partyLabel(remark)}</span>
                <Badge variant={remark.partyType === 'retailer' ? 'default' : 'secondary'}>
                  {remark.partyType === 'retailer' ? 'Retailer' : 'Distributor'}
                </Badge>
                {remark.checkInAt ? (
                  <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                    <Clock className="size-3" />
                    {timeIST(remark.checkInAt)}
                  </span>
                ) : null}
              </div>

              {remark.description ? (
                <p className="text-sm text-foreground">{remark.description}</p>
              ) : null}

              {remark.notes && !remark.isNotesInAudio ? (
                <p className="text-sm whitespace-pre-line text-muted-foreground">{remark.notes}</p>
              ) : null}

              {remark.noOrderReason || remark.isNotesInAudio ? (
                <div className="flex flex-wrap items-center gap-2">
                  {remark.noOrderReason ? (
                    <Badge variant="destructive">
                      No order: {NO_ORDER_REASON_LABEL[remark.noOrderReason]}
                    </Badge>
                  ) : null}
                  {remark.isNotesInAudio ? (
                    <Hint label="Recorded as audio — playback isn't available in the admin panel yet">
                      <Badge variant="outline" className="cursor-default gap-1">
                        <Mic className="size-3" />
                        Audio note
                      </Badge>
                    </Hint>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
