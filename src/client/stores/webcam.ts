import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { WSServerMessage } from "../../shared/ws-types"
import * as ws from "../services/ws"
import * as webrtc from "../services/webrtc"
import toast from "../lib/toast"

export const useWebcamStore = defineStore("webcam", () => {
  const cameraOn = ref(false)
  const localStream = ref<MediaStream | null>(null)
  const remoteStreams = ref<webrtc.RemoteWebcamStream[]>([])
  const selfPreviewHidden = ref(false)
  const hiddenRemoteIds = ref<string[]>([])

  webrtc.setCallbacks(
    (s) => (localStream.value = s),
    (s) => (remoteStreams.value = s),
  )

  const visibleRemoteStreams = computed(() =>
    remoteStreams.value.filter((stream) => !hiddenRemoteIds.value.includes(stream.clientId)),
  )

  function isRemoteHidden(clientId: string) {
    return hiddenRemoteIds.value.includes(clientId)
  }

  function handleMessage(msg: WSServerMessage) {
    switch (msg.type) {
      case "room-info":
        webrtc.syncActiveWebcams(msg.room.activeWebcams ?? [])
        break
      case "webrtc-sync":
        webrtc.syncActiveWebcams(msg.clients)
        break
      case "webrtc-ready":
        webrtc.handleWebrtcReady(msg.clientId, msg.name)
        break
      case "webrtc-offer":
        webrtc.handleOffer(msg.fromClientId, msg.sdp)
        break
      case "webrtc-answer":
        webrtc.handleAnswer(msg.fromClientId, msg.sdp)
        break
      case "webrtc-ice":
        webrtc.handleIceCandidate(msg.fromClientId, msg.candidate)
        break
      case "webrtc-stop":
        webrtc.handleRemoteStop(msg.clientId)
        hiddenRemoteIds.value = hiddenRemoteIds.value.filter((id) => id !== msg.clientId)
        break
    }
  }

  ws.addMessageHandler(handleMessage)

  async function toggleCamera() {
    if (cameraOn.value) {
      ws.send({ type: "webrtc-stop", clientId: ws.getClientId() })
      await webrtc.stopCamera()
      cameraOn.value = false
      selfPreviewHidden.value = false
    } else {
      try {
        await webrtc.startCamera()
        cameraOn.value = true
        selfPreviewHidden.value = false
        ws.send({ type: "webrtc-ready", clientId: ws.getClientId() })
      } catch {
        toast.error("Camera access denied")
      }
    }
  }

  function toggleSelfPreview() {
    selfPreviewHidden.value = !selfPreviewHidden.value
  }

  function toggleRemoteVisibility(clientId: string) {
    hiddenRemoteIds.value = hiddenRemoteIds.value.includes(clientId)
      ? hiddenRemoteIds.value.filter((id) => id !== clientId)
      : [...hiddenRemoteIds.value, clientId]
  }

  return {
    cameraOn,
    localStream,
    remoteStreams,
    visibleRemoteStreams,
    selfPreviewHidden,
    isRemoteHidden,
    toggleCamera,
    toggleSelfPreview,
    toggleRemoteVisibility,
  }
})
