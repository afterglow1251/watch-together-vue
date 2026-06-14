import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed } from "vue"
import { api } from "../services/api"
import type { ApiResponse } from "../services/api"

export function useWatchedEpisodes(userId: () => number | undefined, sourceUrl: () => string | undefined) {
  return useQuery({
    queryKey: computed(() => ["watched", userId(), sourceUrl()]),
    queryFn: () => api.getWatched(userId()!, sourceUrl()!),
    enabled: computed(() => !!userId() && !!sourceUrl()),
    select: (data) => new Set(data.episodeIds),
  })
}

export function useToggleWatched() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { userId: number; sourceUrl: string; episodeId: string; watched: boolean }) => {
      return p.watched
        ? api.unmarkWatched({ userId: p.userId, sourceUrl: p.sourceUrl, episodeId: p.episodeId })
        : api.markWatched({ userId: p.userId, sourceUrl: p.sourceUrl, episodeId: p.episodeId })
    },
    onMutate: async (p: { userId: number; sourceUrl: string; episodeId: string; watched: boolean }) => {
      const watchedKey = ["watched", p.userId, p.sourceUrl]
      await qc.cancelQueries({ queryKey: watchedKey })
      const prevWatched = qc.getQueryData<ApiResponse<"getWatched">>(watchedKey)

      qc.setQueryData<ApiResponse<"getWatched">>(watchedKey, (old) => {
        if (!old?.episodeIds) return old
        const ids = new Set(old.episodeIds)
        if (p.watched) {
          ids.delete(p.episodeId)
        } else {
          ids.add(p.episodeId)
        }
        return { ...old, episodeIds: [...ids] }
      })

      // Optimistically update watchedCount in library cache
      const delta = p.watched ? -1 : 1
      qc.setQueriesData<ApiResponse<"getLibrary">>({ queryKey: ["library"] }, (old) => {
        if (!old?.items) return old
        return {
          ...old,
          items: old.items.map((item) =>
            item.sourceUrl === p.sourceUrl ? { ...item, watchedCount: Math.max(0, item.watchedCount + delta) } : item,
          ),
        }
      })

      return { prevWatched, watchedKey }
    },
    onError: (
      _err: unknown,
      _p: { userId: number; sourceUrl: string; episodeId: string; watched: boolean },
      context: { prevWatched: ApiResponse<"getWatched"> | undefined; watchedKey: unknown[] } | undefined,
    ) => {
      if (context) {
        qc.setQueryData(context.watchedKey, context.prevWatched)
      }
    },
    onSettled: (
      _data: unknown,
      _err: unknown,
      p: { userId: number; sourceUrl: string; episodeId: string; watched: boolean },
    ) => {
      qc.invalidateQueries({ queryKey: ["watched", p.userId, p.sourceUrl] })
      qc.invalidateQueries({ queryKey: ["library"] })
    },
  })
}
