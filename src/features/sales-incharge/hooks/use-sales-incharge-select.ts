import { useState } from "react";
import type { ComboboxOption } from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSalesInchargesInfinite } from "../api/use-sales-incharge";

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
 */
export function useSalesInchargeSelect(): SalesInchargeSelect {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const query = useSalesInchargesInfinite({
    search: debounced || undefined,
    pageSize: SALES_INCHARGE_SELECT_PAGE_SIZE,
    sortBy: "display_name",
    sortOrder: "asc",
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  // Each row carries its code as a badge and its designation/territory as the
  // secondary line, so similar names stay distinguishable in the dropdown.
  const options = items.map((s) => ({
    value: String(s.id),
    label: s.displayName,
    badge: s.employeeCode ? `#${s.employeeCode}` : undefined,
    hint: s.designation ?? s.territory ?? undefined,
    avatarUrl: s.profilePhotoUrl,
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
