<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next"

const props = defineProps<{
  current: number
  hasMore: boolean
  onChange: (page: number) => void
}>()
</script>

<template>
  <div class="flex items-center justify-center gap-3 mt-6">
    <button
      v-if="props.current > 1"
      @click="props.onChange(props.current - 1)"
      class="flex items-center gap-1 px-4 py-2 rounded-full border border-border text-[13px] font-medium text-muted bg-transparent cursor-pointer transition-all hover:bg-hover hover:text-text"
    >
      <ChevronLeft :size="16" />
      Prev
    </button>

    <span class="text-[13px] text-muted tabular-nums">Page {{ props.current }}</span>

    <button
      v-if="props.hasMore"
      @click="props.onChange(props.current + 1)"
      class="flex items-center gap-1 px-4 py-2 rounded-full border border-border text-[13px] font-medium text-muted bg-transparent cursor-pointer transition-all hover:bg-hover hover:text-text"
    >
      Next
      <ChevronRight :size="16" />
    </button>
  </div>
</template>
