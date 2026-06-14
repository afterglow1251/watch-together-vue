<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { Search, ChevronLeft, Trash2, MoreHorizontal } from "lucide-vue-next"
import { useRoomStore } from "../stores/room"
import { useAuthStore } from "../stores/auth"
import {
  useSharedLibrary,
  useUpdateSharedLibraryStatus,
  useRemoveFromSharedLibrary,
  useAddToSharedLibrary,
} from "../queries/library"
import { useSearch, useBrowse } from "../queries/search"
import toast from "../lib/toast"
import SearchCard from "../components/search/SearchCard.vue"
import Pagination from "../components/search/Pagination.vue"
import type { Friend, SharedLibraryItem, LibraryStatus, SearchResultItem } from "../../shared/types"

const STATUS_LABELS: Record<string, string> = {
  plan_to_watch: "Plan",
  watching: "Watching",
  watched: "Watched",
}

const MAIN_TABS = [
  { key: "library", label: "Library" },
  { key: "search", label: "Search" },
  { key: "films", label: "Films" },
  { key: "series", label: "Series" },
  { key: "cartoons", label: "Cartoons" },
  { key: "anime", label: "Anime" },
] as const

type MainTabKey = (typeof MAIN_TABS)[number]["key"]

const PAGE_SIZE = 10

const props = defineProps<{
  userId: number
  friend: Friend
  onBack: () => void
  onRemove: (friendshipId: number, username: string) => void
}>()

const room = useRoomStore()
const router = useRouter()
const auth = useAuthStore()
const sharedLib = useSharedLibrary(
  () => props.userId,
  () => props.friend.userId,
)
const updateStatus = useUpdateSharedLibraryStatus()
const removeItem = useRemoveFromSharedLibrary()
const addToSharedLib = useAddToSharedLibrary()

// Main tab state
const mainTab = ref<MainTabKey>("library")

// Library sub-filter
const filter = ref<string>("all")
const menuItem = ref<{ item: SharedLibraryItem; x: number; y: number } | null>(null)

// Search/browse state (local signals)
const searchQuery = ref("")
const debouncedQuery = ref("")
const browsePage = ref(1)

let debounceTimer: ReturnType<typeof setTimeout> | undefined

function onQueryInput(value: string) {
  searchQuery.value = value
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value.trim()
    browsePage.value = 1
  }, 300)
}

onUnmounted(() => clearTimeout(debounceTimer))

// Hooks for search/browse
const searchResults = useSearch(
  () => debouncedQuery.value,
  () => browsePage.value,
)
const browseCategory = () => {
  const t = mainTab.value
  return t !== "library" && t !== "search" ? t : ""
}
const browseResults = useBrowse(browseCategory, () => browsePage.value)

const isSearchTab = computed(() => mainTab.value === "search")
const browseOrSearchResults = computed(
  () => (isSearchTab.value ? searchResults.data.value : browseResults.data.value) ?? [],
)
const isResultsLoading = computed(() => (isSearchTab.value ? searchResults.isLoading.value : browseResults.isLoading.value))
const isResultsFetching = computed(() =>
  isSearchTab.value ? searchResults.isFetching.value : browseResults.isFetching.value,
)

// Set of URLs already in this shared library
const libraryUrls = computed(() => {
  const set = new Set<string>()
  for (const item of sharedLib.data.value ?? []) set.add(item.sourceUrl)
  return set
})

const filtered = computed(() => {
  const items = sharedLib.data.value ?? []
  return filter.value === "all" ? items : items.filter((i) => i.status === filter.value)
})

function pct(item: SharedLibraryItem) {
  return item.totalEpisodes > 0 ? Math.round((item.watchedCount / item.totalEpisodes) * 100) : 0
}

function poster(item: SharedLibraryItem | SearchResultItem) {
  return item.poster ? `/api/poster-proxy?url=${encodeURIComponent(item.poster)}` : ""
}

function handleMainTabChange(key: MainTabKey) {
  mainTab.value = key
  browsePage.value = 1
}

function handleLibraryCardClick(item: SharedLibraryItem) {
  room.createRoom(auth.user!.username)
  const unwatch = setInterval(() => {
    if (room.state.roomCode) {
      clearInterval(unwatch)
      router.push(`/room/${room.state.roomCode}?load=${encodeURIComponent(item.sourceUrl)}`)
    }
  }, 100)
}

function handleSearchCardClick(item: SearchResultItem) {
  room.createRoom(auth.user!.username)
  const unwatch = setInterval(() => {
    if (room.state.roomCode) {
      clearInterval(unwatch)
      router.push(`/room/${room.state.roomCode}?load=${encodeURIComponent(item.url)}`)
    }
  }, 100)
}

async function handleAddToLibrary(_e: MouseEvent, item: SearchResultItem) {
  if (libraryUrls.value.has(item.url)) {
    toast("Already in shared library")
    return
  }
  try {
    await addToSharedLib.mutateAsync({ userId: props.userId, friendId: props.friend.userId, sourceUrl: item.url })
    toast(`Added to library with ${props.friend.username}`)
  } catch {
    toast.error("Failed to add")
  }
}

function openMenu(e: MouseEvent, item: SharedLibraryItem) {
  e.stopPropagation()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  menuItem.value = { item, x: rect.right + 4, y: rect.top }
}

function closeMenu() {
  menuItem.value = null
}

async function changeStatus(id: number, status: LibraryStatus) {
  closeMenu()
  await updateStatus.mutateAsync({ id, status })
}

async function handleRemoveItem(id: number) {
  closeMenu()
  await removeItem.mutateAsync({ id })
  toast("Removed from shared library")
}

const STATUS_FILTERS = ["all", "watching", "plan_to_watch", "watched"]
const MENU_STATUSES: { key: LibraryStatus; label: string }[] = [
  { key: "plan_to_watch", label: "Plan to watch" },
  { key: "watching", label: "Watching" },
  { key: "watched", label: "Watched" },
]
</script>

<template>
  <div @click="closeMenu">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-5">
      <button
        @click="props.onBack()"
        class="w-8 h-8 rounded-full border border-border bg-transparent text-muted cursor-pointer flex items-center justify-center hover:bg-hover hover:text-text transition-colors"
      >
        <ChevronLeft :size="18" />
      </button>
      <div class="flex items-center gap-3 flex-1">
        <div class="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-accent text-sm font-bold">
          {{ props.friend.username[0].toUpperCase() }}
        </div>
        <div>
          <div class="text-sm font-semibold text-text">{{ props.friend.username }}</div>
          <div class="text-[11px] text-muted">Shared library</div>
        </div>
      </div>
      <button
        @click="props.onRemove(props.friend.friendshipId, props.friend.username)"
        class="w-8 h-8 rounded-full border border-danger/30 bg-transparent text-danger cursor-pointer flex items-center justify-center hover:bg-danger/10 transition-colors"
        title="Remove loved one"
      >
        <Trash2 :size="14" />
      </button>
    </div>

    <!-- Tabs bar: main tabs + status sub-filters (on Library) + search input -->
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

      <!-- Status sub-filters when on Library tab -->
      <template v-if="mainTab === 'library'">
        <div class="w-px h-4 bg-border mx-1" />
        <button
          v-for="f in STATUS_FILTERS"
          :key="f"
          @click="filter = f"
          :class="`px-2 py-1 rounded-md text-[12px] cursor-pointer transition-all ${
            filter === f ? 'bg-white/10 text-text font-medium' : 'bg-transparent text-muted hover:bg-hover hover:text-text'
          }`"
        >
          {{ f === "all" ? "All" : STATUS_LABELS[f] }}
        </button>
      </template>

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

    <!-- Library tab content -->
    <template v-if="mainTab === 'library'">
      <div
        v-if="filtered.length > 0"
        class="grid gap-4"
        :style="{ 'grid-template-columns': 'repeat(auto-fill, minmax(160px, 1fr))' }"
      >
        <div
          v-for="item in filtered"
          :key="item.id"
          :class="`relative rounded-[10px] overflow-hidden bg-card border border-border cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(232,67,147,0.12)] group ${menuItem?.item.id === item.id ? 'shadow-[0_4px_16px_rgba(232,67,147,0.12)]' : ''}`"
          @click="handleLibraryCardClick(item)"
        >
          <button
            @click="openMenu($event, item)"
            class="absolute top-1.5 right-1.5 w-7 h-7 rounded-full border-none bg-black/60 text-white cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-accent/60 z-10"
          >
            <MoreHorizontal :size="14" />
          </button>
          <span
            :class="`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wide backdrop-blur-sm status-${item.status}`"
          >
            {{ STATUS_LABELS[item.status] ?? item.status }}
          </span>
          <img
            v-if="poster(item)"
            :src="poster(item)"
            alt=""
            loading="lazy"
            class="w-full aspect-[2/3] object-cover block bg-hover"
          />
          <div v-else class="w-full aspect-[2/3] bg-hover" />
          <div class="p-2.5">
            <div class="text-xs font-semibold text-text leading-tight mb-1.5 line-clamp-2">{{ item.title }}</div>
            <template v-if="item.totalEpisodes > 0">
              <div class="text-[11px] text-muted mb-1">{{ item.watchedCount }}/{{ item.totalEpisodes }} episodes</div>
              <div class="h-[3px] bg-border rounded-sm overflow-hidden">
                <div
                  class="h-full bg-accent rounded-sm transition-[width] duration-300"
                  :style="{ width: `${pct(item)}%` }"
                />
              </div>
            </template>
          </div>
        </div>
      </div>
      <div v-else-if="!sharedLib.isLoading.value" class="text-center py-10 text-muted">
        <div class="text-4xl text-accent opacity-30 mb-3" :style="{ animation: 'heart-pulse 2s ease-in-out infinite' }">
          &#9829;
        </div>
        <p class="text-sm">
          {{
            (sharedLib.data.value?.length ?? 0) === 0
              ? "Your shared list is empty — find something to watch together!"
              : "No shows in this category."
          }}
        </p>
      </div>
    </template>

    <!-- Search / Browse tab content -->
    <template v-if="mainTab !== 'library'">
      <!-- Loading indicator — fixed height, opacity toggle to avoid layout shift -->
      <div
        :class="`h-0.5 rounded overflow-hidden mb-4 transition-opacity duration-200 ${isResultsFetching ? 'opacity-100 bg-accent/20' : 'opacity-0'}`"
      >
        <div class="h-full bg-accent rounded animate-[loading_1s_ease-in-out_infinite]" :style="{ width: '30%' }" />
      </div>

      <template v-if="browseOrSearchResults.length > 0">
        <div class="grid gap-4" :style="{ 'grid-template-columns': 'repeat(auto-fill, minmax(160px, 1fr))' }">
          <SearchCard
            v-for="item in browseOrSearchResults"
            :key="item.url"
            :item="item"
            :on-click="() => handleSearchCardClick(item)"
            :on-bookmark="(e: MouseEvent) => handleAddToLibrary(e, item)"
            :in-library="libraryUrls.has(item.url)"
          />
        </div>

        <Pagination
          v-if="browsePage > 1 || browseOrSearchResults.length >= PAGE_SIZE"
          :current="browsePage"
          :has-more="browseOrSearchResults.length >= PAGE_SIZE"
          :on-change="(p: number) => (browsePage = p)"
        />
      </template>
      <template v-else>
        <div v-if="isResultsLoading" class="text-center py-10 text-muted">
          <div class="text-4xl text-accent opacity-30 mb-3" :style="{ animation: 'heart-pulse 2s ease-in-out infinite' }">
            &#9829;
          </div>
          <p class="text-sm">Loading...</p>
        </div>
        <div v-else class="text-center py-10 text-muted">
          <div class="text-4xl text-accent opacity-30 mb-3" :style="{ animation: 'heart-pulse 2s ease-in-out infinite' }">
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
    </template>

    <!-- Context menu -->
    <div
      v-if="menuItem"
      class="fixed z-50 bg-card border border-border rounded-md py-1 min-w-[160px] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
      :style="{ top: `${menuItem.y}px`, left: `${menuItem.x}px` }"
      @click="$event.stopPropagation()"
    >
      <button
        v-for="s in MENU_STATUSES"
        :key="s.key"
        @click="changeStatus(menuItem!.item.id, s.key)"
        :class="`block w-full px-3.5 py-2 border-none bg-transparent text-[13px] text-left cursor-pointer transition-colors hover:bg-hover ${menuItem!.item.status === s.key ? 'text-accent font-semibold' : 'text-text'}`"
      >
        {{ s.label }}
      </button>
      <hr class="border-none border-t border-border my-1" />
      <button
        @click="handleRemoveItem(menuItem!.item.id)"
        class="block w-full px-3.5 py-2 border-none bg-transparent text-danger text-[13px] text-left cursor-pointer transition-colors hover:bg-danger/10"
      >
        Remove
      </button>
    </div>
  </div>
</template>
