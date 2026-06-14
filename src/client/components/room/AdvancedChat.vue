<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
// Vendored vue-advanced-chat source, used as a normal Vue component (NOT the
// web-component build) — so there is no Shadow DOM and our CSS applies directly.
import ChatWindow from "../../vendor/vac/lib/ChatWindow.vue"
import { useRoomStore } from "../../stores/room"
import type { ChatMsg } from "../../stores/room"

const room = useRoomStore()

const currentUserId = computed(() => room.getUsername())
const ROOM_ID = "watch-together"

// Flip false→true after mount so the component's message loader doesn't hang.
const messagesLoaded = ref(false)
onMounted(() => requestAnimationFrame(() => (messagesLoaded.value = true)))

function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString([], { day: "numeric", month: "short" })
}

// Our reactions only track count + whether *I* reacted. vue-advanced-chat wants
// a map emoji -> userId[]. Synthesize an array of the right length, putting the
// current user in it when `reacted` so the highlight + count line up.
function toReactions(msg: ChatMsg): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const r of msg.reactions) {
    const users: string[] = []
    if (r.reacted) users.push(currentUserId.value)
    let i = 0
    while (users.length < r.count) users.push(`anon-${i++}`)
    out[r.emoji] = users
  }
  return out
}

const users = computed(() => {
  const names = new Set<string>([currentUserId.value, ...room.state.viewers])
  for (const m of room.state.chat) names.add(m.name)
  return [...names].map((name) => ({ _id: name, username: name }))
})

const rooms = computed(() => {
  const typing = room.state.typingUser && room.state.typingUser !== currentUserId.value ? [room.state.typingUser] : []
  return [
    {
      roomId: ROOM_ID,
      roomName: "Chat",
      users: users.value,
      typingUsers: typing,
    },
  ]
})

const messages = computed(() =>
  room.state.chat.map((m) => ({
    _id: m.msgId,
    indexId: m.msgId,
    content: m.text,
    senderId: m.name,
    username: m.name,
    date: fmtDate(m.time),
    timestamp: fmtTime(m.time),
    edited: !!m.edited,
    reactions: toReactions(m),
    replyMessage: m.replyTo
      ? {
          _id: m.replyTo.msgId,
          // Resolve the quoted text live from the original message so edits to it
          // are reflected; fall back to the stored snapshot if it's no longer here.
          content: room.state.chat.find((o) => o.msgId === m.replyTo!.msgId)?.text ?? m.replyTo.text,
          senderId: m.replyTo.name,
          username: m.replyTo.name,
        }
      : undefined,
  })),
)

// Only Reply + Edit (own) — backend has no delete/forward.
const messageActions = [
  { name: "replyMessage", title: "Reply" },
  { name: "editMessage", title: "Edit", onlyMe: true },
]

// Match the app's dark / pink theme (vue-advanced-chat turns this into CSS vars).
const styles = {
  general: {
    color: "#f0c0d8",
    backgroundInput: "#2a1430",
    colorPlaceholder: "#a07088",
    backgroundScrollIcon: "#e84393",
  },
  icons: { dropdownScroll: "#fff" },
  container: { borderRadius: "0" },
  header: { background: "transparent", colorRoomName: "#f0c0d8" },
  content: { background: "transparent" },
  footer: { background: "transparent", backgroundReply: "rgba(232,67,147,0.12)" },
  message: {
    background: "#2a1430",
    backgroundMe: "#e84393",
    color: "#f0c0d8",
    colorStarted: "#a07088",
    backgroundReaction: "#241028",
    backgroundReactionMe: "rgba(232,67,147,0.25)",
    borderStyleReactionMe: "1px solid #e84393",
    colorReactionCounter: "#f0c0d8",
  },
}

type SendPayload = { content: string; replyMessage?: { _id: number | string } }
function onSendMessage(payload: SendPayload) {
  if (payload.replyMessage) {
    const original = room.state.chat.find((m) => m.msgId === Number(payload.replyMessage!._id))
    room.setReplyingTo(original ?? null)
  } else {
    room.setReplyingTo(null)
  }
  room.sendChat(payload.content)
}

function onEditMessage(payload: { messageId: number | string; newContent: string }) {
  room.sendChatEdit(Number(payload.messageId), payload.newContent)
}

function onReaction(payload: { messageId: number | string; reaction: { unicode: string } }) {
  // Backend toggles add/remove itself, so we ignore the `remove` flag.
  room.sendChatReaction(Number(payload.messageId), payload.reaction.unicode)
}

function onTyping() {
  room.sendTyping()
}
</script>

<template>
  <div class="flex-1 min-h-0 wt-chat">
    <ChatWindow
      theme="dark"
      :current-user-id="currentUserId"
      :rooms="rooms"
      :rooms-loaded="true"
      :messages="messages"
      :messages-loaded="messagesLoaded"
      :message-actions="messageActions"
      :text-messages="{ TYPE_MESSAGE: 'Write something sweet...' }"
      :styles="styles"
      :single-room="true"
      :show-add-room="false"
      :show-audio="false"
      :show-files="false"
      :show-reaction-emojis="true"
      :show-new-messages-divider="false"
      height="100%"
      @send-message="onSendMessage"
      @edit-message="onEditMessage"
      @send-message-reaction="onReaction"
      @typing-message="onTyping"
    />
  </div>
</template>

<!-- Global (unscoped) overrides — vue-advanced-chat renders in light DOM now,
     so plain CSS reaches it. -->
<style>
/* vue-advanced-chat assumes content-box (browser default), but Tailwind's
   preflight forces border-box on every element, which shrinks padded icons
   (e.g. the message dropdown svg uses width:17px + padding:5px). Restore
   content-box for its icon buttons. */
.wt-chat .vac-svg-button svg {
  box-sizing: content-box;
}

/* =========================================================================
   Make vue-advanced-chat look like the simpler (Solid) chat design.
   ========================================================================= */

/* Message bubbles: 13px text, roomy rounded bubble, no heavy shadow, a small
   "tail" corner on the sender's side. */
.wt-chat .vac-message-card {
  font-size: 13px !important;
  line-height: 1.6 !important;
  border-radius: 14px !important;
  padding: 7px 11px !important;
  box-shadow: none !important;
}
.wt-chat .vac-message-card.vac-message-current {
  border-bottom-right-radius: 5px !important;
}
.wt-chat .vac-message-card:not(.vac-message-current) {
  border-bottom-left-radius: 5px !important;
}

/* Sender name + timestamp — smaller, like the other client */
.wt-chat .vac-text-username {
  font-size: 11px !important;
  opacity: 0.7;
}
.wt-chat .vac-text-timestamp {
  font-size: 9px !important;
}

/* ---- Footer: pill input field + round buttons ---- */
.wt-chat .vac-box-footer {
  background: transparent !important;
  padding: 14px 20px 14px !important;
  align-items: center;
  gap: 6px;
}
.wt-chat .vac-textarea {
  font-size: 13px !important;
  line-height: 18px !important;
  height: 18px !important;
  min-height: 18px !important;
  padding: 8px 14px !important;
  border-radius: 18px !important;
  box-sizing: content-box !important;
  background: var(--color-input) !important;
  border: 1px solid var(--color-border) !important;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.wt-chat .vac-textarea:focus {
  border-color: var(--color-accent) !important;
  box-shadow: 0 0 0 3px var(--color-accent-glow) !important;
}
.wt-chat .vac-icon-textarea {
  margin-left: 6px !important;
  gap: 6px;
}
.wt-chat .vac-icon-textarea svg,
.wt-chat .vac-icon-textarea .vac-wrapper {
  margin: 0 !important;
}

/* Emoji icon → round subtle button */
.wt-chat .vac-icon-textarea .vac-emoji-wrapper .vac-svg-button {
  width: 36px !important;
  height: 36px !important;
  max-height: none !important;
  flex: 0 0 36px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-input);
  transition: background 0.15s;
}
.wt-chat .vac-icon-textarea .vac-emoji-wrapper .vac-svg-button:hover {
  background: var(--color-hover);
  transform: none !important;
  opacity: 1 !important;
}
.wt-chat .vac-icon-textarea .vac-emoji-wrapper .vac-svg-button svg {
  width: 20px !important;
  height: 20px !important;
}

/* Send → round pink circle with a white icon */
.wt-chat .vac-icon-textarea > .vac-svg-button:last-child {
  width: 36px !important;
  height: 36px !important;
  max-height: none !important;
  flex: 0 0 36px;
  border-radius: 9999px;
  background: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    opacity 0.15s;
}
.wt-chat .vac-icon-textarea > .vac-svg-button:last-child:hover {
  background: var(--color-accent-dark);
  transform: none !important;
  opacity: 1 !important;
}
/* Replace vue-advanced-chat's filled paper-plane with the original client's
   stroked send icon (via a mask), and keep the circle full-pink even when the
   field is empty (VAC dims it otherwise). */
.wt-chat .vac-icon-textarea > .vac-svg-button:last-child svg {
  display: none !important;
}
.wt-chat .vac-icon-textarea > .vac-svg-button:last-child::after {
  content: "";
  width: 17px;
  height: 17px;
  background-color: #fff;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 2 11 13'/%3E%3Cpath d='M22 2 15 22 11 13 2 9z'/%3E%3C/svg%3E")
    center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 2 11 13'/%3E%3Cpath d='M22 2 15 22 11 13 2 9z'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.wt-chat .vac-icon-textarea > .vac-svg-button.vac-send-disabled {
  opacity: 1;
}

/* Scroll-to-bottom button — dark elevated circle with a pink chevron so it
   stands out against both the pink bubbles and the dark background. */
.wt-chat .vac-icon-scroll {
  background: #1d1526 !important;
  border: 1px solid rgba(232, 67, 147, 0.45) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55) !important;
}
.wt-chat .vac-icon-scroll svg {
  fill: var(--color-accent) !important;
}

/* Drop the redundant "Chat" room header — it only wastes vertical space. */
.wt-chat .vac-room-header {
  display: none !important;
}

/* The input emoji picker is anchored to the (tiny) emoji button, so with the
   new button layout its 300px panel ran off the left edge of the sidebar.
   Make the wrapper non-positioned so the picker anchors to the footer instead
   and stays fully inside the sidebar. */
.wt-chat .vac-icon-textarea .vac-emoji-wrapper {
  position: static !important;
}
</style>

<style>
/* "Conversation started on …" + day divider — minimalist muted labels */
.wt-chat .vac-card-date,
.wt-chat .vac-text-started {
  background: transparent !important;
  box-shadow: none !important;
  color: #a07088 !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0.05em !important;
  text-transform: uppercase;
}
.wt-chat .vac-text-date {
  color: #a07088 !important;
}

/* The reaction picker is positioned in JS, anchored above the clicked message
   (see EmojiPickerContainer.setEmojiPickerPosition) for consistent placement.
   Keep it stacked above the sidebar's own overlays so it's never clipped. */
.vac-emoji-picker.vac-picker-reaction {
  z-index: 99999 !important;
}

/* Emoji popup container: drop the gray shadow, subtle pink border, no padding */
.wt-chat .vac-emoji-picker {
  box-shadow: none !important;
  border: 1px solid rgba(232, 67, 147, 0.18) !important;
  padding-top: 0 !important;
}

/* Message action menu (Reply / Edit). The gray background lives on
   .vac-menu-list (var(--chat-dropdown-bg-color)), not .vac-menu-options. */
.vac-menu-options {
  border: 1px solid rgba(232, 67, 147, 0.18) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
  border-radius: 8px !important;
}
.vac-menu-list {
  background: #241028 !important;
  padding: 0 !important;
}
.vac-menu-item {
  color: #f0c0d8 !important;
}
.vac-menu-list :hover {
  background: rgba(232, 67, 147, 0.15) !important;
}

/* Theme the nested emoji-picker-element via inherited custom properties.
   !important is required: vue-advanced-chat's own SCSS sets these vars with a
   higher-specificity selector (.vac-emoji-wrapper .vac-emoji-picker emoji-picker). */
.wt-chat emoji-picker {
  --background: #241028 !important;
  --border-color: rgba(232, 67, 147, 0.18) !important;
  --indicator-color: #e84393 !important;
  --input-border-color: rgba(232, 67, 147, 0.3) !important;
  --input-font-color: #f0c0d8 !important;
  --input-placeholder-color: #a07088 !important;
  --outline-color: #e84393 !important;
  --category-font-color: #a07088 !important;
  --button-active-background: rgba(232, 67, 147, 0.3) !important;
  --button-hover-background: rgba(232, 67, 147, 0.15) !important;
}

/* Minimalist themed scrollbar */
.wt-chat .vac-container-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(232, 67, 147, 0.4) transparent;
}
.wt-chat .vac-container-scroll::-webkit-scrollbar {
  width: 6px;
}
.wt-chat .vac-container-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.wt-chat .vac-container-scroll::-webkit-scrollbar-thumb {
  background: rgba(232, 67, 147, 0.35);
  border-radius: 3px;
}
.wt-chat .vac-container-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(232, 67, 147, 0.6);
}
</style>
