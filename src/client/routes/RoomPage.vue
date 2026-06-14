<script setup lang="ts">
import { ref, watch, watchEffect, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useQueryClient } from "@tanstack/vue-query"
import { useAuthStore } from "../stores/auth"
import { useRoomStore } from "../stores/room"
import { useWatchedEpisodes, useToggleWatched } from "../queries/watched"
import { useSavePlaybackPosition } from "../queries/playback"
import { api } from "../services/api"
import toast from "../lib/toast"
import RoomHeader from "../components/room/RoomHeader.vue"
import UrlInput from "../components/room/UrlInput.vue"
import EpisodeBar from "../components/room/EpisodeBar.vue"
import DubSelector from "../components/room/DubSelector.vue"
import EpisodeList from "../components/room/EpisodeList.vue"
import AdvancedChat from "../components/room/AdvancedChat.vue"
import VideoPlayer from "../components/room/VideoPlayer.vue"
import SeekOverlay from "../components/room/SeekOverlay.vue"
import ReactionBar from "../components/room/ReactionBar.vue"
import FullscreenChat from "../components/room/FullscreenChat.vue"
// import CameraToggle from "../components/room/CameraToggle.vue"
import WebcamOverlay from "../components/room/WebcamOverlay.vue"
import type { Episode } from "../../shared/types"

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const room = useRoomStore()
const autoMarkedId = ref<string | null>(null)
const initialSeek = ref<number | undefined>(undefined)
const episodesOpen = ref(false)

// Sidebar mode: pinned (always visible) vs auto-hide (peeks in on hover).
// `sidebarCollapsed === true` means auto-hide mode. Persisted in localStorage.
const SIDEBAR_COLLAPSE_KEY = "sidebar:collapsed"
const sidebarCollapsed = ref(readSidebarCollapsed())
const sidebarHovered = ref(false)

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1"
  } catch {
    return false
  }
}

watch(sidebarCollapsed, (v) => {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, v ? "1" : "0")
  } catch {}
})

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  // Collapsing should hide the panel immediately, even though the cursor
  // is still over it (which would otherwise keep it revealed via hover).
  if (sidebarCollapsed.value) sidebarHovered.value = false
}

const qc = useQueryClient()
const userId = () => auth.user?.id
const sourceUrl = () => room.state.sourceUrl ?? undefined
const watched = useWatchedEpisodes(userId, sourceUrl)
const toggleWatched = useToggleWatched()
const savePosition = useSavePlaybackPosition()
let lastLocalSaveTime = 0

const paramCode = () => route.params.code as string | undefined
const searchParam = (key: string) => {
  const v = route.query[key]
  return Array.isArray(v) ? v[0] : v
}

// --- localStorage helpers ---
function localPlaybackKey() {
  const uid = userId()
  const src = sourceUrl()
  const epId = room.state.currentEpisode?.id
  if (!uid || !src || !epId) return null
  return `playback:${uid}:${src}:${epId}`
}

function savePositionToLocal(time: number, duration: number) {
  const key = localPlaybackKey()
  if (!key || !duration) return
  localStorage.setItem(
    key,
    JSON.stringify({ position: Math.floor(time), duration: Math.floor(duration), ts: Date.now() }),
  )
  lastLocalSaveTime = time
}

function getPositionFromLocal(uid: number, src: string, epId: string): number | null {
  const key = `playback:${uid}:${src}:${epId}`
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    return typeof data.position === "number" ? data.position : null
  } catch {
    return null
  }
}

// Join room on mount
onMounted(() => {
  if (!room.state.connected && paramCode()) {
    room.joinRoom(paramCode()!, auth.user!.username)
  }
})

// Handle room-info redirect (room code might differ from URL param)
watchEffect(() => {
  if (room.state.roomCode && room.state.roomCode !== paramCode()) {
    router.replace(`/room/${room.state.roomCode}`)
  }
})

// Read resume seek time from URL params
onMounted(() => {
  const t = searchParam("t")
  if (typeof t === "string" && t) {
    const seekTime = parseInt(t)
    if (seekTime > 0) initialSeek.value = seekTime
  }
})

// Auto-load show from library URL param
watchEffect(() => {
  const loadUrl = searchParam("load")
  if (typeof loadUrl === "string" && loadUrl && room.state.isHost && room.state.connected && !room.state.show) {
    handleLoadUrl(loadUrl)
  }
})

// Auto-select episode from URL param after show loads
watchEffect(() => {
  const epUrl = searchParam("ep")
  if (typeof epUrl !== "string" || !epUrl) return
  if (!room.state.show || !room.state.isHost || room.state.currentEpisode) return

  for (const dub of room.state.show.dubs) {
    const ep = dub.episodes.find((e) => e.url === epUrl)
    if (ep) {
      handleEpisodeSelect(ep)
      break
    }
  }
})

// Auto-start playback once a show loads (host only, and only if nothing is
// selected yet) so there's no manual step:
//   • Movie / single episode  → just play it.
//   • Series                  → continue from the first not-yet-watched episode
//                               (the next one after those already seen), or the
//                               first episode if none were watched.
watchEffect(() => {
  if (!room.state.show || !room.state.isHost || room.state.currentEpisode) return
  const eps = room.state.show.dubs[room.state.dubIndex]?.episodes ?? []
  if (eps.length === 0) return

  if (eps.length === 1) {
    handleEpisodeSelect(eps[0])
    return
  }

  // Wait until the watched set is actually loaded (data defined) before
  // deciding — `isLoading` can read false for a tick while data is still
  // undefined, which would make us land on episode 1 by mistake. The query is
  // enabled whenever the host has a user + source, so for a host it does load.
  const seen = watched.data.value
  if (!seen) return
  const next = eps.find((e) => !seen.has(e.id)) ?? eps[0]
  handleEpisodeSelect(next)
})

async function handleLoadUrl(url: string) {
  try {
    const resp = await api.parse({ url })
    room.setShow(resp.show, url)
    const count = resp.show.dubs.reduce((a, d) => a + d.episodes.length, 0)
    toast(`Found ${count} episodes`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to load")
  }
}

async function handleEpisodeSelect(ep: Episode) {
  room.selectEpisode(ep)
  autoMarkedId.value = null

  // Check localStorage first (instant)
  const localPos = userId() && sourceUrl() ? getPositionFromLocal(userId()!, sourceUrl()!, ep.id) : null
  if (localPos && localPos > 0) {
    initialSeek.value = localPos
  } else {
    initialSeek.value = undefined
  }

  try {
    // Fetch stream; also fetch backend position as fallback if no local position.
    // The position fetch is a best-effort fallback, so it must not abort the stream.
    const needsBackendPos = !localPos && userId() && sourceUrl()
    const [streamResp, posResp] = await Promise.all([
      api.stream({ url: ep.url }),
      needsBackendPos
        ? api.getPlaybackPosition(userId()!, sourceUrl()!, ep.id).catch(() => null)
        : Promise.resolve(null),
    ])
    if (!localPos && posResp?.position) {
      initialSeek.value = posResp.position.position
    }
    if (streamResp.streamUrl) {
      room.streamReady(streamResp.streamUrl)
    } else {
      toast.error("Failed to get stream")
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Server connection error")
  }
}

function handleToggleWatched(episodeId: string) {
  if (!userId() || !sourceUrl()) return
  const isWatched = watched.data.value?.has(episodeId) ?? false
  toggleWatched.mutate({
    userId: userId()!,
    sourceUrl: sourceUrl()!,
    episodeId,
    watched: isWatched,
  })
}

function savePlaybackPositionToBackend(time: number, duration: number) {
  if (!userId() || !sourceUrl() || !room.state.currentEpisode || !room.state.show || !duration) return
  savePosition.mutate({
    userId: userId()!,
    sourceUrl: sourceUrl()!,
    episodeId: room.state.currentEpisode.id,
    episodeUrl: room.state.currentEpisode.url,
    title: room.state.show.title,
    poster: room.state.show.poster,
    episodeName: room.state.currentEpisode.name,
    position: Math.floor(time),
    duration: Math.floor(duration),
  })
}

function getBeaconPayload(time: number, duration: number) {
  if (!userId() || !sourceUrl() || !room.state.currentEpisode || !room.state.show || !duration) return null
  return {
    userId: userId()!,
    sourceUrl: sourceUrl()!,
    episodeId: room.state.currentEpisode.id,
    episodeUrl: room.state.currentEpisode.url,
    title: room.state.show.title,
    poster: room.state.show.poster,
    episodeName: room.state.currentEpisode.name,
    position: Math.floor(time),
    duration: Math.floor(duration),
  }
}

function handleTimeUpdate(time: number, duration: number) {
  if (!room.state.currentEpisode || !duration) return
  const progress = time / duration
  if (progress >= 0.9) {
    const epId = room.state.currentEpisode.id
    if (autoMarkedId.value !== epId && !watched.data.value?.has(epId)) {
      autoMarkedId.value = epId
      if (userId() && sourceUrl()) {
        api.markWatched({ userId: userId()!, sourceUrl: sourceUrl()!, episodeId: epId }).catch(() => {})
        qc.invalidateQueries({ queryKey: ["watched"] })
      }
    }
  }
  // Save to localStorage every 3 seconds of playback change
  if (Math.abs(time - lastLocalSaveTime) >= 3) {
    savePositionToLocal(time, duration)
  }
}

function handlePause(time: number, duration: number) {
  if (!duration) return
  savePositionToLocal(time, duration)
  savePlaybackPositionToBackend(time, duration)
}

// --- beforeunload / visibilitychange: save to backend via sendBeacon ---
function sendBeaconPosition() {
  const key = localPlaybackKey()
  if (!key) return
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const { position, duration } = JSON.parse(raw)
    const payload = getBeaconPayload(position, duration)
    if (!payload) return
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
    navigator.sendBeacon("/api/playback-position", blob)
  } catch {
    /* noop */
  }
}

const handleBeforeUnload = () => sendBeaconPosition()
const handleVisibilityChange = () => {
  if (document.visibilityState === "hidden") sendBeaconPosition()
}
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && episodesOpen.value) episodesOpen.value = false
}

onMounted(() => {
  window.addEventListener("beforeunload", handleBeforeUnload)
  document.addEventListener("visibilitychange", handleVisibilityChange)
  window.addEventListener("keydown", handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload)
  document.removeEventListener("visibilitychange", handleVisibilityChange)
  window.removeEventListener("keydown", handleKeydown)
})

// --- Reconnect: restore position from localStorage when host rejoins with existing stream ---
watchEffect(() => {
  if (!room.state.connected || !room.state.isHost || !room.state.streamUrl || !room.state.currentEpisode) return
  // Only fire when initialSeek hasn't been set yet (i.e. reconnect, not fresh episode select)
  if (initialSeek.value !== undefined) return
  const uid = userId()
  const src = sourceUrl()
  const epId = room.state.currentEpisode.id
  if (!uid || !src) return
  const localPos = getPositionFromLocal(uid, src, epId)
  if (localPos && localPos > 0) {
    initialSeek.value = localPos
  } else if (room.state.currentTime > 0) {
    initialSeek.value = room.state.currentTime
  }
})

const currentDub = () => room.state.show?.dubs[room.state.dubIndex] ?? null
const episodes = () => currentDub()?.episodes ?? []
const watchedIds = () => watched.data.value ?? new Set<string>()

// Selecting from the overlay list also closes the overlay.
async function handleEpisodeSelectFromList(ep: Episode) {
  await handleEpisodeSelect(ep)
  episodesOpen.value = false
}

// Sidebar hearts
const sidebarHearts = [
  { left: "10%", dur: 14, delay: 0 },
  { left: "30%", dur: 18, delay: 4 },
  { left: "55%", dur: 12, delay: 8 },
  { left: "75%", dur: 16, delay: 2 },
  { left: "90%", dur: 20, delay: 6 },
]
</script>

<template>
  <div class="flex h-screen w-screen max-md:flex-col relative">
    <!-- Hover trigger strip (auto-hide mode): catches hover when the panel is off-screen -->
    <div
      v-if="sidebarCollapsed"
      @mouseenter="sidebarHovered = true"
      class="absolute left-0 top-0 h-full w-24 z-30 max-md:hidden"
    />

    <!-- Sidebar -->
    <aside
      @mouseenter="sidebarHovered = true"
      @mouseleave="sidebarHovered = false"
      :class="[
        'bg-sidebar-gradient border-r border-border flex flex-col overflow-hidden ease-out',
        sidebarCollapsed
          ? 'absolute left-0 top-0 h-full w-[350px] z-40 shadow-[8px_0_32px_rgba(0,0,0,0.55)] transition-transform duration-200 ' +
            (sidebarHovered ? 'translate-x-0' : '-translate-x-full')
          : 'relative w-[350px] min-w-[350px] transition-all duration-200',
        'max-md:!static max-md:!w-full max-md:!translate-x-0 max-md:!h-auto max-md:!max-h-[50vh] max-md:order-2 max-md:border-r-0 max-md:border-b max-md:border-border',
      ]"
    >
      <!-- Collapse / pin toggle -->
      <button
        @click="toggleSidebar"
        :title="sidebarCollapsed ? 'Pin panel open' : 'Auto-hide panel (peek on hover)'"
        :aria-label="sidebarCollapsed ? 'Pin panel open' : 'Auto-hide panel'"
        class="absolute top-2 right-2 z-50 w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-accent hover:bg-hover cursor-pointer transition-colors border-none bg-transparent"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :style="{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <!-- Sidebar floating hearts -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <span
          v-for="(h, i) in sidebarHearts"
          :key="i"
          class="absolute bottom-[-20px] text-[10px] text-accent opacity-0"
          :style="{
            left: h.left,
            animation: `sidebar-heart-float ${h.dur}s linear infinite`,
            'animation-delay': `${h.delay}s`,
          }"
        >
          &#9829;
        </span>
      </div>

      <div class="flex flex-col flex-1 min-h-0 relative z-10">
        <RoomHeader
          :code="room.state.roomCode ?? '-----'"
          :client-count="room.state.clientCount"
          :viewers="room.state.viewers"
          :is-host="room.state.isHost"
        />

        <UrlInput v-if="room.state.isHost" :initial-url="room.state.sourceUrl ?? ''" :on-load="handleLoadUrl" />

        <EpisodeBar
          v-if="room.state.show"
          :title="room.state.show.title"
          :episodes="episodes()"
          :current-episode="room.state.currentEpisode"
          :is-host="room.state.isHost"
          :on-select="handleEpisodeSelect"
          :on-open-list="() => (episodesOpen = true)"
        />

        <AdvancedChat />
      </div>

      <!-- Episodes overlay — slides up over the sidebar so the chat keeps full height -->
      <Transition name="ep-fade">
        <div v-if="episodesOpen" class="absolute inset-0 z-40 flex flex-col" @keydown.escape="episodesOpen = false">
          <div class="absolute inset-0 bg-black/55 backdrop-blur-sm" @click="episodesOpen = false" />
          <div
            class="relative isolate mt-auto flex flex-col max-h-[calc(100%-120px)] bg-sidebar-gradient border-t border-border rounded-t-2xl overflow-hidden shadow-[0_-8px_32px_rgba(0,0,0,0.55)] [transform:translateZ(0)]"
            style="animation: ep-slide-up 0.22s ease-out"
          >
            <div class="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <span class="text-xs font-semibold text-muted uppercase tracking-wide">Episodes {{ "♥" }}</span>
              <button
                @click="episodesOpen = false"
                class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-hover text-muted hover:text-text cursor-pointer border-none bg-transparent text-sm"
              >
                {{ "✕" }}
              </button>
            </div>
            <div class="overflow-y-auto overscroll-none">
              <DubSelector
                v-if="room.state.show"
                :dubs="room.state.show.dubs"
                :value="room.state.dubIndex"
                :on-change="room.setDub"
                :is-host="room.state.isHost"
              />
              <EpisodeList
                v-if="episodes().length > 0"
                :episodes="episodes()"
                :current-id="room.state.currentEpisode?.id"
                :watched-ids="watchedIds()"
                :is-host="room.state.isHost"
                :on-select="handleEpisodeSelectFromList"
                :on-toggle-watched="handleToggleWatched"
              />
            </div>
          </div>
        </div>
      </Transition>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col min-w-0 bg-black max-md:order-1 max-md:min-h-[40vh]">
      <VideoPlayer
        :stream-url="room.state.streamUrl"
        :is-host="room.state.isHost"
        :is-playing="room.state.isPlaying"
        :current-time="room.state.currentTime"
        :initial-seek="initialSeek"
        :on-play="(t: number) => room.sendPlay(t)"
        :on-pause="(t: number) => room.sendPause(t)"
        :on-seek="(t: number) => room.sendSeek(t)"
        :on-sync="(t: number, p: boolean) => room.sendSync(t, p)"
        :on-time-update="handleTimeUpdate"
        :on-pause-with-duration="handlePause"
      >
        <SeekOverlay />
        <ReactionBar :on-reaction="(e: string) => room.sendReaction(e)" :last-reaction="room.state.lastReaction" />
        <FullscreenChat
          :messages="room.state.chat"
          :on-send="(text: string) => room.sendChat(text)"
          :on-typing="() => room.sendTyping()"
        />
        <WebcamOverlay />
        <!-- <CameraToggle /> -->

        <!-- Player overlay — shown when no video -->
        <div
          v-if="!room.state.streamUrl"
          class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          :style="{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(232, 67, 147, 0.06) 0%, rgba(0, 0, 0, 0.8) 70%)',
          }"
        >
          <div class="text-center">
            <span class="block text-5xl text-accent mb-3" :style="{ animation: 'heart-pulse 2s ease-in-out infinite' }">
              &#9829;
            </span>
            <p class="text-muted text-[15px] tracking-wide">Pick something to watch together</p>
          </div>
        </div>
      </VideoPlayer>
    </main>
  </div>
</template>
