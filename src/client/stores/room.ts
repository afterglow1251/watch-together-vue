import { defineStore } from "pinia"
import { reactive } from "vue"
import type { Episode, ParsedShow, RoomInfo } from "../../shared/types"
import type { WSServerMessage } from "../../shared/ws-types"
import * as ws from "../services/ws"
import { playNotificationBeep } from "../services/audio"
import { useAuthStore } from "./auth"

export interface ChatMsgReaction {
  emoji: string
  count: number
  reacted: boolean
}

export interface ChatMsg {
  name: string
  text: string
  isMe: boolean
  id: number
  time: number
  msgId: number
  edited?: boolean
  replyTo?: { msgId: number; name: string; text: string }
  reactions: ChatMsgReaction[]
}

export interface RoomState {
  connected: boolean
  roomCode: string | null
  isHost: boolean
  clientCount: number
  viewers: string[]
  show: ParsedShow | null
  sourceUrl: string | null
  currentEpisode: Episode | null
  streamUrl: string | null
  dubIndex: number
  isPlaying: boolean
  currentTime: number
  chat: ChatMsg[]
  typingUser: string | null
  lastReaction: { emoji: string; id: number } | null
  replyingTo: ChatMsg | null
}

let chatIdCounter = 0
let reactionIdCounter = 0

export const useRoomStore = defineStore("room", () => {
  const auth = useAuthStore()
  const getUsername = () => auth.user?.username ?? "Guest"
  const getUserId = () => auth.user?.id

  let typingTimer: ReturnType<typeof setTimeout> | null = null
  let syncInterval: ReturnType<typeof setInterval> | null = null

  const state = reactive<RoomState>({
    connected: false,
    roomCode: null,
    isHost: false,
    clientCount: 0,
    viewers: [],
    show: null,
    sourceUrl: null,
    currentEpisode: null,
    streamUrl: null,
    dubIndex: 0,
    isPlaying: false,
    currentTime: 0,
    chat: [],
    typingUser: null,
    lastReaction: null,
    replyingTo: null,
  })

  function setupRoom(room: RoomInfo) {
    ws.setClientId(room.clientId)
    ws.setReconnectInfo(room.code, getUsername(), getUserId())
    if (syncInterval) clearInterval(syncInterval)
    syncInterval = null

    // Build reaction lookup from serialized chatReactions
    const reactionsByMsg = new Map<number, ChatMsgReaction[]>()
    for (const r of room.chatReactions) {
      if (!reactionsByMsg.has(r.msgId)) reactionsByMsg.set(r.msgId, [])
      reactionsByMsg.get(r.msgId)!.push({
        emoji: r.emoji,
        count: r.users.length,
        reacted: r.users.includes(getUsername()),
      })
    }

    // Restore chat messages from server history
    const restoredChat: ChatMsg[] = room.chatHistory.map((m) => ({
      name: m.name,
      text: m.text,
      isMe: m.name === getUsername(),
      id: ++chatIdCounter,
      time: m.time,
      msgId: m.msgId,
      edited: m.edited,
      replyTo: m.replyTo,
      reactions: reactionsByMsg.get(m.msgId) ?? [],
    }))

    state.connected = true
    state.roomCode = room.code
    state.isHost = room.isHost
    state.clientCount = room.clientCount
    state.viewers = room.viewers
    state.show = room.show
    state.sourceUrl = room.sourceUrl
    state.currentEpisode = room.currentEpisode
    state.streamUrl = room.streamUrl
    state.dubIndex = room.dubIndex ?? 0
    state.isPlaying = room.isPlaying
    state.currentTime = room.currentTime
    state.chat = restoredChat
  }

  function handleMessage(msg: WSServerMessage) {
    switch (msg.type) {
      case "room-info":
        setupRoom(msg.room)
        break
      case "show-loaded": {
        const sameShow = msg.sourceUrl && msg.sourceUrl === state.sourceUrl
        state.show = msg.show
        state.sourceUrl = msg.sourceUrl || state.sourceUrl
        // Keep current playback when re-loading the same URL
        state.currentEpisode = sameShow ? state.currentEpisode : null
        state.streamUrl = sameShow ? state.streamUrl : null
        state.dubIndex = sameShow ? state.dubIndex : 0
        break
      }
      case "dub-changed":
        state.dubIndex = msg.dubIndex
        break
      case "episode-changed":
        state.currentEpisode = msg.episode
        state.streamUrl = msg.streamUrl
        break
      case "play":
        state.isPlaying = true
        state.currentTime = msg.time
        break
      case "pause":
        state.isPlaying = false
        state.currentTime = msg.time
        break
      case "seek":
        state.currentTime = msg.time
        break
      case "sync":
        state.currentTime = msg.time
        state.isPlaying = msg.isPlaying
        break
      case "user-joined":
        state.clientCount = msg.count
        state.viewers = msg.viewers
        break
      case "user-left":
        state.clientCount = msg.count
        state.viewers = msg.viewers
        break
      case "chat": {
        const isMe = msg.name === getUsername()
        state.chat.push({
          name: msg.name,
          text: msg.text,
          isMe,
          id: ++chatIdCounter,
          time: msg.time,
          msgId: msg.msgId,
          replyTo: msg.replyTo,
          reactions: [],
        })
        if (!isMe) playNotificationBeep()
        break
      }
      case "chat-reaction": {
        const chatMsg = state.chat.find((m) => m.msgId === msg.msgId)
        if (!chatMsg) break
        const existing = chatMsg.reactions.find((r) => r.emoji === msg.emoji)
        const isMe = msg.name === getUsername()
        if (msg.action === "add") {
          if (existing) {
            existing.count++
            if (isMe) existing.reacted = true
          } else {
            chatMsg.reactions.push({ emoji: msg.emoji, count: 1, reacted: isMe })
          }
        } else {
          if (existing) {
            existing.count--
            if (isMe) existing.reacted = false
            if (existing.count <= 0) {
              chatMsg.reactions.splice(chatMsg.reactions.indexOf(existing), 1)
            }
          }
        }
        break
      }
      case "chat-edit": {
        const chatMsg = state.chat.find((m) => m.msgId === msg.msgId)
        if (!chatMsg) break
        chatMsg.text = msg.text
        chatMsg.edited = true
        break
      }
      case "reaction":
        state.lastReaction = { emoji: msg.emoji, id: ++reactionIdCounter }
        break
      case "typing":
        state.typingUser = msg.name
        if (typingTimer) clearTimeout(typingTimer)
        typingTimer = setTimeout(() => (state.typingUser = null), 2000)
        break
      case "error":
        console.error("[WS] Error:", msg.message)
        break
    }
  }

  // Register the WS handler once (singleton store lives for the authed session)
  ws.addMessageHandler(handleMessage)

  // Auto-connect WS with identity when user is logged in
  const uid = getUserId()
  if (uid) {
    ws.connectWithIdentity(uid, getUsername())
  }

  function createRoom(name: string) {
    const sendJoin = () =>
      ws.send({ type: "join", clientId: ws.getClientId(), roomCode: "", name, userId: getUserId() })
    if (ws.isConnected()) {
      sendJoin()
    } else {
      ws.connect(sendJoin)
    }
  }

  function joinRoom(code: string, name: string) {
    const sendJoin = () =>
      ws.send({ type: "join", clientId: ws.getClientId(), roomCode: code, name, userId: getUserId() })
    if (ws.isConnected()) {
      sendJoin()
    } else {
      ws.connect(sendJoin)
    }
  }

  function leaveRoom() {
    if (syncInterval) clearInterval(syncInterval)
    syncInterval = null
    ws.send({ type: "disconnect", clientId: ws.getClientId() })
    ws.disconnect()
    state.connected = false
    state.roomCode = null
    state.isHost = false
    state.clientCount = 0
    state.viewers = []
    state.show = null
    state.sourceUrl = null
    state.currentEpisode = null
    state.streamUrl = null
    state.dubIndex = 0
    state.isPlaying = false
    state.currentTime = 0
    state.chat = []
    state.typingUser = null
  }

  function setShow(show: ParsedShow, sourceUrl: string) {
    ws.send({ type: "set-show", clientId: ws.getClientId(), show, sourceUrl })
  }

  function setDub(dubIndex: number) {
    state.dubIndex = dubIndex
    ws.send({ type: "set-dub", clientId: ws.getClientId(), dubIndex })
  }

  function selectEpisode(episode: Episode) {
    state.currentEpisode = episode
    state.streamUrl = null
    state.currentTime = 0
    state.isPlaying = false
    ws.send({ type: "select-episode", clientId: ws.getClientId(), episode })
  }

  function streamReady(streamUrl: string) {
    state.streamUrl = streamUrl
    ws.send({ type: "stream-ready", clientId: ws.getClientId(), streamUrl })
  }

  function sendPlay(time: number) {
    ws.send({ type: "play", clientId: ws.getClientId(), time })
  }

  function sendPause(time: number) {
    ws.send({ type: "pause", clientId: ws.getClientId(), time })
  }

  function sendSeek(time: number) {
    ws.send({ type: "seek", clientId: ws.getClientId(), time })
  }

  function sendSync(time: number, isPlaying: boolean) {
    ws.send({ type: "sync", clientId: ws.getClientId(), time, isPlaying })
  }

  function sendChat(text: string) {
    const replyTo = state.replyingTo?.msgId
    ws.send({ type: "chat", clientId: ws.getClientId(), text, replyTo })
    state.replyingTo = null
  }

  function sendChatEdit(msgId: number, text: string) {
    ws.send({ type: "chat-edit", clientId: ws.getClientId(), msgId, text })
  }

  function sendReaction(emoji: string) {
    ws.send({ type: "reaction", clientId: ws.getClientId(), emoji })
  }

  function sendChatReaction(msgId: number, emoji: string) {
    ws.send({ type: "chat-reaction", clientId: ws.getClientId(), msgId, emoji })
  }

  function sendTyping() {
    ws.send({ type: "typing", clientId: ws.getClientId() })
  }

  function setReplyingTo(msg: ChatMsg | null) {
    state.replyingTo = msg
  }

  return {
    state,
    getUsername,
    createRoom,
    joinRoom,
    leaveRoom,
    setShow,
    setDub,
    selectEpisode,
    streamReady,
    sendPlay,
    sendPause,
    sendSeek,
    sendSync,
    sendChat,
    sendChatEdit,
    sendReaction,
    sendChatReaction,
    sendTyping,
    setReplyingTo,
  }
})
