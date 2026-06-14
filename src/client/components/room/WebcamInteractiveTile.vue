<script setup lang="ts">
import interact from "interactjs"
import { ref, onMounted, onUnmounted } from "vue"

type Bounds = { width: number; height: number }
type Size = { width: number; height: number }

const MIN_SIZE: Size = { width: 120, height: 90 }

const props = defineProps<{
  overlayEl: () => HTMLDivElement | undefined
  mode: "local" | "remote"
  remoteIndex?: number
  defaultSize: Size
}>()

const tileEl = ref<HTMLDivElement>()

function setTilePosition(el: HTMLDivElement, x: number, y: number) {
  el.dataset.x = String(x)
  el.dataset.y = String(y)
  el.style.transform = `translate(${x}px, ${y}px)`
}

function getTilePosition(el: HTMLDivElement) {
  return {
    x: Number(el.dataset.x ?? 0),
    y: Number(el.dataset.y ?? 0),
  }
}

function setTileSize(el: HTMLDivElement, size: Size) {
  el.dataset.width = String(size.width)
  el.dataset.height = String(size.height)
  el.style.width = `${size.width}px`
  el.style.height = `${size.height}px`
}

function getTileSize(el: HTMLDivElement) {
  return {
    width: Number(el.dataset.width ?? el.offsetWidth ?? 0),
    height: Number(el.dataset.height ?? el.offsetHeight ?? 0),
  }
}

function applyDefaultPosition(el: HTMLDivElement, bounds: Bounds, mode: "local" | "remote", remoteIndex = 0) {
  const { width, height } = getTileSize(el)
  const x = Math.max(0, bounds.width - width - 12)

  if (mode === "local") {
    const y = Math.max(0, bounds.height - height - 12)
    setTilePosition(el, x, y)
    return
  }

  const y = Math.min(Math.max(0, 12 + remoteIndex * (height + 12)), Math.max(0, bounds.height - height))
  setTilePosition(el, x, y)
}

function clampTile(el: HTMLDivElement, bounds: Bounds) {
  const { x, y } = getTilePosition(el)
  const { width, height } = getTileSize(el)

  const nextX = Math.min(Math.max(0, x), Math.max(0, bounds.width - width))
  const nextY = Math.min(Math.max(0, y), Math.max(0, bounds.height - height))
  const nextWidth = Math.min(Math.max(MIN_SIZE.width, width), Math.max(MIN_SIZE.width, bounds.width - nextX))
  const nextHeight = Math.min(Math.max(MIN_SIZE.height, height), Math.max(MIN_SIZE.height, bounds.height - nextY))

  setTileSize(el, { width: nextWidth, height: nextHeight })
  setTilePosition(el, nextX, nextY)
}

let instance: ReturnType<typeof interact> | null = null
let handleWindowResize: (() => void) | null = null

onMounted(() => {
  const overlay = props.overlayEl()
  const el = tileEl.value
  if (!overlay || !el) return

  setTileSize(el, props.defaultSize)
  applyDefaultPosition(
    el,
    { width: overlay.clientWidth, height: overlay.clientHeight },
    props.mode,
    props.remoteIndex ?? 0,
  )

  instance = interact(el)

  instance.draggable({
    listeners: {
      move(event) {
        const current = getTilePosition(el)
        setTilePosition(el, current.x + event.dx, current.y + event.dy)
        clampTile(el, { width: overlay.clientWidth, height: overlay.clientHeight })
      },
    },
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: overlay,
        endOnly: false,
      }),
    ],
    inertia: false,
  })

  instance.resizable({
    edges: { left: true, right: true, bottom: true, top: true },
    modifiers: [
      interact.modifiers.restrictEdges({
        outer: overlay,
        endOnly: false,
      }),
      interact.modifiers.restrictSize({
        min: MIN_SIZE,
      }),
      interact.modifiers.aspectRatio({
        ratio: props.defaultSize.width / props.defaultSize.height,
      }),
    ],
    listeners: {
      move(event) {
        const current = getTilePosition(el)
        const nextWidth = event.rect.width
        const nextHeight = event.rect.height
        const nextX = current.x + event.deltaRect.left
        const nextY = current.y + event.deltaRect.top

        setTileSize(el, { width: nextWidth, height: nextHeight })
        setTilePosition(el, nextX, nextY)
        clampTile(el, { width: overlay.clientWidth, height: overlay.clientHeight })
      },
    },
    inertia: false,
  })

  handleWindowResize = () => {
    clampTile(el, { width: overlay.clientWidth, height: overlay.clientHeight })
  }

  window.addEventListener("resize", handleWindowResize)
})

onUnmounted(() => {
  if (handleWindowResize) window.removeEventListener("resize", handleWindowResize)
  instance?.unset()
})
</script>

<template>
  <div
    ref="tileEl"
    class="pointer-events-auto absolute left-0 top-0 z-40 touch-none select-none cursor-grab active:cursor-grabbing"
  >
    <slot />
  </div>
</template>
