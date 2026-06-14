import { useQuery, useMutation } from "@tanstack/vue-query"
import { computed } from "vue"
import { api } from "../services/api"
import type { ApiArg } from "../services/api"

export function usePlaybackPositions(userId: () => number | undefined) {
  return useQuery({
    queryKey: computed(() => ["playback-positions", userId()]),
    queryFn: () => api.getPlaybackPositions(userId()!),
    enabled: computed(() => !!userId()),
    select: (data) => data.positions ?? [],
  })
}

export function useSavePlaybackPosition() {
  return useMutation({
    mutationFn: (data: ApiArg<"savePlaybackPosition">) => api.savePlaybackPosition(data),
  })
}
