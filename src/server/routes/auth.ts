import { Elysia, t } from "elysia"
import { db } from "../db"
import { users } from "../db/schema"
import { eq } from "drizzle-orm"

export default new Elysia().post(
  "/api/auth",
  async ({ body, status }) => {
    try {
      const { username, password } = body
      const existing = await db.select().from(users).where(eq(users.username, username)).limit(1)

      if (existing.length > 0) {
        const valid = await Bun.password.verify(password, existing[0].passwordHash)
        if (!valid) return status(401, { error: "Wrong password" })
        return { user: { id: existing[0].id, username: existing[0].username } }
      }

      const hash = await Bun.password.hash(password)
      const [newUser] = await db
        .insert(users)
        .values({ username, passwordHash: hash })
        .returning({ id: users.id, username: users.username })
      return { user: newUser, created: true }
    } catch (e) {
      console.error("[Auth] Error:", e)
      return status(500, { error: "Something went wrong, try again" })
    }
  },
  { body: t.Object({ username: t.String(), password: t.String() }) },
)
