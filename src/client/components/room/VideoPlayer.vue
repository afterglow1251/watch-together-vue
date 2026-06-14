<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"
import Plyr from "plyr"
import Hls from "hls.js"

const props = defineProps<{
  streamUrl: string | null
  isHost: boolean
  isPlaying: boolean
  currentTime: number
  initialSeek?: number
  onPlay: (time: number) => void
  onPause: (time: number) => void
  onSeek: (time: number) => void
  onSync: (time: number, isPlaying: boolean) => void
  onTimeUpdate: (time: number, duration: number) => void
  onPauseWithDuration?: (time: number, duration: number) => void
}>()

const videoEl = ref<HTMLVideoElement>()
const wrapperEl = ref<HTMLDivElement>()
let plyr: Plyr | null = null
let hls: Hls | null = null
let ignoreEvents = false
let syncInterval: ReturnType<typeof setInterval> | null = null
let clickTimer: ReturnType<typeof setTimeout> | null = null
let cursorTimer: ReturnType<typeof setTimeout> | null = null
let didInitialSeek = false

onMounted(() => {
  const video = videoEl.value!
  const wrapper = wrapperEl.value!

  plyr = new Plyr(video, {
    controls: ["play-large", "play", "progress", "current-time", "duration", "mute", "volume", "fullscreen"],
    keyboard: { focused: true, global: true },
    tooltips: { controls: true, seek: true },
    seekTime: 5,
    clickToPlay: false,
    fullscreen: { iosNative: true, container: "#plyr-wrapper" },
  })

  // Auto-hide cursor after 3s of no movement
  const showCursor = () => {
    wrapper.classList.remove("cursor-none")
    if (cursorTimer) clearTimeout(cursorTimer)
    cursorTimer = setTimeout(() => wrapper.classList.add("cursor-none"), 3000)
  }
  wrapper.addEventListener("mousemove", showCursor)
  wrapper.addEventListener("mouseleave", () => {
    wrapper.classList.remove("cursor-none")
    if (cursorTimer) clearTimeout(cursorTimer)
    cursorTimer = null
  })

  // Custom click: single = play/pause, double = fullscreen
  const videoWrapper = wrapper.querySelector(".plyr__video-wrapper") || wrapper.querySelector(".plyr")
  videoWrapper?.addEventListener("click", (e: Event) => {
    const target = e.target as HTMLElement
    if (target.closest(".plyr__controls") || target.closest("button")) return
    if (clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
      plyr?.fullscreen.toggle()
    } else {
      clickTimer = setTimeout(() => {
        clickTimer = null
        plyr?.togglePlay()
      }, 250)
    }
  })

  // Video events
  video.addEventListener("play", () => {
    if (ignoreEvents || !props.isHost) return
    props.onPlay(video.currentTime)
  })

  video.addEventListener("pause", () => {
    if (video.duration) {
      props.onPauseWithDuration?.(video.currentTime, video.duration)
    }
    if (ignoreEvents || !props.isHost) return
    props.onPause(video.currentTime)
  })

  video.addEventListener("seeked", () => {
    if (ignoreEvents || !props.isHost) return
    props.onSeek(video.currentTime)
  })

  video.addEventListener("timeupdate", () => {
    if (video.duration) {
      props.onTimeUpdate(video.currentTime, video.duration)
    }
  })
})

// Load stream when URL changes — only streamUrl is a watch source, so
// seek values are read untracked (matching Solid's untrack()).
watch(
  () => props.streamUrl,
  (url) => {
    const video = videoEl.value
    const wrapper = wrapperEl.value
    if (!video || !wrapper) return

    if (!url) {
      // Clean up old video when stream is removed (e.g. loading a new show)
      if (hls) {
        hls.destroy()
        hls = null
      }
      video.removeAttribute("src")
      video.load()
      wrapper.classList.add("no-source")
      return
    }

    const proxiedUrl = `/api/proxy?url=${encodeURIComponent(url)}`
    wrapper.classList.remove("no-source")
    didInitialSeek = false

    if (hls) {
      hls.destroy()
      hls = null
    }

    // Read seek values WITHOUT tracking — only streamUrl should trigger this effect
    const seekTo =
      props.initialSeek && props.initialSeek > 0
        ? props.initialSeek
        : props.isHost && props.currentTime > 0
          ? props.currentTime
          : 0

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        // Start buffering from the target position directly — no double-buffering
        ...(seekTo > 0 ? { startPosition: seekTo } : {}),
      })
      hls.loadSource(proxiedUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!didInitialSeek && seekTo > 0) {
          didInitialSeek = true
          // Set currentTime immediately — HLS.js already buffers from startPosition
          video.currentTime = seekTo
        }
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad()
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError()
          else hls?.destroy()
        }
      })
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = proxiedUrl
      if (!didInitialSeek && seekTo > 0) {
        didInitialSeek = true
        const onMeta = () => {
          video.removeEventListener("loadedmetadata", onMeta)
          video.currentTime = seekTo
        }
        video.addEventListener("loadedmetadata", onMeta)
      }
    }
  },
)

// Late-seek: handles race condition where initialSeek is set after MANIFEST_PARSED already fired
watch(
  () => props.initialSeek,
  (seekTo) => {
    const video = videoEl.value
    if (!seekTo || seekTo <= 0 || didInitialSeek) return
    if (!props.streamUrl) return
    if (!video) return
    didInitialSeek = true
    if (video.readyState >= 1) {
      video.currentTime = seekTo
    } else {
      const onMeta = () => {
        video.removeEventListener("loadedmetadata", onMeta)
        video.currentTime = seekTo
      }
      video.addEventListener("loadedmetadata", onMeta)
    }
  },
)

// Sync from room state (non-host)
watch(
  () => [props.isHost, props.currentTime, props.isPlaying] as const,
  () => {
    if (props.isHost) return

    const time = props.currentTime
    const playing = props.isPlaying

    const video = videoEl.value
    if (!video || !video.duration) return

    const drift = Math.abs(video.currentTime - time)
    if (drift > 1.5) {
      ignoreEvents = true
      video.currentTime = time
      setTimeout(() => {
        ignoreEvents = false
      }, 200)
    }

    if (playing && video.paused) {
      ignoreEvents = true
      video.play().catch(() => {})
      setTimeout(() => {
        ignoreEvents = false
      }, 200)
    } else if (!playing && !video.paused) {
      ignoreEvents = true
      video.pause()
      setTimeout(() => {
        ignoreEvents = false
      }, 200)
    }
  },
)

// Host sync interval
watch(
  () => props.isHost,
  () => {
    if (syncInterval) clearInterval(syncInterval)
    syncInterval = null

    if (props.isHost) {
      syncInterval = setInterval(() => {
        const video = videoEl.value
        if (!video) return
        if (!video.paused && !video.ended) {
          props.onSync(video.currentTime, !video.paused)
        }
      }, 3000)
    }
  },
  { immediate: true },
)

// Seek to initial position on stream load
watch(
  () => [props.streamUrl, props.isHost, props.currentTime, props.isPlaying] as const,
  () => {
    if (!props.streamUrl || props.isHost) return
    const video = videoEl.value
    if (!video) return
    const seekTime = props.currentTime
    const shouldPlay = props.isPlaying
    if (seekTime > 0 || shouldPlay) {
      const onCanPlay = () => {
        video.removeEventListener("canplay", onCanPlay)
        if (seekTime > 0) video.currentTime = seekTime
        if (shouldPlay) video.play().catch(() => {})
      }
      video.addEventListener("canplay", onCanPlay)
    }
  },
)

onUnmounted(() => {
  if (syncInterval) clearInterval(syncInterval)
  if (cursorTimer) clearTimeout(cursorTimer)
  if (hls) hls.destroy()
  plyr?.destroy()
})
</script>

<template>
  <div
    ref="wrapperEl"
    id="plyr-wrapper"
    class="flex-1 relative flex items-center justify-center overflow-hidden no-source"
  >
    <video ref="videoEl" class="w-full h-full object-contain bg-black" playsinline />
    <slot />
  </div>
</template>
