<script setup lang="ts">
import { ref, watch } from "vue"
import Spinner from "../ui/Spinner.vue"

const props = defineProps<{
  initialUrl?: string
  onLoad: (url: string) => Promise<void>
}>()

const url = ref(props.initialUrl ?? "")
const loading = ref(false)

const supportedSites = [
  { name: "UaKino", host: "uakino.best" },
  { name: "UaSerials", host: "uaserials.my" },
]

watch(
  () => props.initialUrl,
  (val) => {
    if (val) url.value = val
  },
)

async function handleLoad() {
  const val = url.value.trim()
  if (!val) return
  loading.value = true
  await props.onLoad(val)
  loading.value = false
}
</script>

<template>
  <div class="px-5 py-4 sidebar-divider relative z-1">
    <label class="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Source URL</label>
    <div class="flex gap-2">
      <input
        type="text"
        :value="url"
        @input="(e) => (url = (e.currentTarget as HTMLInputElement).value)"
        placeholder="https://uakino.best/..."
        class="flex-1 px-3.5 py-2 bg-input border border-border rounded-md text-text text-sm outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
        @keydown="(e) => e.key === 'Enter' && handleLoad()"
      />
      <button
        @click="handleLoad"
        :disabled="loading"
        class="inline-flex items-center justify-center px-3.5 py-2 bg-accent text-white rounded-md text-[13px] font-semibold cursor-pointer transition-all hover:bg-accent-dark disabled:opacity-50"
      >
        <Spinner v-if="loading" />
        <template v-else>Load</template>
      </button>
    </div>
    <p class="mt-1.5 text-[11px] text-muted">
      Supported:
      <span v-for="(site, i) in supportedSites" :key="site.host">
        <span class="text-text">{{ site.name }}</span>
        <span class="opacity-60"> ({{ site.host }})</span><span v-if="i < supportedSites.length - 1">, </span>
      </span>
    </p>
  </div>
</template>
