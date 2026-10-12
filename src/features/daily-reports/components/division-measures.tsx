import { Building2 } from 'lucide-react'
import { measureRows } from '../lib/daily-report-format'
import type { DailyReportDivision } from '../types'

const HEAD =
  'px-3 py-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'
/** Figure columns: fixed width, one line, so the measure name takes the slack. */
const FIGURE_HEAD = `${HEAD} w-44 text-right`
const FIGURE = 'w-44 whitespace-nowrap px-3 py-2.5 text-right tabular-nums'

/**
 * One division's Target / Retailing / Order to Company in every unit it
 * reports in. Divisions differ — tea sells by the kg, agarbatti by the rupee
 * and the pack — so every measure the backend sends gets a row, with Kg and
 * Pieces dropped only when they are zero across the board.
 */
export function DivisionMeasures({ division }: { division: DailyReportDivision }) {
  const rows = measureRows(division)

  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <header className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Building2 className="size-4 text-primary" />
        <h2 className="font-heading text-base font-semibold">{division.companyName}</h2>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className={`${HEAD} text-left`}>Measure</th>
              <th className={FIGURE_HEAD}>Target</th>
              <th className={FIGURE_HEAD}>Retailing</th>
              <th className={FIGURE_HEAD}>Order to Company</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/40 last:border-0">
                <th
                  scope="row"
                  className="min-w-56 px-3 py-2.5 text-left font-medium break-words text-muted-foreground"
                >
                  {row.label}
                </th>
                <td className={FIGURE}>{row.target}</td>
                <td className={FIGURE}>{row.retailing}</td>
                <td className={FIGURE}>{row.orderToCompany}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
