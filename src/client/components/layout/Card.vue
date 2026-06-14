<script setup lang="ts">
const props = defineProps<{
  class?: string
}>()
</script>

<template>
  <div
    :class="`bg-card border border-border rounded-2xl px-10 py-12 w-full max-w-[420px] text-center relative z-1 ${props.class ?? ''}`"
    :style="{ animation: 'card-glow 3s ease-in-out infinite' }"
  >
    <slot />
  </div>
</template>
