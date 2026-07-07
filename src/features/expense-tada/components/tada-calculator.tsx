import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { calculateTada } from '../lib/tada-calc'
import type { HqType, TadaMaster } from '../types'

const GRADES = ['L1', 'L2', 'L3']
const HQ_TYPES: HqType[] = ['metro', 'non-metro']

export function TadaCalculator({ master }: { master: TadaMaster[] }) {
  const [grade, setGrade] = useState('L2')
  const [hqType, setHqType] = useState<HqType>('metro')
  const [distanceKm, setDistanceKm] = useState(120)
  const [days, setDays] = useState(2)
  const [date, setDate] = useState('2026-07-01')

  const breakdown = useMemo(
    () => calculateTada({ grade, hqType, onDate: date, distanceKm, days }, master),
    [grade, hqType, date, distanceKm, days, master],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-4" /> TA/DA Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tada-grade">Grade</Label>
            <select
              id="tada-grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tada-hq">HQ Type</Label>
            <select
              id="tada-hq"
              value={hqType}
              onChange={(e) => setHqType(e.target.value as HqType)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {HQ_TYPES.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tada-distance">Distance (km)</Label>
            <Input
              id="tada-distance"
              type="number"
              min={0}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tada-days">Days</Label>
            <Input
              id="tada-days"
              type="number"
              min={0}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tada-date">Claim Date</Label>
            <Input
              id="tada-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Daily Allowance (DA)</span>
            <span className="font-medium">{formatCurrency(breakdown.da)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Travel Allowance (TA)</span>
            <span className="font-medium">{formatCurrency(breakdown.ta)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Additional</span>
            <span className="font-medium">{formatCurrency(breakdown.additional)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total Payable</span>
            <span>{formatCurrency(breakdown.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
