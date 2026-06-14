import { onUnmounted } from "vue"
import { useQueryClient } from "@tanstack/vue-query"
import * as ws from "../services/ws"
import type { WSServerMessage } from "../../shared/ws-types"

/**
 * Listens for friend-related WS events and invalidates the matching vue-query
 * caches. Call once from a long-lived component (e.g. the authed App shell).
 */
export function useFriendsWS() {
  const qc = useQueryClient()

  function handleMessage(msg: WSServerMessage) {
    switch (msg.type) {
      case "friend-request-received":
        qc.invalidateQueries({ queryKey: ["friend-requests"] })
        break
      case "friend-request-cancelled":
        qc.invalidateQueries({ queryKey: ["friend-requests"] })
        qc.invalidateQueries({ queryKey: ["sent-requests"] })
        break
      case "friend-accepted":
        qc.invalidateQueries({ queryKey: ["friends"] })
        qc.invalidateQueries({ queryKey: ["sent-requests"] })
        break
      case "friend-removed":
        qc.invalidateQueries({ queryKey: ["friends"] })
        break
    }
  }

  ws.addMessageHandler(handleMessage)

  onUnmounted(() => {
    ws.removeMessageHandler(handleMessage)
  })
}
