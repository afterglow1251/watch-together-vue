<script setup lang="ts">
const props = defineProps<{
  title?: string
}>()
</script>

<template>
  <div v-if="props.title" class="px-5 py-4 sidebar-divider relative z-1">
    <h3 class="text-[15px] font-semibold leading-relaxed text-gradient-subtle">{{ props.title }}</h3>
  </div>
</template>
