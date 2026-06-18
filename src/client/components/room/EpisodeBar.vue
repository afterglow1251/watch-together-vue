<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { Episode } from "../../../shared/types"

const props = defineProps<{
  title?: string
  episodes: Episode[]
  currentEpisode?: Episode | null
  isHost: boolean
  watchedIds: Set<string>
  onSelect: (ep: Episode) => void
  onOpenList: () => void
  onToggleWatched: (epId: string) => void
}>()

const currentIndex = computed(() =>
  props.currentEpisode ? props.episodes.findIndex((e) => e.id === props.currentEpisode!.id) : -1,
)
const hasPrev = computed(() => props.isHost && currentIndex.value > 0)
const hasNext = computed(
  () => props.isHost && currentIndex.value >= 0 && currentIndex.value < props.episodes.length - 1,
)
const multi = computed(() => props.episodes.length > 1)
// Single-episode shows (movies) have no episode navigator, so expose the
// watched toggle inline here — otherwise it's unreachable (it normally lives
// in the episode list overlay, which only opens for multi-episode shows).
const soloEp = computed(() => (props.episodes.length === 1 ? props.episodes[0] : null))

// Collapse the episode navigator to reclaim sidebar space; remembered across
// loads so it stays hidden once the user tucks it away.
const COLLAPSE_KEY = "episodeBar:collapsed"
const collapsed = ref(readCollapsed())
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1"
  } catch {
    return false
  }
}
watch(collapsed, (v) => {
  try {
    localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0")
  } catch {}
})

function go(delta: number) {
  if (!props.isHost) return
  const i = currentIndex.value + delta
  if (i < 0 || i >= props.episodes.length) return
  props.onSelect(props.episodes[i])
}
</script>

<template>
  <div v-if="props.title" class="px-5 py-4 sidebar-divider relative z-1">
    <!-- Title + collapse toggle (toggle only when there's a navigator to hide) -->
    <div class="flex items-center gap-2" :class="{ 'mb-2.5': multi && !collapsed }">
      <h3 class="flex-1 min-w-0 text-[15px] font-semibold leading-snug text-gradient-subtle truncate">
        {{ props.title }}
      </h3>
      <button
        v-if="multi"
        @click="collapsed = !collapsed"
        :title="collapsed ? 'Show episodes' : 'Hide episodes'"
        class="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-accent hover:bg-hover cursor-pointer transition-colors"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          :style="{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <!-- Single-episode (movie): inline watched toggle -->
      <button
        v-else-if="soloEp"
        @click="props.onToggleWatched(soloEp.id)"
        :title="props.watchedIds.has(soloEp.id) ? 'Mark as unwatched' : 'Mark as watched'"
        :class="`shrink-0 w-7 h-7 flex items-center justify-center rounded-md cursor-pointer transition-all hover:scale-110 ${
          props.watchedIds.has(soloEp.id) ? 'text-success' : 'text-muted hover:text-accent hover:bg-hover'
        }`"
      >
        <svg
          v-if="props.watchedIds.has(soloEp.id)"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          width="16"
          height="16"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </button>
    </div>

    <!-- Episode navigation (series only, when expanded) -->
    <div v-if="multi && !collapsed" class="flex items-center gap-1.5">
      <button
        @click="go(-1)"
        :disabled="!hasPrev"
        title="Previous episode"
        class="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-accent hover:bg-hover disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        @click="
          (e) => {
            props.onOpenList()
            ;(e.currentTarget as HTMLButtonElement).blur()
          }
        "
        class="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-hover hover:bg-input border border-transparent hover:border-border text-[12px] cursor-pointer transition-colors"
        title="All episodes"
      >
        <span class="shrink-0 text-muted font-normal">
          <span v-if="currentIndex >= 0" class="text-accent font-semibold">{{ currentIndex + 1 }}</span>
          <span v-else class="text-[10px] opacity-60">–</span><span class="mx-1 opacity-50">/</span
          >{{ props.episodes.length }}
        </span>
        <span class="flex-1 min-w-0 truncate text-text">{{ props.currentEpisode?.name ?? "Pick an episode" }}</span>
        <svg
          class="shrink-0 text-muted"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <button
        @click="go(1)"
        :disabled="!hasNext"
        title="Next episode"
        class="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-accent hover:bg-hover disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  </div>
</template>
