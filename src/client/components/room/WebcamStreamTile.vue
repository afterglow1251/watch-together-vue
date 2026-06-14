<script setup lang="ts">
import { ref, watch, onMounted } from "vue"

const props = defineProps<{
  stream: MediaStream
  mirrored?: boolean
}>()

const videoEl = ref<HTMLVideoElement>()

function attach() {
  if (!videoEl.value) return
  videoEl.value.srcObject = props.stream
  void videoEl.value.play().catch(() => {})
}

onMounted(attach)
watch(() => props.stream, attach)
</script>

<template>
  <div class="relative h-full w-full overflow-hidden rounded-[22px] bg-black/10 shadow-[0_12px_30px_rgba(12,7,16,0.24)]">
    <video
      ref="videoEl"
      autoplay
      playsinline
      :muted="props.mirrored"
      class="block h-full w-full object-cover"
      :style="props.mirrored ? { transform: 'scaleX(-1)' } : undefined"
    />
    <div class="pointer-events-none absolute bottom-0 right-0 h-5 w-5 rounded-tl-[14px] bg-black/18 backdrop-blur-sm" />
  </div>
</template>
