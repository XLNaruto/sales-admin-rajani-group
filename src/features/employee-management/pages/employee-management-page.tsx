import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, CheckCircle2, ClipboardList, Receipt, Wallet, X } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { useApproveLeave, useLeaves } from '../api/use-leaves'
import { useExpenses } from '../api/use-expenses'
import { useTasks } from '../api/use-tasks'
import type { EmployeeTask, ExpenseClaim, LeaveRequest } from '../types'

export function EmployeesPage() {
  const { data: leaves, isLoading: leavesLoading } = useLeaves()
  const { data: expenses, isLoading: expensesLoading } = useExpenses()
  const { data: tasks, isLoading: tasksLoading } = useTasks()
  const approveLeave = useApproveLeave()

  const pendingLeaves = (leaves ?? []).filter((l) => l.status === 'pending').length
  const pendingExpenses = (expenses ?? []).filter((e) => e.status === 'pending').length
  const openTasks = (tasks ?? []).filter(
    (t) => t.status === 'open' || t.status === 'in-progress',
  ).length

  const leaveColumns = useMemo<ColumnDef<LeaveRequest>[]>(
    () => [
      { accessorKey: 'employee', header: 'Employee' },
      { accessorKey: 'type', header: 'Type' },
      {
        accessorKey: 'from',
        header: 'Duration',
        cell: ({ row }) => `${row.original.from} → ${row.original.to} (${row.original.days}d)`,
      },
      { accessorKey: 'reason', header: 'Reason' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }) =>
          row.original.status === 'pending' ? (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={approveLeave.isPending}
                onClick={() =>
                  approveLeave.mutate({ id: row.original.id, status: 'approved' })
                }
              >
                <CheckCircle2 /> Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={approveLeave.isPending}
                onClick={() =>
                  approveLeave.mutate({ id: row.original.id, status: 'rejected' })
                }
              >
                <X /> Reject
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [approveLeave],
  )

  const expenseColumns = useMemo<ColumnDef<ExpenseClaim>[]>(
    () => [
      { accessorKey: 'employee', header: 'Employee' },
      { accessorKey: 'category', header: 'Category' },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      { accessorKey: 'date', header: 'Date' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  const taskColumns = useMemo<ColumnDef<EmployeeTask>[]>(
    () => [
      { accessorKey: 'title', header: 'Task' },
      { accessorKey: 'assignee', header: 'Assignee' },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <Badge variant={row.original.priority === 'high' ? 'destructive' : 'outline'}>
            {row.original.priority}
          </Badge>
        ),
      },
      { accessorKey: 'dueDate', header: 'Due' },
      {
        accessorKey: 'progress',
        header: 'Progress',
        cell: ({ row }) => `${row.original.progress}%`,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        title="Employee Management"
        description="Leave, expense & task management with pending approvals."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending Leaves" value={pendingLeaves} icon={CalendarDays} hint="awaiting review" />
        <StatCard label="Pending Expenses" value={pendingExpenses} icon={Wallet} hint="awaiting review" />
        <StatCard label="Open Tasks" value={openTasks} icon={ClipboardList} hint="in progress / open" />
      </div>

      <Tabs defaultValue="leaves">
        <TabsList>
          <TabsTrigger value="leaves">
            <CalendarDays className="mr-1.5 size-4" /> Leaves
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="mr-1.5 size-4" /> Expenses
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardList className="mr-1.5 size-4" /> Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaves">
          <DataTable
            columns={leaveColumns}
            data={leaves ?? []}
            isLoading={leavesLoading}
            searchPlaceholder="Search leave requests…"
          />
        </TabsContent>
        <TabsContent value="expenses">
          <DataTable
            columns={expenseColumns}
            data={expenses ?? []}
            isLoading={expensesLoading}
            searchPlaceholder="Search expense claims…"
          />
        </TabsContent>
        <TabsContent value="tasks">
          <DataTable
            columns={taskColumns}
            data={tasks ?? []}
            isLoading={tasksLoading}
            searchPlaceholder="Search tasks…"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
