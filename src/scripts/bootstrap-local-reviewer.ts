import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db, pgPool } from "../db/client";
import { accounts } from "../db/schema/accounts";
import { users } from "../db/schema/users";

const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

const requiredInput = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const assertLocalDatabase = (databaseUrl: string): void => {
  const parsed = new URL(databaseUrl);
  if (!LOCAL_DATABASE_HOSTS.has(parsed.hostname)) {
    throw new Error(
      "Local reviewer bootstrap refuses to connect to a non-local database."
    );
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local reviewer bootstrap is disabled in production.");
  }
};

const bootstrap = async () => {
  const databaseUrl = requiredInput("DATABASE_URL");
  const email = requiredInput("LOCAL_REVIEWER_EMAIL").toLowerCase();
  const password = requiredInput("LOCAL_REVIEWER_PASSWORD");
  assertLocalDatabase(databaseUrl);
  if (password.length < 12) {
    throw new Error(
      "LOCAL_REVIEWER_PASSWORD must contain at least 12 characters."
    );
  }
  if (!email.endsWith(".local")) {
    throw new Error(
      "Local reviewer email must use the reserved .local suffix."
    );
  }

  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const userId = existingUsers[0]?.id ?? randomUUID();
  if (existingUsers.length === 0) {
    await db.insert(users).values({
      email,
      emailVerified: true,
      id: userId,
      name: "Local Brasil Afora Reviewer",
      role: "admin",
    });
  } else {
    await db
      .update(users)
      .set({ emailVerified: true, role: "admin", updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  const passwordHash = await hashPassword(password);
  const existingAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), eq(accounts.providerId, "credential"))
    )
    .limit(1);
  if (existingAccounts[0]) {
    await db
      .update(accounts)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(accounts.id, existingAccounts[0].id));
  } else {
    await db.insert(accounts).values({
      accountId: userId,
      password: passwordHash,
      providerId: "credential",
      userId,
    });
  }

  process.stdout.write(
    `${JSON.stringify({ email, role: "admin", user_id: userId }, null, 2)}\n`
  );
};

try {
  await bootstrap();
} finally {
  await pgPool.end();
}
