import { treaty } from "@elysiajs/eden"
import type { App } from "../../server"

// Type-only import of the server App — erased at build time, so no server code
// is bundled into the client. Eden derives request/response types directly from
// the Elysia routes, so there are no hand-written API interfaces to keep in sync.
export const eden = treaty<App>(window.location.host)
