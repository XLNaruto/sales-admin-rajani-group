import { useMemo, useState } from 'react'
import { CalendarOff, MapPinned, Wallet, Clock, Inbox } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { EmptyState } from '@/components/common/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useApproveLeave } from '@/features/employee-management'
import { useApproveTour } from '@/features/beat-tour'
import { useApprovalInbox, useApproveAttendance, useApproveExpense } from '../api/use-approvals'
import type { ApprovalItem, ApprovalType } from '../types'
import { ApprovalCard } from '../components/approval-card'

type TabValue = 'all' | ApprovalType

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'leave', label: 'Leave' },
  { value: 'tour', label: 'Tour' },
  { value: 'expense', label: 'Expense' },
  { value: 'attendance', label: 'Attendance' },
]

export function ApprovalsPage() {
  const { data, isLoading } = useApprovalInbox()

  const approveLeave = useApproveLeave()
  const approveTour = useApproveTour()
  const approveExpense = useApproveExpense()
  const approveAttendance = useApproveAttendance()

  const [resolved, setResolved] = useState<Record<string, ApprovalItem['status']>>({})

  const isBusy =
    approveLeave.isPending ||
    approveTour.isPending ||
    approveExpense.isPending ||
    approveAttendance.isPending

  const items = useMemo<ApprovalItem[]>(
    () =>
      (data ?? []).map((item) =>
        resolved[item.id] ? { ...item, status: resolved[item.id] } : item,
      ),
    [data, resolved],
  )

  const handleApprove = (item: ApprovalItem) => {
    const onSettled = () => setResolved((r) => ({ ...r, [item.id]: 'approved' }))
    switch (item.type) {
      case 'leave':
        approveLeave.mutate({ id: item.id, status: 'approved' }, { onSettled })
        break
      case 'tour':
        approveTour.mutate(item.id, { onSettled })
        break
      case 'expense':
        approveExpense.mutate(item.id, { onSettled })
        break
      case 'attendance':
        approveAttendance.mutate(item.id, { onSettled })
        break
    }
  }

  const handleReject = (item: ApprovalItem) => {
    setResolved((r) => ({ ...r, [item.id]: 'rejected' }))
  }

  const pendingByType = (type: ApprovalType) =>
    items.filter((i) => i.type === type && i.status === 'pending').length

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Central inbox for tour, expense, attendance, and leave requests."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <StatCard label="Pending Leave" value={pendingByType('leave')} icon={CalendarOff} />
            <StatCard label="Pending Tour" value={pendingByType('tour')} icon={MapPinned} />
            <StatCard label="Pending Expense" value={pendingByType('expense')} icon={Wallet} />
            <StatCard label="Pending Attendance" value={pendingByType('attendance')} icon={Clock} />
          </>
        )}
      </div>

      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => {
          const filtered =
            tab.value === 'all' ? items : items.filter((i) => i.type === tab.value)
          return (
            <TabsContent key={tab.value} value={tab.value}>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Nothing to review"
                  description="There are no requests in this category right now."
                />
              ) : (
                <div className="space-y-3">
                  {filtered.map((item) => (
                    <ApprovalCard
                      key={item.id}
                      item={item}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      isBusy={isBusy}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
