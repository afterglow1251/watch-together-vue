import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"
import { api } from "../services/api"

export function useSearch(query: () => string, page: () => number) {
  return useQuery({
    queryKey: computed(() => ["search", query(), page()]),
    queryFn: () => api.search(query(), page()),
    enabled: computed(() => query().length > 0),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    select: (data) => data.results ?? [],
  })
}

export function useBrowse(category: () => string, page: () => number) {
  return useQuery({
    queryKey: computed(() => ["browse", category(), page()]),
    queryFn: () => api.browse(category(), page()),
    enabled: computed(() => category().length > 0),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    select: (data) => data.results ?? [],
  })
}
