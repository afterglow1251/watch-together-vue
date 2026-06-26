<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { Search } from "lucide-vue-next"
import { useRoomStore } from "../stores/room"
import { useAuthStore } from "../stores/auth"
import { useSearch, useBrowse } from "../queries/search"
import { useThemeStrings } from "../lib/themeStrings"
import SearchCard from "../components/search/SearchCard.vue"
import Pagination from "../components/search/Pagination.vue"
import type { SearchResultItem } from "../../shared/types"

const s = useThemeStrings()

const MAIN_TABS = [
  { key: "search", label: "Search" },
  { key: "films", label: "Films" },
  { key: "series", label: "Series" },
  { key: "cartoons", label: "Cartoons" },
  { key: "anime", label: "Anime" },
] as const

type MainTabKey = (typeof MAIN_TABS)[number]["key"]

const PAGE_SIZE = 10

const room = useRoomStore()
const router = useRouter()
const auth = useAuthStore()

const mainTab = ref<MainTabKey>("search")

const searchQuery = ref("")
const debouncedQuery = ref("")
const page = ref(1)

let debounceTimer: ReturnType<typeof setTimeout> | undefined

function onQueryInput(value: string) {
  searchQuery.value = value
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value.trim()
    page.value = 1
  }, 300)
}

onUnmounted(() => clearTimeout(debounceTimer))

const searchResults = useSearch(
  () => debouncedQuery.value,
  () => page.value,
)
const browseCategory = () => (mainTab.value !== "search" ? mainTab.value : "")
const browseResults = useBrowse(browseCategory, () => page.value)

const isSearchTab = computed(() => mainTab.value === "search")
const results = computed(
  () => (isSearchTab.value ? searchResults.data.value : browseResults.data.value) ?? [],
)
const isResultsLoading = computed(() =>
  isSearchTab.value ? searchResults.isLoading.value : browseResults.isLoading.value,
)
const isResultsFetching = computed(() =>
  isSearchTab.value ? searchResults.isFetching.value : browseResults.isFetching.value,
)

function handleMainTabChange(key: MainTabKey) {
  mainTab.value = key
  page.value = 1
}

function handleCardClick(item: SearchResultItem) {
  room.createRoom(auth.user!.username)
  const unwatch = setInterval(() => {
    if (room.state.roomCode) {
      clearInterval(unwatch)
      router.push(`/room/${room.state.roomCode}?load=${encodeURIComponent(item.url)}`)
    }
  }, 100)
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

    <!-- Loading indicator — fixed height, opacity toggle to avoid layout shift -->
    <div
      :class="`h-0.5 rounded overflow-hidden mb-4 transition-opacity duration-200 ${isResultsFetching ? 'opacity-100 bg-accent/20' : 'opacity-0'}`"
    >
      <div class="h-full bg-accent rounded animate-[loading_1s_ease-in-out_infinite]" :style="{ width: '30%' }" />
    </div>

    <template v-if="results.length > 0">
      <div class="grid gap-4" :style="{ 'grid-template-columns': 'repeat(auto-fill, minmax(160px, 1fr))' }">
        <SearchCard
          v-for="item in results"
          :key="item.url"
          :item="item"
          :on-click="() => handleCardClick(item)"
        />
      </div>

      <Pagination
        v-if="page > 1 || results.length >= PAGE_SIZE"
        :current="page"
        :has-more="results.length >= PAGE_SIZE"
        :on-change="(p: number) => (page = p)"
      />
    </template>
    <template v-else>
      <div v-if="isResultsLoading" class="text-center py-10 text-muted">
        <div
          v-if="s.showHearts"
          class="text-4xl text-accent opacity-30 mb-3"
          :style="{ animation: 'heart-pulse 2s ease-in-out infinite' }"
        >
          &#9829;
        </div>
        <p class="text-sm">Loading...</p>
      </div>
      <div v-else class="text-center py-10 text-muted">
        <div
          v-if="s.showHearts"
          class="text-4xl text-accent opacity-30 mb-3"
          :style="{ animation: 'heart-pulse 2s ease-in-out infinite' }"
        >
          &#9829;
        </div>
        <p class="text-sm">
          {{
            isSearchTab
              ? debouncedQuery
                ? "No results found. Try a different query."
                : "Type something to search UaKino."
              : "No results found."
          }}
        </p>
      </div>
    </template>
  </div>
</template>
