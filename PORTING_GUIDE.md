# Solid → Vue 3 Porting Guide (watch-together-vue)

You are porting components from the SolidJS original
(`/Users/yuriivoitko/Desktop/not_work/watch-together/src/client/`) to Vue 3 SFCs in
this project (`/Users/yuriivoitko/Desktop/not_work/watch-together-vue/src/client/`).

**Read the original `.tsx`, write a `.vue` with identical behaviour, markup, classes and styles.**

## Hard rules

- Use `<script setup lang="ts">` + `.vue` Single File Components.
- **Keep Tailwind classes, inline styles, SVGs, animations, text content EXACTLY the same.** This is a
  behaviour-preserving port, not a redesign.
- **Callback props stay callback props.** If the Solid component took `onSend: (t) => void`, keep a prop
  named `onSend` of the same signature and call `props.onSend(t)`. Do NOT convert to `defineEmits`. This keeps
  parent/child contracts identical across the whole tree. Parents pass them as `:on-send="handler"`.
- Data props keep their names and types. Declare with `defineProps<{...}>()`.
  For optional/nullable props use `?` and union types just like the original.

## API translation table

| Solid | Vue 3 |
|---|---|
| `createSignal(x)` → `const [a, setA] = ...` | `const a = ref(x)`; read `a.value`, write `a.value = ...` |
| `createMemo(() => ...)` | `computed(() => ...)` |
| `createEffect(() => ...)` | `watchEffect(() => ...)` (or `watch` for specific deps) |
| `onMount(fn)` | `onMounted(fn)` |
| `onCleanup(fn)` | `onUnmounted(fn)` or return cleanup from `watch`/`watchEffect` |
| `<Show when={c}>` / `fallback` | `v-if="c"` / `v-else` |
| `<For each={list}>{(item) => ...}</For>` | `v-for="item in list" :key="..."` |
| `<Portal>` | `<Teleport to="body">` |
| `class={x ? 'a' : 'b'}` | `:class="x ? 'a' : 'b'"` |
| `style={{ "max-height": "120px" }}` | `:style="{ maxHeight: '120px' }"` or `style="max-height:120px"` |
| `onClick={fn}` / `onInput` / `onKeyDown` | `@click="fn"` / `@input` / `@keydown` |
| `ref={el}` (DOM ref) | `ref="elName"` + `const elName = ref<HTMLElement>()` (use `useTemplateRef` or `ref`) |
| `lucide-solid` icons | `lucide-vue-next` (same icon names, used as `<IconName />`) |
| `import { A } from "@solidjs/router"` | `<RouterLink :to="...">` |
| `useNavigate()` | `useRouter()` → `router.push(...)` |
| `useParams()` | `useRoute()` → `route.params` |
| `solid-toast` | unchanged — `import toast from "../lib/toast"` (default export, `toast(msg)` / `toast.error(msg)`) |

## Store APIs (Pinia) — these already exist, just consume them

```ts
import { useAuthStore } from "../stores/auth"
const auth = useAuthStore()
// auth.user (User|null, reactive), auth.isLoggedIn (boolean), auth.login(u,p), auth.logout()

import { useRoomStore } from "../stores/room"
const room = useRoomStore()
// room.state.<field>  (reactive RoomState: connected, roomCode, isHost, clientCount, viewers,
//   show, sourceUrl, currentEpisode, streamUrl, dubIndex, isPlaying, currentTime, chat,
//   typingUser, lastReaction, replyingTo)
// room.getUsername(), room.createRoom(name), room.joinRoom(code,name), room.leaveRoom(),
// room.setShow(show,url), room.setDub(i), room.selectEpisode(ep), room.streamReady(url),
// room.sendPlay(t), room.sendPause(t), room.sendSeek(t), room.sendSync(t,playing),
// room.sendChat(text), room.sendChatEdit(id,text), room.sendReaction(emoji),
// room.sendChatReaction(id,emoji), room.sendTyping(), room.setReplyingTo(msg)
// Types: import type { ChatMsg, ChatMsgReaction } from "../stores/room"

import { useWebcamStore } from "../stores/webcam"
const webcam = useWebcamStore()
// webcam.cameraOn, webcam.localStream, webcam.remoteStreams, webcam.visibleRemoteStreams,
// webcam.selfPreviewHidden, webcam.isRemoteHidden(id), webcam.toggleCamera(),
// webcam.toggleSelfPreview(), webcam.toggleRemoteVisibility(id)

import { useConfirm } from "../stores/confirm"
const confirm = useConfirm()           // const ok = await confirm({ title, message, confirmText?, cancelText?, danger? })
```

Note: in `<script setup>`, when you destructure a Pinia store you lose reactivity — keep the store object
(`auth.user`, `room.state.isPlaying`) or use `storeToRefs`.

## Queries (vue-query) — already ported, consume them

Hook names unchanged (`useFriends`, `useSearch`, `useToggleWatched`, …). Params are **getter functions**:
`useFriends(() => auth.user?.id)`. A query result exposes refs: in `<script>` use `result.data.value`,
`result.isLoading.value`; in `<template>` they auto-unwrap (`query.data`). Mutations: `m.mutate(args)`,
`m.mutateAsync(args)`, `m.isPending`.

## Imports / paths

Same relative depth as the original (e.g. a file in `components/room/` imports stores via `../../stores/...`).
Child components are imported by their `.vue` path: `import Chat from "./Chat.vue"`.
