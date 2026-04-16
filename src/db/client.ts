import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import { schema } from "./schema";

declare global {
  var __brasilAforaPgPool: Pool | undefined;
}

const pool =
  globalThis.__brasilAforaPgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__brasilAforaPgPool = pool;
}

export const db = drizzle({
  client: pool,
  schema,
  casing: "snake_case",
});
