<script setup lang="ts">
import { computed } from "vue"
import { RouterLink } from "vue-router"
import { useAuthStore } from "../../stores/auth"
import { useThemeStrings } from "../../lib/themeStrings"
import ThemeToggle from "../ui/ThemeToggle.vue"
import { useFriendRequests } from "../../queries/friends"

const auth = useAuthStore()
const s = useThemeStrings()
const userId = () => auth.user?.id
const friendRequests = useFriendRequests(userId)
const requestCount = computed(() => friendRequests.data.value?.length ?? 0)
</script>

<template>
  <nav class="h-[52px] flex items-center px-5 relative z-10 shrink-0">
    <span class="text-sm font-bold text-gradient mr-6 select-none">
      Watch<template v-if="s.showHearts">&nbsp;<span :style="{ '-webkit-text-fill-color': 'var(--color-accent)' }">♥</span>&nbsp;</template><template v-else> </template>Together
    </span>

    <div class="flex gap-1">
      <RouterLink
        to="/"
        class="px-3 py-1.5 rounded-md text-[13px] font-medium text-muted transition-colors hover:text-text hover:bg-hover"
        active-class="!text-accent !bg-accent/10"
        exact-active-class="!text-accent !bg-accent/10"
      >
        Home
      </RouterLink>
      <RouterLink
        to="/discover"
        class="px-3 py-1.5 rounded-md text-[13px] font-medium text-muted transition-colors hover:text-text hover:bg-hover"
        active-class="!text-accent !bg-accent/10"
      >
        Discover
      </RouterLink>
      <RouterLink
        to="/loved-ones"
        class="px-3 py-1.5 rounded-md text-[13px] font-medium text-muted transition-colors hover:text-text hover:bg-hover inline-flex items-center"
        active-class="!text-accent !bg-accent/10"
      >
        {{ s.navFriends }}
        <span
          v-if="requestCount > 0"
          class="bg-accent text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full inline-flex items-center justify-center ml-1 shadow-[0_0_8px_var(--color-accent-glow)]"
          :style="{ animation: 'badge-pulse 2s ease-in-out infinite' }"
        >
          {{ requestCount }}
        </span>
      </RouterLink>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <ThemeToggle />
      <span class="text-[13px] text-muted">{{ auth.user?.username }}</span>
      <button
        @click="auth.logout()"
        class="bg-transparent border-none text-[12px] text-muted cursor-pointer underline hover:text-accent transition-colors"
      >
        Sign out
      </button>
    </div>
  </nav>
</template>
