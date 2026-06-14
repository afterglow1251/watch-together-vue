import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed } from "vue"
import { api } from "../services/api"
import type { ApiResponse, ApiArg } from "../services/api"
import type { LibraryStatus } from "../../shared/types"

export function useSharedLibrary(userId: () => number | undefined, friendId: () => number | undefined) {
  return useQuery({
    queryKey: computed(() => ["shared-library", userId(), friendId()]),
    queryFn: () => api.getSharedLibrary(userId()!, friendId()!),
    enabled: computed(() => !!userId() && !!friendId()),
    select: (data) => data.items ?? [],
  })
}

export function useAddToSharedLibrary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ApiArg<"addToSharedLibrary">) => api.addToSharedLibrary(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["shared-library"] })
    },
  })
}

export function useUpdateSharedLibraryStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ApiArg<"updateSharedLibrary">) => api.updateSharedLibrary(data),
    onMutate: async (data: ApiArg<"updateSharedLibrary">) => {
      await qc.cancelQueries({ queryKey: ["shared-library"] })
      const prev = qc.getQueriesData<ApiResponse<"getSharedLibrary">>({ queryKey: ["shared-library"] })
      qc.setQueriesData<ApiResponse<"getSharedLibrary">>({ queryKey: ["shared-library"] }, (old) => {
        if (!old?.items) return old
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === data.id ? { ...item, status: data.status as LibraryStatus } : item,
          ),
        }
      })
      return { prev }
    },
    onError: (
      _err: unknown,
      _data: ApiArg<"updateSharedLibrary">,
      context: { prev: [unknown, ApiResponse<"getSharedLibrary"> | undefined][] } | undefined,
    ) => {
      context?.prev.forEach(([key, data]) => qc.setQueryData(key as string[], data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["shared-library"] }),
  })
}

export function useRemoveFromSharedLibrary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ApiArg<"removeFromSharedLibrary">) => api.removeFromSharedLibrary(data),
    onMutate: async (data: ApiArg<"removeFromSharedLibrary">) => {
      await qc.cancelQueries({ queryKey: ["shared-library"] })
      const prev = qc.getQueriesData<ApiResponse<"getSharedLibrary">>({ queryKey: ["shared-library"] })
      qc.setQueriesData<ApiResponse<"getSharedLibrary">>({ queryKey: ["shared-library"] }, (old) => {
        if (!old?.items) return old
        return {
          ...old,
          items: old.items.filter((item) => item.id !== data.id),
        }
      })
      return { prev }
    },
    onError: (
      _err: unknown,
      _data: ApiArg<"removeFromSharedLibrary">,
      context: { prev: [unknown, ApiResponse<"getSharedLibrary"> | undefined][] } | undefined,
    ) => {
      context?.prev.forEach(([key, data]) => qc.setQueryData(key as string[], data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["shared-library"] })
    },
  })
}
