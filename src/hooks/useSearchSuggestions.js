import { useMemo } from "react";

export function useSearchSuggestions(events, query) {
  return useMemo(() => {
    if (!query || query.length < 2) return [];
    const normalized = query.toLowerCase();
    return events
      .filter((event) =>
        [event.name, event.type, event.city].some((field) =>
          field.toLowerCase().includes(normalized)
        )
      )
      .slice(0, 6);
  }, [events, query]);
}
