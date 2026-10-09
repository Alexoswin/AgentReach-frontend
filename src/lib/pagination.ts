import { useEffect, useState } from "react";

/** Shape returned by the backend's paginated list endpoints. */
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PageParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  directoryId?: string;
};

/** Builds ?page=&limit=... and leaves out empty filters. */
export function pageQueryString(params: PageParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return `?${query.toString()}`;
}

/** Delays a fast-changing value (a search box) so each keystroke is not a request. */
export function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
