<script setup lang="ts">
import { ref } from "vue"
import { Search } from "lucide-vue-next"
import { useMovieSearch } from "../composables/useMovieSearch"
import MovieResults from "../components/search/MovieResults.vue"

const MAIN_TABS = [
  { key: "search", label: "Search" },
  { key: "films", label: "Films" },
  { key: "series", label: "Series" },
  { key: "cartoons", label: "Cartoons" },
  { key: "anime", label: "Anime" },
] as const

type MainTabKey = (typeof MAIN_TABS)[number]["key"]

const mainTab = ref<MainTabKey>("search")

const {
  searchQuery,
  debouncedQuery,
  page,
  isSearchTab,
  results,
  isResultsLoading,
  isResultsFetching,
  onQueryInput,
  resetPage,
  openInRoom,
} = useMovieSearch(() => mainTab.value)

function handleMainTabChange(key: MainTabKey) {
  mainTab.value = key
  resetPage()
}
</script>

<template>
  <div class="w-full max-w-[800px] mx-auto px-5 py-6">
    <!-- Tabs bar: main tabs + search input -->
    <div class="flex items-center gap-1 mb-4 flex-wrap">
      <button
        v-for="t in MAIN_TABS"
        :key="t.key"
        @click="handleMainTabChange(t.key)"
        :class="`px-2.5 py-1 rounded-md text-[12px] cursor-pointer transition-all ${
          mainTab === t.key ? 'bg-accent text-white' : 'bg-transparent text-muted hover:bg-hover hover:text-text'
        }`"
      >
        {{ t.label }}
      </button>

      <!-- Search input when on Search tab -->
      <template v-if="isSearchTab">
        <div class="w-px h-4 bg-border mx-1" />
        <div class="relative flex-1 min-w-[160px] max-w-[300px]">
          <Search :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            :value="searchQuery"
            @input="onQueryInput(($event.currentTarget as HTMLInputElement).value)"
            placeholder="Search UaKino..."
            class="w-full pl-8 pr-3 py-1 bg-input border border-border rounded-md text-text text-[12px] outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
          />
        </div>
      </template>
    </div>

    <MovieResults
      :results="results"
      :is-search-tab="isSearchTab"
      :debounced-query="debouncedQuery"
      :is-loading="isResultsLoading"
      :is-fetching="isResultsFetching"
      :page="page"
      :on-card-click="openInRoom"
      :on-page-change="(p: number) => (page = p)"
    />
  </div>
</template>
