import { ref, computed, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { useRoomStore } from "../stores/room"
import { useAuthStore } from "../stores/auth"
import { useSearch, useBrowse } from "../queries/search"
import type { SearchResultItem } from "../../shared/types"

/**
 * Encapsulates the UaKino search/browse experience shared by the standalone
 * Discover page and a friend's shared library: debounced query state, the
 * search/browse queries, derived result/loading state, and opening a result in
 * a freshly created room.
 *
 * `mainTab` is supplied by the caller so each host can own its own tab list
 * (the shared library adds a "library" tab in front of the movie tabs).
 */
export function useMovieSearch(mainTab: () => string) {
  const router = useRouter()
  const room = useRoomStore()
  const auth = useAuthStore()

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
  const browseCategory = () => {
    const t = mainTab()
    return t !== "library" && t !== "search" ? t : ""
  }
  const browseResults = useBrowse(browseCategory, () => page.value)

  const isSearchTab = computed(() => mainTab() === "search")
  const results = computed(
    () => (isSearchTab.value ? searchResults.data.value : browseResults.data.value) ?? [],
  )
  const isResultsLoading = computed(() =>
    isSearchTab.value ? searchResults.isLoading.value : browseResults.isLoading.value,
  )
  const isResultsFetching = computed(() =>
    isSearchTab.value ? searchResults.isFetching.value : browseResults.isFetching.value,
  )

  function resetPage() {
    page.value = 1
  }

  function openInRoom(item: SearchResultItem) {
    room.createRoom(auth.user!.username)
    const unwatch = setInterval(() => {
      if (room.state.roomCode) {
        clearInterval(unwatch)
        router.push(`/room/${room.state.roomCode}?load=${encodeURIComponent(item.url)}`)
      }
    }, 100)
  }

  return {
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
  }
}
