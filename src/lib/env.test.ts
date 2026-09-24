import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED_VARS: Record<string, string> = {
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/brasil_afora",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  RESEND_API_KEY: "re_test",
  RESEND_FROM_EMAIL: "Brasil Afora <noreply@example.org>",
};

const MISSING_CORS_MESSAGE =
  "Missing required environment variable: CORS_ORIGIN";

const loadEnv = async () => {
  vi.resetModules();
  return (await import("./env")).env;
};

beforeEach(() => {
  for (const [key, value] of Object.entries(REQUIRED_VARS)) {
    vi.stubEnv(key, value);
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("CORS_ORIGIN", () => {
  it("defaults to localhost outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CORS_ORIGIN", "");
    const env = await loadEnv();
    expect(env.CORS_ORIGIN).toEqual(["http://localhost:3000"]);
  });

  it("parses a comma-separated allowlist", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv(
      "CORS_ORIGIN",
      "https://brasil-afora.vercel.app, https://example.org ,,"
    );
    const env = await loadEnv();
    expect(env.CORS_ORIGIN).toEqual([
      "https://brasil-afora.vercel.app",
      "https://example.org",
    ]);
  });

  it("throws a clear error in production when CORS_ORIGIN is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CORS_ORIGIN", "");
    await expect(loadEnv()).rejects.toThrow(MISSING_CORS_MESSAGE);
  });

  it("accepts an explicit CORS_ORIGIN in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CORS_ORIGIN", "https://brasil-afora.vercel.app");
    const env = await loadEnv();
    expect(env.CORS_ORIGIN).toEqual(["https://brasil-afora.vercel.app"]);
  });
});
