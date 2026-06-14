<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"
import type { ChatMsg } from "../../stores/room"

const MSG_LIFETIME = 4400 // 300ms in + 4000ms visible + 400ms out

const props = defineProps<{
  messages: ChatMsg[]
  onSend: (text: string) => void
  onTyping: () => void
}>()

const open = ref(false)
const visible = ref<ChatMsg[]>([])
const inputEl = ref<HTMLInputElement>()
let lastSeenId = 0

// "/" shortcut to open chat in fullscreen
function onKey(e: KeyboardEvent) {
  if (e.key === "/" && !open.value && document.fullscreenElement) {
    e.preventDefault()
    open.value = true
    setTimeout(() => inputEl.value?.focus(), 50)
  }
}
onMounted(() => document.addEventListener("keydown", onKey))
onUnmounted(() => document.removeEventListener("keydown", onKey))

// Track new messages and auto-expire them independently
watch(
  () => props.messages,
  (msgs) => {
    const last = msgs[msgs.length - 1]
    if (!last || last.id === lastSeenId) return
    lastSeenId = last.id

    visible.value = [...visible.value.slice(-4), last]

    const id = last.id
    setTimeout(() => {
      visible.value = visible.value.filter((m) => m.id !== id)
    }, MSG_LIFETIME)
  },
  { deep: true },
)

function handleSend() {
  if (!inputEl.value) return
  const text = inputEl.value.value.trim()
  if (!text) {
    open.value = false
    inputEl.value.blur()
    return
  }
  props.onSend(text)
  inputEl.value.value = ""
}

function toggleOpen() {
  open.value = !open.value
  if (open.value) setTimeout(() => inputEl.value?.focus(), 50)
}
</script>

<template>
  <!-- Toggle button — visible only in fullscreen via CSS -->
  <button
    @click="toggleOpen"
    class="absolute top-3 right-3 z-[21] w-9 h-9 rounded-full border-none bg-black/50 text-white cursor-pointer hidden items-center justify-center backdrop-blur-sm hover:bg-accent/30 transition-colors"
    :style="{ display: 'var(--fs-btn-display, none)' }"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  </button>

  <!-- Overlay -->
  <div
    class="absolute top-[50px] right-3 z-[22] pointer-events-none flex-col items-end gap-1.5 max-w-[300px] hidden"
    :style="{ display: 'var(--fs-chat-display, none)' }"
  >
    <div class="flex flex-col items-end gap-1 max-h-[200px] overflow-hidden">
      <div
        v-for="msg in visible"
        :key="msg.id"
        class="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-[10px] text-[13px] max-w-[280px] pointer-events-none"
        :style="{ animation: 'fs-msg-in 0.3s ease-out, fs-msg-out 0.4s ease-in 4s forwards' }"
      >
        <span v-if="msg.replyTo" class="opacity-60 mr-1 text-[11px]"> {{ "↩" }} {{ msg.replyTo.name }} </span>
        <span class="font-semibold text-accent mr-1.5 text-xs">{{ msg.name }}</span>
        {{ msg.text }}
      </div>
    </div>

    <div v-if="open" class="pointer-events-auto">
      <input
        ref="inputEl"
        type="text"
        placeholder="Write something sweet..."
        :maxlength="2000"
        class="w-[280px] px-3.5 py-2 text-[13px] rounded-full bg-black/60 backdrop-blur-md border border-accent/30 text-white outline-none focus:border-accent"
        @keydown="
          (e) => {
            if (e.key === 'Enter') handleSend()
            if (e.key === 'Escape') {
              open = false
              inputEl?.blur()
            }
            e.stopPropagation()
          }
        "
        @input="props.onTyping()"
      />
    </div>
  </div>
</template>
