<script setup lang="ts">
import { watchEffect } from "vue"
import { Toaster } from "vue-sonner"
import { useAuthStore } from "./stores/auth"
import { useRoomStore } from "./stores/room"
import { useFriendsWS } from "./composables/useFriendsWS"
import { useThemeStrings } from "./lib/themeStrings"
import ConfirmDialog from "./components/ConfirmDialog.vue"
import CheckmarkIcon from "./components/ui/CheckmarkIcon.vue"
import ErrorIcon from "./components/ui/ErrorIcon.vue"

const auth = useAuthStore()
const s = useThemeStrings()

// Friend-related WS cache invalidation, active for the whole app lifetime.
useFriendsWS()

// Instantiate the room store once the user is logged in. Its setup connects the
// WebSocket with identity, mirroring the original RoomProvider lifecycle.
watchEffect(() => {
  if (auth.isLoggedIn) useRoomStore()
})
</script>

<template>
  <RouterView />
  <ConfirmDialog />
  <Toaster
    position="top-right"
    :toast-options="{
      style: s.toastStyle,
      duration: 4000,
    }"
  >
    <template #success-icon>
      <CheckmarkIcon />
    </template>
    <template #error-icon>
      <ErrorIcon />
    </template>
  </Toaster>
</template>
