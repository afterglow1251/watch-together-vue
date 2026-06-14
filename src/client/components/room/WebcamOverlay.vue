<script setup lang="ts">
import { ref } from "vue"
import { useWebcamStore } from "../../stores/webcam"
import WebcamStreamTile from "./WebcamStreamTile.vue"
import WebcamInteractiveTile from "./WebcamInteractiveTile.vue"

type Size = { width: number; height: number }

const REMOTE_DEFAULT: Size = { width: 172, height: 124 }
const LOCAL_DEFAULT: Size = { width: 156, height: 116 }

const webcam = useWebcamStore()
const overlayEl = ref<HTMLDivElement>()

function getOverlay() {
  return overlayEl.value
}
</script>

<template>
  <div ref="overlayEl" class="pointer-events-none absolute inset-0 z-40 overflow-hidden">
    <WebcamInteractiveTile
      v-for="(remote, index) in webcam.visibleRemoteStreams"
      :key="remote.clientId"
      :overlay-el="getOverlay"
      mode="remote"
      :remote-index="index"
      :default-size="REMOTE_DEFAULT"
    >
      <WebcamStreamTile :stream="remote.stream" />
    </WebcamInteractiveTile>

    <template v-if="webcam.localStream">
      <WebcamInteractiveTile
        v-if="!webcam.selfPreviewHidden"
        :overlay-el="getOverlay"
        mode="local"
        :default-size="LOCAL_DEFAULT"
      >
        <WebcamStreamTile :stream="webcam.localStream" mirrored />
      </WebcamInteractiveTile>
    </template>
  </div>
</template>
