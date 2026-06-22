<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "../stores/auth"
import {
  useFriends,
  useFriendRequests,
  useSentRequests,
  useSendFriendRequest,
  useAcceptFriend,
  useRejectFriend,
  useCancelRequest,
  useRemoveFriend,
} from "../queries/friends"
import { api } from "../services/api"
import toast from "../lib/toast"
import { UserPlus, Check, X, Undo2 } from "lucide-vue-next"
import { useConfirm } from "../stores/confirm"
import { useThemeStrings } from "../lib/themeStrings"
import SharedLibraryView from "./SharedLibraryView.vue"

const s = useThemeStrings()

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const userId = () => auth.user?.id

const friends = useFriends(userId)
const requests = useFriendRequests(userId)
const sentRequests = useSentRequests(userId)
const sendRequest = useSendFriendRequest()
const acceptFriend = useAcceptFriend()
const rejectFriend = useRejectFriend()
const cancelRequest = useCancelRequest()
const removeFriend = useRemoveFriend()

const confirm = useConfirm()

const selectedFriend = computed(() => {
  const fid = parseInt((route.params.friendId as string) ?? "")
  if (!fid || !friends.data.value) return null
  return friends.data.value.find((f) => f.userId === fid) ?? null
})

const searchQuery = ref("")
const searchResults = ref<{ id: number; username: string }[]>([])
const highlightedIndex = ref(-1)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearchInput(q: string) {
  searchQuery.value = q
  highlightedIndex.value = -1
  if (searchTimer) clearTimeout(searchTimer)
  if (!q.trim()) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    try {
      const res = await api.searchUsers(q.trim(), userId()!)
      searchResults.value = res.users ?? []
    } catch {
      searchResults.value = []
    }
  }, 300)
}

function handleSearchKeyDown(e: KeyboardEvent) {
  const results = searchResults.value
  if (!results.length) return

  if (e.key === "ArrowDown") {
    e.preventDefault()
    highlightedIndex.value = highlightedIndex.value >= results.length - 1 ? -1 : highlightedIndex.value + 1
  } else if (e.key === "ArrowUp") {
    e.preventDefault()
    highlightedIndex.value = highlightedIndex.value <= -1 ? results.length - 1 : highlightedIndex.value - 1
  } else if (e.key === "Enter") {
    e.preventDefault()
    const idx = highlightedIndex.value
    if (idx >= 0 && idx < results.length) {
      handleSendRequest(results[idx].username)
    }
  } else if (e.key === "Escape") {
    searchResults.value = []
    highlightedIndex.value = -1
  }
}

function handleSendRequest(username: string) {
  searchQuery.value = ""
  searchResults.value = []
  highlightedIndex.value = -1
  sendRequest.mutate(
    { userId: userId()!, friendUsername: username },
    { onError: (e) => toast(e instanceof Error ? e.message : "Something went wrong") },
  )
}

async function handleAccept(friendshipId: number) {
  try {
    await acceptFriend.mutateAsync({ friendshipId })
  } catch (e) {
    toast(e instanceof Error ? e.message : "Something went wrong")
  }
}

async function handleReject(friendshipId: number) {
  try {
    await rejectFriend.mutateAsync({ friendshipId })
  } catch (e) {
    toast(e instanceof Error ? e.message : "Something went wrong")
  }
}

async function handleCancel(friendshipId: number) {
  try {
    await cancelRequest.mutateAsync({ friendshipId })
  } catch (e) {
    toast(e instanceof Error ? e.message : "Something went wrong")
  }
}

async function handleRemove(friendshipId: number, username: string) {
  const ok = await confirm({
    title: s.value.removeFriendTitle,
    message: s.value.removeFriendMessage(username),
    confirmText: "Remove",
    danger: true,
  })
  if (!ok) return
  try {
    await removeFriend.mutateAsync({ friendshipId, userId: userId()! })
    router.replace("/loved-ones")
  } catch (e) {
    toast(e instanceof Error ? e.message : "Something went wrong")
  }
}
</script>

<template>
  <div class="w-full max-w-[800px] mx-auto px-5 py-6">
    <SharedLibraryView
      v-if="selectedFriend"
      :user-id="userId()!"
      :friend="selectedFriend"
      :on-back="() => router.push('/loved-ones')"
      :on-remove="handleRemove"
    />
    <template v-else>
      <!-- Add friend search -->
      <div class="mb-6">
        <div class="relative">
          <input
            type="text"
            :value="searchQuery"
            @input="handleSearchInput(($event.currentTarget as HTMLInputElement).value)"
            @keydown="handleSearchKeyDown"
            placeholder="Search users to add..."
            class="w-full px-4 py-2.5 bg-input border border-border rounded-lg text-text text-sm outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
          />
          <div
            v-if="searchResults.length > 0"
            class="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg overflow-hidden z-20 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
          >
            <button
              v-for="(user, i) in searchResults"
              :key="user.id"
              @click="handleSendRequest(user.username)"
              @mouseenter="highlightedIndex = i"
              class="flex items-center justify-between w-full px-4 py-2.5 border-none text-left cursor-pointer transition-colors"
              :style="{ background: highlightedIndex === i ? 'var(--color-hover)' : 'transparent' }"
            >
              <span class="text-sm text-text">{{ user.username }}</span>
              <UserPlus :size="16" class="text-accent" />
            </button>
          </div>
        </div>
      </div>

      <!-- Pending requests (incoming) -->
      <div v-if="(requests.data.value?.length ?? 0) > 0" class="mb-6">
        <h3 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          Incoming requests ({{ requests.data.value!.length }})
        </h3>
        <div class="flex flex-col gap-2">
          <div
            v-for="req in requests.data.value"
            :key="req.friendshipId"
            class="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg"
          >
            <div>
              <span class="text-sm font-medium text-text">{{ req.senderUsername }}</span>
              <span class="text-xs text-muted ml-2">{{ s.friendRequest }}</span>
            </div>
            <div class="flex gap-2">
              <button
                @click="handleAccept(req.friendshipId)"
                class="w-8 h-8 rounded-full border border-success/30 bg-success/10 text-success cursor-pointer flex items-center justify-center hover:bg-success/20 transition-colors"
              >
                <Check :size="16" />
              </button>
              <button
                @click="handleReject(req.friendshipId)"
                class="w-8 h-8 rounded-full border border-danger/30 bg-danger/10 text-danger cursor-pointer flex items-center justify-center hover:bg-danger/20 transition-colors"
              >
                <X :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sent requests (outgoing) -->
      <div v-if="(sentRequests.data.value?.length ?? 0) > 0" class="mb-6">
        <h3 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          Sent requests ({{ sentRequests.data.value!.length }})
        </h3>
        <div class="flex flex-col gap-2">
          <div
            v-for="req in sentRequests.data.value"
            :key="req.friendshipId"
            class="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg"
          >
            <div>
              <span class="text-sm font-medium text-text">{{ req.receiverUsername }}</span>
              <span class="text-xs text-muted ml-2">pending...</span>
            </div>
            <button
              @click="handleCancel(req.friendshipId)"
              class="w-8 h-8 rounded-full border border-muted/30 bg-muted/10 text-muted cursor-pointer flex items-center justify-center hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors"
              title="Cancel request"
            >
              <Undo2 :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Friends list -->
      <template v-if="(friends.data.value?.length ?? 0) > 0">
        <h3 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          {{ s.friendsHeading(friends.data.value!.length) }}
        </h3>
        <div class="flex flex-col gap-2">
          <button
            v-for="friend in friends.data.value"
            :key="friend.friendshipId"
            @click="router.push(`/loved-ones/${friend.userId}`)"
            class="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg cursor-pointer hover:border-accent/30 hover:shadow-[0_2px_12px_rgba(232,67,147,0.08)] transition-all text-left w-full"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-accent text-sm font-bold"
              >
                {{ friend.username[0].toUpperCase() }}
              </div>
              <span class="text-sm font-medium text-text">{{ friend.username }}</span>
            </div>
            <span class="text-xs text-muted">View library</span>
          </button>
        </div>
      </template>
      <template v-else>
        <div
          v-if="
            !friends.isLoading.value &&
            !requests.isLoading.value &&
            !sentRequests.isLoading.value &&
            (requests.data.value?.length ?? 0) === 0 &&
            (sentRequests.data.value?.length ?? 0) === 0
          "
          class="text-center py-10 text-muted"
        >
          <div
            v-if="s.showHearts"
            class="text-4xl text-accent opacity-30 mb-3"
            :style="{ animation: 'heart-pulse 2s ease-in-out infinite' }"
          >
            &#9829;
          </div>
          <p class="text-sm">{{ s.noFriendsYet }}</p>
        </div>
      </template>
    </template>
  </div>
</template>
