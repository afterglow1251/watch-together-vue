<script setup lang="ts">
import { ref, watch } from "vue"

const props = defineProps<{
  onReaction: (emoji: string) => void
  lastReaction: { emoji: string; id: number } | null
}>()

const EXTRAS = ["😂", "👀", "😎", "😱", "😢", "😤", "😡"]

const containerEl = ref<HTMLDivElement | null>(null)

watch(
  () => props.lastReaction,
  (r) => {
    if (!r || !containerEl.value) return
    spawnFloating(r.emoji)
  },
)

function spawnFloating(emoji: string) {
  if (!containerEl.value) return
  const el = document.createElement("div")
  el.className = `absolute text-[28px] pointer-events-none ${emoji === "♥" ? "text-accent drop-shadow-[0_0_8px_rgba(232,67,147,0.4)]" : ""}`
  el.textContent = emoji
  el.style.left = 40 + Math.random() * 50 + "%"
  el.style.bottom = "80px"
  el.style.animation = "float-heart 1.5s ease-out forwards"
  containerEl.value.appendChild(el)
  el.addEventListener("animationend", () => el.remove())
}
</script>

<template>
  <!-- Reaction buttons -->
  <div class="absolute bottom-[60px] right-3 z-20 flex flex-col items-center gap-1 group select-none">
    <div class="flex flex-col gap-1 opacity-0 translate-y-2 pointer-events-none transition-all group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
      <button
        v-for="emoji in EXTRAS"
        :key="emoji"
        @mousedown.prevent="props.onReaction(emoji)"
        class="w-[38px] h-[38px] rounded-full border-none bg-black/50 text-[17px] cursor-pointer flex items-center justify-center backdrop-blur-sm transition-transform hover:bg-white/15 hover:scale-120 active:scale-85"
      >
        {{ emoji }}
      </button>
    </div>
    <button
      @mousedown.prevent="props.onReaction('♥')"
      class="w-11 h-11 rounded-full border-none bg-black/50 text-accent cursor-pointer backdrop-blur-sm flex items-center justify-center transition-transform hover:bg-accent/30 hover:scale-110 active:scale-90"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  </div>

  <!-- Floating reactions container -->
  <div ref="containerEl" class="absolute inset-0 pointer-events-none z-[24] overflow-hidden" />
</template>
