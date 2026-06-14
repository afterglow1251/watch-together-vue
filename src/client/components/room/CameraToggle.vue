<script setup lang="ts">
import { ref } from "vue"
import { Eye, EyeOff, Video, VideoOff } from "lucide-vue-next"
import { useWebcamStore } from "../../stores/webcam"

const webcam = useWebcamStore()
const menuOpen = ref(false)
</script>

<template>
  <div
    class="absolute bottom-[60px] left-3 z-40 select-none"
    @mouseenter="menuOpen = true"
    @mouseleave="menuOpen = false"
  >
    <div v-if="menuOpen" class="absolute bottom-10 left-0 h-8 w-[180px] pointer-events-auto" />

    <div
      class="absolute bottom-12 left-0 mb-2 flex flex-col gap-1 transition-all duration-150"
      :class="menuOpen
        ? 'opacity-100 translate-y-0 pointer-events-auto'
        : 'opacity-0 translate-y-2 pointer-events-none'"
    >
      <button
        v-if="webcam.localStream"
        @mousedown.prevent="webcam.toggleSelfPreview()"
        class="min-w-[150px] rounded-full border-none bg-black/55 px-3 py-2 text-left text-[12px] text-white/86 cursor-pointer backdrop-blur-sm transition-transform hover:bg-white/15 hover:scale-[1.02] active:scale-95"
      >
        <span class="flex items-center gap-2">
          <EyeOff v-if="webcam.selfPreviewHidden" :size="14" />
          <Eye v-else :size="14" />
          <span class="flex-1">My preview</span>
          <span class="text-white/52">{{ webcam.selfPreviewHidden ? "Show" : "Hide" }}</span>
        </span>
      </button>

      <button
        v-for="remote in webcam.remoteStreams"
        :key="remote.clientId"
        @mousedown.prevent="webcam.toggleRemoteVisibility(remote.clientId)"
        class="min-w-[150px] rounded-full border-none bg-black/55 px-3 py-2 text-left text-[12px] text-white/86 cursor-pointer backdrop-blur-sm transition-transform hover:bg-white/15 hover:scale-[1.02] active:scale-95"
      >
        <span class="flex items-center gap-2">
          <EyeOff v-if="webcam.isRemoteHidden(remote.clientId)" :size="14" />
          <Eye v-else :size="14" />
          <span class="flex-1 truncate">{{ remote.name }}</span>
          <span class="text-white/52">{{ webcam.isRemoteHidden(remote.clientId) ? "Show" : "Hide" }}</span>
        </span>
      </button>
    </div>

    <button
      @mousedown.prevent="void webcam.toggleCamera()"
      class="w-11 h-11 rounded-full border-none bg-black/50 text-white cursor-pointer backdrop-blur-sm flex items-center justify-center transition-transform hover:bg-accent/30 hover:scale-110 active:scale-90"
      :class="{ 'bg-accent/35 text-accent': webcam.cameraOn }"
      :title="webcam.cameraOn ? 'Turn off camera' : 'Turn on camera'"
    >
      <Video v-if="webcam.cameraOn" :size="20" />
      <VideoOff v-else :size="20" />
    </button>
  </div>
</template>
