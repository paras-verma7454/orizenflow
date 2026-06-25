import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { env } from "@/lib/env"
import * as schema from "./schema"

type Database = ReturnType<typeof drizzle<typeof schema>>

declare global {
  var db: Database | undefined
}

let db: Database

if (env.NODE_ENV === "production") {
  const client = postgres(env.POSTGRES_URL, {
    prepare: false,
    connection: {
      application_name: "orizenflow",
    },
  })
  db = drizzle({ client, schema })
} else {
  if (!global.db) {
    const client = postgres(env.POSTGRES_URL, {
      prepare: false,
    })
    global.db = drizzle({ client, schema })
  }
  db = global.db
}

export { db }
export * from "./schema"
