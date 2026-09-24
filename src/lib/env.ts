const requireEnv = (value: string | undefined, key: string): string => {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return normalized;
};

const DEV_CORS_ORIGIN = "http://localhost:3000";

/**
 * Resolves the allowed CORS origins.
 *
 * In production `CORS_ORIGIN` is required so deployments fail fast with a
 * clear message instead of silently trusting an insecure default. Local
 * development keeps `http://localhost:3000` when the variable is unset.
 */
const corsOrigin = (): string[] => {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing required environment variable: CORS_ORIGIN " +
          '(set it to the production origin, e.g. "https://brasil-afora.vercel.app").'
      );
    }
    return [DEV_CORS_ORIGIN];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

export const env = {
  DATABASE_SSL_CA: process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n"),
  DATABASE_URL: requireEnv(process.env.DATABASE_URL, "DATABASE_URL"),
  BETTER_AUTH_URL: requireEnv(
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    "BETTER_AUTH_URL"
  ),
  BETTER_AUTH_SECRET: requireEnv(
    process.env.BETTER_AUTH_SECRET,
    "BETTER_AUTH_SECRET"
  ),
  RESEND_API_KEY: requireEnv(process.env.RESEND_API_KEY, "RESEND_API_KEY"),
  RESEND_FROM_EMAIL: requireEnv(
    process.env.RESEND_FROM_EMAIL,
    "RESEND_FROM_EMAIL"
  ),
  CORS_ORIGIN: corsOrigin(),
  GOOGLE_CLIENT_ID: requireEnv(
    process.env.GOOGLE_CLIENT_ID,
    "GOOGLE_CLIENT_ID"
  ),
  GOOGLE_CLIENT_SECRET: requireEnv(
    process.env.GOOGLE_CLIENT_SECRET,
    "GOOGLE_CLIENT_SECRET"
  ),
} as const;
