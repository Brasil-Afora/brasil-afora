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
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
    max: 10,
    ...(env.DATABASE_SSL_CA
      ? { ssl: { ca: env.DATABASE_SSL_CA, rejectUnauthorized: true } }
      : {}),
  });

export const pgPool = pool;

globalThis.__brasilAforaPgPool = pool;

export const db = drizzle({
  client: pool,
  schema,
  casing: "snake_case",
});
