<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { ChevronDown, Check } from "lucide-vue-next"
import type { DubGroup } from "../../../shared/types"

const props = defineProps<{
  dubs: DubGroup[]
  value: number
  onChange: (idx: number) => void
  isHost: boolean
}>()

const open = ref(false)
const triggerRef = ref<HTMLButtonElement>()
const panelRef = ref<HTMLUListElement>()

const currentName = computed(() => props.dubs[props.value]?.name ?? "—")

function toggle() {
  if (!props.isHost) return
  open.value = !open.value
}

function select(i: number) {
  props.onChange(i)
  open.value = false
}

function onClickOutside(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as Node
  // The trigger toggles itself; option clicks inside the panel select themselves.
  // Any other click (label, padding, elsewhere) should close the dropdown.
  if (triggerRef.value?.contains(target) || panelRef.value?.contains(target)) return
  open.value = false
}

// Capture phase: sibling components (e.g. EpisodeList) call stopPropagation on
// their click handlers, which would prevent a bubbling-phase listener from ever
// firing. Capturing runs before any bubbling stopPropagation.
onMounted(() => document.addEventListener("click", onClickOutside, true))
onUnmounted(() => document.removeEventListener("click", onClickOutside, true))
</script>

<template>
  <div v-if="props.dubs.length > 1" class="px-5 py-4 sidebar-divider relative z-20">
    <label class="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Voiceover ♥</label>

    <button
      ref="triggerRef"
      type="button"
      :disabled="!props.isHost"
      @click="toggle"
      :class="[
        'w-full flex items-center justify-between gap-2 px-3.5 py-1.5 bg-input border rounded-md text-text text-sm text-left outline-none transition-colors',
        props.isHost ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
        open ? 'border-accent shadow-[0_0_0_3px_var(--color-accent-glow)]' : 'border-border hover:border-accent/60',
      ]"
    >
      <span class="truncate">{{ currentName }}</span>
      <ChevronDown
        :size="16"
        :class="['shrink-0 transition-transform duration-200', open ? 'rotate-180 text-accent' : 'text-muted']"
      />
    </button>

    <Transition name="dub-pop">
      <ul
        ref="panelRef"
        v-if="open"
        class="absolute left-5 right-5 mt-1.5 z-50 max-h-64 overflow-y-auto overscroll-contain bg-card border border-border rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
      >
        <li v-for="(dub, i) in props.dubs" :key="i">
          <button
            type="button"
            @click="select(i)"
            :class="[
              'w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-left cursor-pointer transition-colors',
              i === props.value
                ? 'text-accent bg-accent/10 font-semibold'
                : 'text-text hover:bg-hover hover:text-accent',
            ]"
          >
            <span class="truncate">{{ dub.name }}</span>
            <Check v-if="i === props.value" :size="15" class="shrink-0" />
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.dub-pop-enter-active,
.dub-pop-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
  transform-origin: top;
}
.dub-pop-enter-from,
.dub-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
