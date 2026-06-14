import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { User } from "../../shared/types"
import { api } from "../services/api"

export const useAuthStore = defineStore("auth", () => {
  const stored = localStorage.getItem("wt_user")
  const user = ref<User | null>(stored ? JSON.parse(stored) : null)

  const isLoggedIn = computed(() => user.value !== null)

  // Throws on failure (api.auth turns a non-2xx into a thrown Error); callers catch.
  async function login(username: string, password: string): Promise<void> {
    const { user: authedUser } = await api.auth({ username, password })
    user.value = authedUser
    localStorage.setItem("wt_user", JSON.stringify(authedUser))
  }

  function logout() {
    user.value = null
    localStorage.removeItem("wt_user")
  }

  return { user, isLoggedIn, login, logout }
})
