import { useState } from "react";
import type { ComboboxOption } from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSalesInchargeOptionsInfinite } from "../api/use-sales-incharge";
import type { SalesInchargeStatus } from "../types";

/** Page size for the lazy-loaded sales-incharge dropdown. */
export const SALES_INCHARGE_SELECT_PAGE_SIZE = 20;

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface SalesInchargeSelect {
  options: ComboboxOption[];
  loading: boolean;
  onScrollEnd: () => void;
  onSearchChange: (query: string) => void;
  /** First loaded option, so a screen can preselect one when none is given. */
  firstValue?: string;
}

/**
 * Adapts the paged, server-searched sales-incharge list into `<Combobox>` props.
 * The search box value is debounced and sent to the API (server-side search);
 * the next page loads when the list is scrolled to its end.
 *
 * Fed by the dedicated options endpoint rather than the full rep list: it needs
 * only `sales-incharge:lookup` (a panel baseline grant), so every screen that
 * merely picks a rep — journey planning, beat allocation, the request toolbars
 * — fills its dropdown without holding access to the Sales Incharge Master.
 * The trade is that a row is `id` + name only; a screen that needs the code,
 * designation or photo of the SELECTED rep reads the detail endpoint (see
 * `use-beat-allocation`, which merges its detail row into the option list).
 *
 * Defaults to `active` reps only — the common case is a form handing out work,
 * and a suspended rep must not be assignable. Pass an explicit `status` (or
 * `undefined` for no filter) on a screen that FILTERS existing rows instead:
 * a rep suspended last week still owns the requests he raised before that, and
 * dropping him from the picker makes those rows unfilterable.
 */
export function useSalesInchargeSelect({
  status = "active",
}: { status?: SalesInchargeStatus } = {}): SalesInchargeSelect {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const query = useSalesInchargeOptionsInfinite({
    search: debounced || undefined,
    pageSize: SALES_INCHARGE_SELECT_PAGE_SIZE,
    status,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const options = items.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  return {
    options,
    loading: query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    },
    onSearchChange: setSearch,
    firstValue: options[0]?.value,
  };
}
