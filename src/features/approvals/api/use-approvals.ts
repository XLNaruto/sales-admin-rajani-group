import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockDelay } from "@/lib/utils";
import type { ApprovalItem, ApprovalType } from "../types";

const INBOX: ApprovalItem[] = [
  {
    id: "a1",
    type: "leave",
    requester: "R. Mehta",
    submittedOn: "2026-07-01",
    summary: "Casual leave — 2 days (Jul 4–5)",
    status: "pending",
  },
  {
    id: "a2",
    type: "tour",
    requester: "K. Rao",
    submittedOn: "2026-07-01",
    summary: "Tour plan — Pune Camp Beat (8 stops)",
    status: "pending",
  },
  {
    id: "a3",
    type: "expense",
    requester: "S. Patel",
    submittedOn: "2026-06-30",
    summary: "TA/DA claim — ₹3,240 (fuel + lodging)",
    status: "pending",
  },
  {
    id: "a4",
    type: "attendance",
    requester: "A. Singh",
    submittedOn: "2026-06-30",
    summary: "Regularization — missed punch-out Jun 29",
    status: "pending",
  },
  {
    id: "a5",
    type: "leave",
    requester: "D. Shah",
    submittedOn: "2026-06-29",
    summary: "Sick leave — 1 day (Jun 30)",
    status: "pending",
  },
  {
    id: "a6",
    type: "tour",
    requester: "R. Mehta",
    submittedOn: "2026-07-02",
    summary: "Tour plan — Thane Wholesale Beat (15 stops)",
    status: "pending",
  },
  {
    id: "a7",
    type: "expense",
    requester: "K. Rao",
    submittedOn: "2026-07-02",
    summary: "TA/DA claim — ₹1,180 (local conveyance)",
    status: "pending",
  },
  {
    id: "a8",
    type: "attendance",
    requester: "S. Patel",
    submittedOn: "2026-07-01",
    summary: "Regularization — on-duty field visit Jun 28",
    status: "pending",
  },
];

export function useApprovalInbox(type?: ApprovalType) {
  return useQuery({
    queryKey: queryKeys.approvals.inbox(type),
    queryFn: () =>
      mockDelay(type ? INBOX.filter((i) => i.type === type) : INBOX),
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockDelay({ id, status: "approved" as const }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.approvals.all }),
  });
}

export function useApproveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockDelay({ id, status: "approved" as const }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.approvals.all }),
  });
}
