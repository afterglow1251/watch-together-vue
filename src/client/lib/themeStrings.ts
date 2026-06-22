import { computed } from "vue"
import { useThemeStore } from "../stores/theme"
import type { Theme } from "../stores/theme"

const config: Record<Theme, {
  showHearts: boolean
  navFriends: string
  friendsHeading: (count: number) => string
  friendRequest: string
  noFriendsYet: string
  removeFriendTitle: string
  removeFriendMessage: (username: string) => string
  toastStyle: Record<string, string>
}> = {
  black: {
    showHearts: false,
    navFriends: "Friends",
    friendsHeading: (n) => `Friends (${n})`,
    friendRequest: "wants to be your friend",
    noFriendsYet: "No friends yet. Search and add someone above!",
    removeFriendTitle: "Remove friend",
    removeFriendMessage: (u) => `Are you sure you want to remove ${u} from your friends?`,
    toastStyle: {
      background: "#13131a",
      color: "#e4e4ed",
      border: "1px solid #2a2a3a",
      borderRadius: "12px",
      fontSize: "13px",
    },
  },
  pink: {
    showHearts: true,
    navFriends: "Loved Ones",
    friendsHeading: (n) => `Loved Ones (${n})`,
    friendRequest: "wants to be your loved one",
    noFriendsYet: "No loved ones yet. Search and add someone above!",
    removeFriendTitle: "Remove loved one",
    removeFriendMessage: (u) => `Are you sure you want to remove ${u} from your loved ones?`,
    toastStyle: {
      background: "linear-gradient(135deg, #1a1020, #2a1028)",
      color: "#f0c0d8",
      border: "1px solid rgba(232, 67, 147, 0.3)",
      borderRadius: "12px",
      fontSize: "13px",
    },
  },
}

export function useThemeStrings() {
  const theme = useThemeStore()
  return computed(() => config[theme.theme])
}
