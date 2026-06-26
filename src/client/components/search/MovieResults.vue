<script setup lang="ts">
import { useThemeStrings } from "../../lib/themeStrings"
import SearchCard from "./SearchCard.vue"
import Pagination from "./Pagination.vue"
import type { SearchResultItem } from "../../../shared/types"

const PAGE_SIZE = 10

const s = useThemeStrings()

const props = defineProps<{
  results: SearchResultItem[]
  isSearchTab: boolean
  debouncedQuery: string
  isLoading: boolean
  isFetching: boolean
  page: number
  onCardClick: (item: SearchResultItem) => void
  onPageChange: (page: number) => void
  // Optional bookmark affordance (shared library only)
  libraryUrls?: Set<string>
  onBookmark?: (e: MouseEvent, item: SearchResultItem) => void
}>()
</script>

<template>
  <!-- Loading indicator — fixed height, opacity toggle to avoid layout shift -->
  <div
    :class="`h-0.5 rounded overflow-hidden mb-4 transition-opacity duration-200 ${props.isFetching ? 'opacity-100 bg-accent/20' : 'opacity-0'}`"
  >
    <div class="h-full bg-accent rounded animate-[loading_1s_ease-in-out_infinite]" :style="{ width: '30%' }" />
  </div>

  <template v-if="props.results.length > 0">
    <div class="grid gap-4" :style="{ 'grid-template-columns': 'repeat(auto-fill, minmax(160px, 1fr))' }">
      <SearchCard
        v-for="item in props.results"
        :key="item.url"
        :item="item"
        :on-click="() => props.onCardClick(item)"
        :on-bookmark="props.onBookmark ? (e: MouseEvent) => props.onBookmark!(e, item) : undefined"
        :in-library="props.libraryUrls?.has(item.url)"
      />
    </div>

    <Pagination
      v-if="props.page > 1 || props.results.length >= PAGE_SIZE"
      :current="props.page"
      :has-more="props.results.length >= PAGE_SIZE"
      :on-change="props.onPageChange"
    />
  </template>
  <template v-else>
    <div v-if="props.isLoading" class="text-center py-10 text-muted">
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
          props.isSearchTab
            ? props.debouncedQuery
              ? "No results found. Try a different query."
              : "Type something to search UaKino."
            : "No results found."
        }}
      </p>
    </div>
  </template>
</template>
