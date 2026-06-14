import { Elysia, t } from "elysia"
import { parsePage, extractStreamUrl, searchUakino, browseUakino, withTimeout } from "../scraper"

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : "Unknown error")

export default new Elysia()
  // Parse uakino URL
  .post(
    "/api/parse",
    async ({ body, status }) => {
      try {
        const show = await withTimeout(parsePage(body.url), 30000, "Timed out loading page (30s)")
        return { show }
      } catch (e) {
        return status(500, { error: errMsg(e) })
      }
    },
    { body: t.Object({ url: t.String() }) },
  )

  // Extract stream URL from player page
  .post(
    "/api/stream",
    async ({ body, status }) => {
      try {
        const streamUrl = await withTimeout(extractStreamUrl(body.url), 30000, "Timed out extracting stream (30s)")
        return { streamUrl }
      } catch (e) {
        return status(500, { error: errMsg(e) })
      }
    },
    { body: t.Object({ url: t.String() }) },
  )

  // Search uakino
  .get("/api/search", async ({ query, status }) => {
    const q = ((query.q as string) || "").trim()
    const page = parseInt(query.page as string) || 1
    if (!q) return status(400, { error: "Missing query" })

    try {
      const results = await withTimeout(searchUakino(q, page), 15000, "Search timed out (15s)")
      return { results }
    } catch (e) {
      return status(500, { error: errMsg(e) })
    }
  })

  // Browse uakino by category
  .get("/api/browse", async ({ query, status }) => {
    const category = ((query.category as string) || "").trim()
    const page = parseInt(query.page as string) || 1
    if (!category) return status(400, { error: "Missing category" })

    try {
      const results = await withTimeout(browseUakino(category, page), 15000, "Browse timed out (15s)")
      return { results }
    } catch (e) {
      return status(500, { error: errMsg(e) })
    }
  })
