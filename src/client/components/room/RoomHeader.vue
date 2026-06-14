<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { Link2 } from "lucide-vue-next"
import toast from "../../lib/toast"

const props = defineProps<{
  code: string
  clientCount: number
  viewers: string[]
  isHost: boolean
}>()

const showViewers = ref(false)
const dropdownRef = ref<HTMLDivElement>()
const buttonRef = ref<HTMLButtonElement>()

function handleClickOutside(e: MouseEvent) {
  if (
    showViewers.value &&
    !dropdownRef.value?.contains(e.target as Node) &&
    !buttonRef.value?.contains(e.target as Node)
  ) {
    showViewers.value = false
  }
}

onMounted(() => document.addEventListener("click", handleClickOutside))
onUnmounted(() => document.removeEventListener("click", handleClickOutside))

function shareLink() {
  const link = `${window.location.origin}/room/${props.code}`
  navigator.clipboard.writeText(link).then(() => toast("Link copied!"))
}
</script>

<template>
  <div class="px-4 py-3 border-b border-border relative z-20">
    <div class="flex items-center justify-between mb-2">
      <a href="/" class="text-sm font-bold text-gradient hover:opacity-80 transition-opacity select-none">
        Watch&nbsp;
        <span class="text-accent" :style="{ '-webkit-text-fill-color': 'var(--color-accent)' }">♥</span>
        &nbsp;Together
      </a>
    </div>
    <div class="flex items-center gap-2">
      <button
        @click="shareLink"
        class="group inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 hover:opacity-70 transition-opacity"
        title="Click to copy invite link"
      >
        <span class="text-base font-bold font-mono tracking-widest" :style="{ color: 'var(--color-accent)' }">
          {{ props.code }}
        </span>
        <Link2 :size="12" class="text-muted" />
      </button>
      <span
        v-if="props.isHost"
        class="bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider shadow-[0_0_8px_var(--color-accent-glow)]"
        :style="{ animation: 'badge-pulse 2s ease-in-out infinite' }"
      >
        HOST
      </span>
      <div class="ml-auto relative">
        <button
          ref="buttonRef"
          @click="showViewers = !showViewers"
          class="text-[11px] text-muted bg-transparent border-none cursor-pointer p-0 hover:text-text transition-colors"
        >
          {{ props.clientCount }} {{ props.clientCount === 1 ? "viewer" : "viewers" }}
        </button>
        <div
          v-if="showViewers"
          ref="dropdownRef"
          class="absolute right-0 top-full mt-1.5 bg-card border border-border rounded-lg px-3 py-2 shadow-lg z-10 min-w-[120px] max-w-[200px]"
        >
          <div v-for="(name, idx) in props.viewers" :key="idx" class="text-[11px] text-text py-0.5 truncate">
            {{ name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
