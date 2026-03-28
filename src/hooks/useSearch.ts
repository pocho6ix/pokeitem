"use client";

import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import type { Item } from "@/types";

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: Item[];
  isLoading: boolean;
}

/**
 * Search hook that debounces user input and fetches matching items
 * from the /api/items endpoint.
 */
export function useSearch(delay = 300): UseSearchReturn {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedQuery = useDebounce(query, delay);

  const fetchResults = useCallback(async (search: string) => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/items?search=${encodeURIComponent(search)}`
      );
      if (!res.ok) {
        throw new Error(`Search request failed: ${res.status}`);
      }
      const data: Item[] = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(debouncedQuery);
  }, [debouncedQuery, fetchResults]);

  return { query, setQuery, results, isLoading };
}
