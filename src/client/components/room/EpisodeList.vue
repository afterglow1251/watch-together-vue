<script setup lang="ts">
import { ref } from "vue"
import type { Episode } from "../../../shared/types"
import Spinner from "../ui/Spinner.vue"

const props = defineProps<{
  episodes: Episode[]
  currentId?: string
  watchedIds: Set<string>
  isHost: boolean
  onSelect: (ep: Episode) => Promise<void>
  onToggleWatched: (epId: string) => void
}>()

const loadingId = ref<string | null>(null)

async function handleSelect(ep: Episode) {
  if (!props.isHost || loadingId.value) return
  loadingId.value = ep.id
  await props.onSelect(ep)
  loadingId.value = null
}
</script>

<template>
  <div class="px-5 py-4 sidebar-divider relative z-1">
    <label class="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Episodes ♥</label>
    <ul class="list-none flex flex-col gap-0.5">
      <li
        v-for="(ep, i) in props.episodes"
        :key="ep.id"
        @click="handleSelect(ep)"
        :class="`flex items-center gap-2 px-3 py-2.5 rounded-md text-[13px] transition-all cursor-pointer ${
          props.currentId === ep.id
            ? 'bg-accent-glow text-accent font-semibold shadow-[inset_0_0_12px_rgba(232,67,147,0.08)]'
            : props.watchedIds.has(ep.id)
              ? 'text-muted'
              : 'text-muted hover:bg-hover hover:text-text'
        } ${loadingId === ep.id ? 'opacity-60 pointer-events-none' : ''}`"
      >
        <Spinner v-if="loadingId === ep.id" />
        <span
          v-else
          :class="`text-[11px] font-bold min-w-5 ${
            props.currentId === ep.id ? 'text-accent' : props.watchedIds.has(ep.id) ? 'opacity-50' : 'text-muted'
          }`"
        >
          {{ i + 1 }}
        </span>
        <span
          :class="`flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${
            props.watchedIds.has(ep.id) ? 'opacity-50' : ''
          }`"
        >
          {{ ep.name }}
        </span>
        <button
          @click="
            (e) => {
              e.stopPropagation()
              props.onToggleWatched(ep.id)
            }
          "
          :class="`bg-transparent border-none cursor-pointer p-0.5 ml-auto shrink-0 flex items-center transition-all hover:scale-125 ${
            props.watchedIds.has(ep.id) ? 'text-success opacity-100' : 'text-muted opacity-30 hover:opacity-70'
          }`"
        >
          <svg
            v-if="props.watchedIds.has(ep.id)"
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
      </li>
    </ul>
  </div>
</template>
