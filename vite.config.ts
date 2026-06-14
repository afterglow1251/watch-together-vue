import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // emoji-picker-element is a web component used inside the vendored chat
          isCustomElement: (tag) => tag === "emoji-picker",
        },
      },
    }),
    tailwindcss(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // The vendored vue-advanced-chat (src/client/vendor/vac) still uses Sass
        // @import. Silence that deprecation noise — it's third-party code we don't edit.
        quietDeps: true,
        silenceDeprecations: ["import"],
      },
    },
  },
  resolve: {
    // The vendored vue-advanced-chat source imports components without the .vue
    // extension (e.g. "./RoomsList/RoomsList"), so allow extensionless resolution.
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json", ".vue"],
  },
  build: {
    outDir: "dist/client",
    target: "esnext",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          plyr: ["plyr"],
          hls: ["hls.js"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
})
