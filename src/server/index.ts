import { Elysia } from "elysia"
import authRoutes from "./routes/auth"
import scraperRoutes from "./routes/scraper"
import watchedRoutes from "./routes/watched"
import libraryRoutes from "./routes/library"
import sharedLibraryRoutes from "./routes/shared-library"
import friendsRoutes from "./routes/friends"
import playbackRoutes from "./routes/playback"
import proxyRoutes from "./routes/proxy"
import wsHandler from "./ws/handler"
import staticFiles from "./static"

const PORT = process.env.PORT || 3000

const app = new Elysia()
  .use(authRoutes)
  .use(scraperRoutes)
  .use(watchedRoutes)
  .use(libraryRoutes)
  .use(sharedLibraryRoutes)
  .use(friendsRoutes)
  .use(playbackRoutes)
  .use(proxyRoutes)
  .use(wsHandler)
  .use(staticFiles) // must be last — wildcard catch-all
  .listen(PORT)

// Source of truth for Eden Treaty client typing (see src/client/services/eden.ts)
export type App = typeof app

console.log(`🎬 Watch Together running at http://localhost:${PORT}`)
