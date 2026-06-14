import { defineWorkspace } from "vitest/config"
import vue from "@vitejs/plugin-vue"

export default defineWorkspace([
  {
    test: {
      name: "server",
      include: ["src/server/**/*.test.ts"],
      environment: "node",
    },
  },
  {
    plugins: [vue()],
    test: {
      name: "client",
      include: ["src/client/**/*.test.ts"],
      environment: "jsdom",
      setupFiles: ["./tests/setup-client.ts"],
    },
  },
  {
    test: {
      name: "shared",
      include: ["src/shared/**/*.test.ts"],
      environment: "node",
    },
  },
])
