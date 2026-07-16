import { useState } from "react";
import type { ComboboxOption } from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDesignationsInfinite } from "../api/use-sales-incharge";

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface DesignationSelect {
  options: ComboboxOption[];
  loading: boolean;
  onScrollEnd: () => void;
  onSearchChange: (query: string) => void;
}

/**
 * Adapts the paged, server-searched designations query into `<Combobox>` props.
 * The search box value is debounced and sent to the API (server-side search);
 * the next page loads when the list is scrolled to its end.
 */
export function useDesignationSelect(): DesignationSelect {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const query = useDesignationsInfinite(debounced || undefined);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return {
    options: items.map((d) => ({ value: String(d.id), label: d.name })),
    loading: query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    },
    onSearchChange: setSearch,
  };
}
