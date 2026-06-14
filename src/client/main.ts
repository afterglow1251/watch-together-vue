import { createApp } from "vue"
import { createPinia } from "pinia"
import { VueQueryPlugin } from "@tanstack/vue-query"
import App from "./App.vue"
import { router } from "./router"
import "./styles/app.css"

const app = createApp(App)

app.use(createPinia())
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: { queries: { staleTime: 30_000 } },
  },
})
app.use(router)

app.mount("#app")
