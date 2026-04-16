const requireEnv = (value: string | undefined, key: string): string => {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return normalized;
};

const optionalEnv = (value: string | undefined, fallback: string): string => {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized;
};

export const env = {
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
  CORS_ORIGIN: optionalEnv(process.env.CORS_ORIGIN, "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  GOOGLE_CLIENT_ID: requireEnv(
    process.env.GOOGLE_CLIENT_ID,
    "GOOGLE_CLIENT_ID"
  ),
  GOOGLE_CLIENT_SECRET: requireEnv(
    process.env.GOOGLE_CLIENT_SECRET,
    "GOOGLE_CLIENT_SECRET"
  ),
} as const;
