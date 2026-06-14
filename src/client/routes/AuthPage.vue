<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"
import FloatingHearts from "../components/layout/FloatingHearts.vue"
import Card from "../components/layout/Card.vue"

const auth = useAuthStore()
const router = useRouter()
const username = ref("")
const password = ref("")
const error = ref("")
const loading = ref(false)

// Redirect if already logged in
if (auth.isLoggedIn) router.replace("/")

function focusPassword() {
  ;(document.getElementById("pw") as HTMLInputElement | null)?.focus()
}

async function handleSubmit(e: Event) {
  e.preventDefault()
  if (!username.value.trim() || !password.value) {
    error.value = "Enter username and password"
    return
  }
  loading.value = true
  error.value = ""
  try {
    await auth.login(username.value.trim(), password.value)
    router.replace("/")
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Connection error"
  }
  loading.value = false
}
</script>

<template>
  <div class="h-screen flex items-center justify-center relative bg-auth-gradient">
    <FloatingHearts />
    <Card>
      <h1 class="text-[28px] font-bold mb-1.5 text-gradient">
        Watch{{ " " }}
        <span class="text-accent" :style="{ '-webkit-text-fill-color': 'var(--color-accent)' }"> &#9829; </span
        >{{ " " }}
        Together
      </h1>
      <p class="text-muted text-sm mb-8">Sign in to your movie night</p>

      <form @submit="handleSubmit" class="text-left">
        <div class="mb-3">
          <label class="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Username</label>
          <input
            type="text"
            :value="username"
            @input="username = ($event.currentTarget as HTMLInputElement).value"
            placeholder="Your name"
            :maxlength="20"
            autocomplete="username"
            class="w-full px-3.5 py-2.5 bg-input border border-border rounded-md text-text text-sm outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
            @keydown.enter="focusPassword"
          />
        </div>
        <div class="mb-3">
          <label class="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Password</label>
          <input
            id="pw"
            type="password"
            :value="password"
            @input="password = ($event.currentTarget as HTMLInputElement).value"
            placeholder="Password"
            autocomplete="current-password"
            class="w-full px-3.5 py-2.5 bg-input border border-border rounded-md text-text text-sm outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
          />
        </div>

        <p v-if="error" class="text-danger text-[13px] mb-3 text-left">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full inline-flex items-center justify-center px-5 py-2.5 bg-accent text-white rounded-md text-sm font-semibold cursor-pointer transition-all hover:bg-accent-dark hover:shadow-[0_4px_16px_var(--color-accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? "Signing in..." : "Sign in" }}
        </button>
      </form>

      <p class="text-muted text-xs mt-4">No account? It'll be created automatically</p>
    </Card>
  </div>
</template>
