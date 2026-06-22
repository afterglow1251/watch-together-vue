<script setup lang="ts">
import { Moon, Heart } from "lucide-vue-next"
import { useThemeStore } from "../../stores/theme"

const theme = useThemeStore()
</script>

<template>
  <button
    @click="theme.toggle()"
    :title="theme.theme === 'black' ? 'Switch to pink theme' : 'Switch to black theme'"
    class="w-7 h-7 inline-flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer transition-all hover:bg-hover"
  >
    <Moon v-if="theme.theme === 'black'" :size="14" class="text-muted" />
    <Heart v-else :size="14" :style="{ color: 'var(--color-accent)' }" />
  </button>
</template>
