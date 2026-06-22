import { defineStore } from "pinia"
import { ref, watch } from "vue"

export type Theme = "black" | "pink"

export const useThemeStore = defineStore("theme", () => {
  const stored = localStorage.getItem("theme") as Theme | null
  const theme = ref<Theme>(stored === "pink" ? "pink" : "black")

  function toggle() {
    theme.value = theme.value === "black" ? "pink" : "black"
  }

  watch(
    theme,
    (t) => {
      localStorage.setItem("theme", t)
      document.documentElement.dataset.theme = t
    },
    { immediate: true },
  )

  return { theme, toggle }
})
