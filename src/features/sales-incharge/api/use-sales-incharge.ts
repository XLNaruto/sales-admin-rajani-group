import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockDelay } from "@/lib/utils";
import { deleteSalesIncharge, fetchSalesIncharges } from "./sales-incharge-api";
import type {
  Salesman,
  SalesmanInput,
  SalesInchargeListParams,
} from "../types";

/**
 * GET /sales-incharge-admin/sales-incharges — live, server-filtered list.
 * Params are forwarded verbatim to the endpoint (limit/offset/search/status/
 * sort). Kept separate from the mock create/delete flow below.
 */
export function useSalesIncharges(params: SalesInchargeListParams = {}) {
  return useQuery({
    queryKey: queryKeys.salesIncharge.list(params as Record<string, unknown>),
    queryFn: () => fetchSalesIncharges(params),
    placeholderData: keepPreviousData,
  });
}

/** DELETE /sales-incharge-admin/sales-incharges/{id} — remove a sales incharge. */
export function useDeleteSalesIncharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSalesIncharge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.salesIncharge.all }),
  });
}

const bank = (
  bankAccountName: string,
  bankAccountNumber: string,
  bankIfsc: string,
  bankName: string,
) => ({
  bankAccountName,
  bankAccountNumber,
  bankIfsc,
  bankName,
});

// Mock in-memory store so newly created sales incharges appear in the list.
const SALESMEN: Salesman[] = [
  {
    id: "sm1",
    name: "Ramesh Yadav",
    employerCompany: "Rajani Distributors",
    address: "Andheri West, Mumbai",
    dateOfBirth: "1988-04-12",
    mobile: "9876543210",
    alternateMobile: "9820011001",
    dateOfJoining: "2024-06-12",
    email: "ramesh@rajanigroup.com",
    basicSalary: 42000,
    allowance: 8000,
    designation: "Area Sales Manager",
    ...bank(
      "Ramesh Yadav",
      "50100123456789",
      "HDFC0001234",
      "HDFC Bank",
    ),
    aadharNumber: "123456780012",
    status: "active",
  },
  {
    id: "sm2",
    name: "Suresh Patil",
    employerCompany: "Rajani Distributors",
    address: "Kothrud, Pune",
    dateOfBirth: "1990-09-03",
    mobile: "9876500104",
    dateOfJoining: "2024-08-01",
    email: "suresh@rajanigroup.com",
    basicSalary: 38000,
    allowance: 7000,
    designation: "Senior Sales Officer",
    ...bank(
      "Suresh Patil",
      "50100223456789",
      "ICIC0004321",
      "ICICI Bank",
    ),
    aadharNumber: "223456780013",
    status: "active",
  },
  {
    id: "sm3",
    name: "Anita Deshmukh",
    employerCompany: "Rajani Foods",
    address: "Nagpur",
    dateOfBirth: "1986-12-20",
    mobile: "9876500108",
    dateOfJoining: "2023-11-20",
    dateOfExit: "2025-03-31",
    email: "anita@rajanigroup.com",
    basicSalary: 36000,
    allowance: 6000,
    designation: "Sales Officer",
    ...bank(
      "Anita Deshmukh",
      "50100323456789",
      "SBIN0005678",
      "State Bank of India",
    ),
    aadharNumber: "323456780014",
    status: "inactive",
  },
  {
    id: "sm4",
    name: "Vikram Chauhan",
    employerCompany: "Rajani Beverages",
    address: "Karol Bagh, Delhi",
    dateOfBirth: "1991-01-15",
    mobile: "9876500112",
    dateOfJoining: "2025-01-15",
    email: "vikram@rajanigroup.com",
    basicSalary: 40000,
    allowance: 9000,
    designation: "Area Sales Manager",
    ...bank(
      "Vikram Chauhan",
      "50100423456789",
      "AXIS0006789",
      "Axis Bank",
    ),
    aadharNumber: "423456780015",
    status: "active",
  },
  {
    id: "sm5",
    name: "Pooja Nair",
    employerCompany: "Rajani Foods",
    address: "Kochi, Kerala",
    dateOfBirth: "1993-07-08",
    mobile: "9876500115",
    dateOfJoining: "2025-03-03",
    email: "pooja@rajanigroup.com",
    basicSalary: 39000,
    allowance: 7500,
    designation: "Senior Sales Officer",
    ...bank(
      "Pooja Nair",
      "50100523456789",
      "HDFC0002345",
      "HDFC Bank",
    ),
    aadharNumber: "523456780016",
    status: "active",
  },
  {
    id: "sm6",
    name: "Karan Mehta",
    employerCompany: "Rajani Distributors",
    address: "Rohini, Delhi",
    dateOfBirth: "1985-05-30",
    mobile: "9876500119",
    dateOfJoining: "2023-09-10",
    dateOfExit: "2024-12-31",
    email: "karan@rajanigroup.com",
    basicSalary: 35000,
    allowance: 5000,
    designation: "Sales Officer",
    ...bank(
      "Karan Mehta",
      "50100623456789",
      "ICIC0005432",
      "ICICI Bank",
    ),
    aadharNumber: "623456780017",
    status: "inactive",
  },
  {
    id: "sm7",
    name: "Deepa Iyer",
    employerCompany: "Rajani Beverages",
    address: "T Nagar, Chennai",
    dateOfBirth: "1992-02-18",
    mobile: "9876500122",
    dateOfJoining: "2024-02-18",
    email: "deepa@rajanigroup.com",
    basicSalary: 41000,
    allowance: 8500,
    designation: "Regional Sales Manager",
    ...bank(
      "Deepa Iyer",
      "50100723456789",
      "SBIN0006789",
      "State Bank of India",
    ),
    aadharNumber: "723456780018",
    status: "active",
  },
  {
    id: "sm8",
    name: "Arjun Reddy",
    employerCompany: "Rajani Foods",
    address: "Banjara Hills, Hyderabad",
    dateOfBirth: "1989-11-22",
    mobile: "9876500126",
    dateOfJoining: "2024-05-22",
    email: "arjun@rajanigroup.com",
    basicSalary: 43000,
    allowance: 9500,
    designation: "Area Sales Manager",
    ...bank(
      "Arjun Reddy",
      "50100823456789",
      "AXIS0007890",
      "Axis Bank",
    ),
    aadharNumber: "823456780019",
    status: "active",
  },
];

export function useSalesmen() {
  return useQuery({
    queryKey: queryKeys.salesIncharge.salesmen(),
    queryFn: () => mockDelay([...SALESMEN]),
  });
}

export function useCreateSalesman() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SalesmanInput) => {
      const created: Salesman = {
        id: `sm-${crypto.randomUUID().slice(0, 8)}`,
        ...payload,
      };
      SALESMEN.unshift(created);
      return mockDelay(created, 500);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.salesIncharge.all }),
  });
}

export function useDeleteSalesman() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const idx = SALESMEN.findIndex((s) => s.id === id);
      if (idx !== -1) SALESMEN.splice(idx, 1);
      return mockDelay({ id }, 400);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.salesIncharge.all }),
  });
}
