import { useMemo, useState } from 'react'
import { useApproveLeave } from '@/features/employee-management'
import { useApproveTour } from '@/features/beat-tour'
import { useApprovalInbox, useApproveAttendance, useApproveExpense } from '../api/use-approvals'
import type { ApprovalItem, ApprovalType } from '../types'

/**
 * Drives the central approvals inbox: the inbox query, the four source-domain
 * approve mutations, locally-resolved status overrides, derived items/counts
 * and the approve/reject handlers. The page consumes this and only renders.
 */
export function useApprovals() {
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

  return {
    isLoading,
    items,
    isBusy,
    handleApprove,
    handleReject,
    pendingByType,
  }
}
