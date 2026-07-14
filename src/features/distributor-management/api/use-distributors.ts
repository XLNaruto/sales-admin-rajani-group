import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockDelay } from "@/lib/utils";
import { createDistributor, fetchDistributors } from "./distributor-api";
import type {
  Distributor,
  DistributorCreateInput,
  DistributorListParams,
  DistributorStatus,
} from "../types";

/** In-memory mock store — replace with real API calls when the backend lands. */
const DISTRIBUTORS: Distributor[] = [
  {
    id: "d1",
    firmName: "Shree Traders",
    firmType: "proprietorship",
    ownerName: "Ramesh Mehta",
    ownerMobile: "9876543210",
    email: "shree.traders@example.com",
    code: "DST-001",
    status: "active",
    officeAddress: "Main Bazaar, Rajkot",
    stateId: "st-gj",
    zoneId: "zn-gj-s",
    districtId: "dt-rajkot",
    talukaId: "tl-rajkot",
    cityId: "ct-rajkot",
    marketType: "local_rural",
    marketSystem: "ready_stock",
    retailersLocal: 120,
    retailersRural: 45,
  },
  {
    id: "d2",
    firmName: "Maruti Distributors",
    firmType: "partnership",
    ownerName: "Suresh Patel",
    ownerMobile: "9825011122",
    email: "maruti.dist@example.com",
    code: "DST-002",
    status: "active",
    officeAddress: "GIDC Road, Vadodara",
    stateId: "st-gj",
    zoneId: "zn-gj-c",
    districtId: "dt-vadodara",
    talukaId: "tl-vadodara",
    cityId: "ct-vadodara",
    marketType: "local",
    marketSystem: "booking",
    retailersLocal: 80,
  },
  {
    id: "d3",
    firmName: "Maharashtra Sales Corp",
    firmType: "company",
    ownerName: "Kiran Rao",
    ownerMobile: "9700099887",
    email: "msc.pune@example.com",
    code: "DST-003",
    status: "pending",
    officeAddress: "FC Road, Pune",
    stateId: "st-mh",
    zoneId: "zn-mh-w",
    districtId: "dt-pune",
    talukaId: "tl-haveli",
    cityId: "ct-pune",
    marketType: "rural",
    marketSystem: "booking",
  },
  {
    id: "d4",
    firmName: "Vidarbha Agencies",
    firmType: "proprietorship",
    ownerName: "Ajay Singh",
    ownerMobile: "9911223344",
    email: "vidarbha.agencies@example.com",
    code: "DST-004",
    status: "suspended",
    officeAddress: "Sitabuldi, Nagpur",
    stateId: "st-mh",
    zoneId: "zn-mh-v",
    districtId: "dt-nagpur",
    talukaId: "tl-nagpur",
    cityId: "ct-nagpur",
    marketType: "counter_sales",
    marketSystem: "ready_stock",
  },
];

/**
 * GET /sales-incharge-admin/distributors — live, server-filtered list.
 * Params (limit/offset/search/status/sort) are forwarded verbatim to the
 * endpoint. The mock create/status/delete flow below is untouched.
 */
export function useDistributors(params: DistributorListParams = {}) {
  return useQuery({
    queryKey: queryKeys.distributors.list(params as Record<string, unknown>),
    queryFn: () => fetchDistributors(params),
    placeholderData: keepPreviousData,
  });
}

/** POST /sales-incharge-admin/distributors — presign + upload images, then create. */
export function useCreateDistributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DistributorCreateInput) => createDistributor(input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  });
}

export function useSetDistributorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DistributorStatus }) => {
      const d = DISTRIBUTORS.find((x) => x.id === id);
      if (d) d.status = status;
      return mockDelay({ id, status }, 400);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  });
}

export function useDeleteDistributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const i = DISTRIBUTORS.findIndex((d) => d.id === id);
      if (i !== -1) DISTRIBUTORS.splice(i, 1);
      return mockDelay({ id }, 400);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  });
}
