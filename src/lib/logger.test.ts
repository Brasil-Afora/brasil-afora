import { afterEach, describe, expect, it, vi } from "vitest";
import { logError, sanitizeForLogging } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sanitizeForLogging", () => {
  it("redacts sensitive keys at any depth", () => {
    const sanitized = sanitizeForLogging({
      authorization: "Bearer super-secret",
      cookie: "session=abc",
      nested: {
        html: "<html>snapshot</html>",
        password: "hunter2",
        safe: "keep me",
      },
      snapshot: { token: "tok-123" },
    }) as Record<string, unknown>;

    expect(sanitized.authorization).toBe("[REDACTED]");
    expect(sanitized.cookie).toBe("[REDACTED]");
    expect((sanitized.nested as Record<string, unknown>).html).toBe(
      "[REDACTED]"
    );
    expect((sanitized.nested as Record<string, unknown>).password).toBe(
      "[REDACTED]"
    );
    expect((sanitized.nested as Record<string, unknown>).safe).toBe("keep me");
    expect(
      (sanitized.snapshot as Record<string, unknown>).token as string
    ).toBe("[REDACTED]");
  });

  it("redacts secret-like variants and keeps safe metadata", () => {
    const sanitized = sanitizeForLogging({
      apiKey: "key-1",
      clientSecret: "shh",
      count: 3,
      secretToken: "tok",
      sessionId: "sess",
      status: "ok",
    }) as Record<string, unknown>;

    expect(sanitized.apiKey).toBe("[REDACTED]");
    expect(sanitized.clientSecret).toBe("[REDACTED]");
    expect(sanitized.secretToken).toBe("[REDACTED]");
    expect(sanitized.sessionId).toBe("[REDACTED]");
    expect(sanitized.count).toBe(3);
    expect(sanitized.status).toBe("ok");
  });

  it("truncates long strings such as HTML snapshots", () => {
    const sanitized = sanitizeForLogging({
      body: "x".repeat(5000),
    }) as Record<string, string>;
    expect(sanitized.body.length).toBeLessThan(5000);
    expect(sanitized.body).toContain("[truncated]");
  });

  it("handles circular references and errors safely", () => {
    const circular: Record<string, unknown> = { safe: "yes" };
    circular.self = circular;
    const sanitized = sanitizeForLogging(circular) as Record<string, unknown>;
    expect(sanitized.self).toBe("[Circular]");

    const error = Object.assign(new Error("boom"), { code: "P0001" });
    const sanitizedError = sanitizeForLogging(error) as Record<string, unknown>;
    expect(sanitizedError).toMatchObject({
      code: "P0001",
      message: "boom",
      name: "Error",
    });
  });
});

describe("logError", () => {
  it("logs only message, code, and redacted metadata", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = Object.assign(new Error("Ingestion failed"), {
      code: "XX000",
    });

    logError("Ingestion transaction failed.", error, {
      authorization: "Bearer super-secret",
      snapshot: { html: "<html>private</html>" },
      opportunityId: "opp-1",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(payload) as {
      code: string;
      context: string;
      message: string;
      metadata: Record<string, unknown>;
    };
    expect(parsed.context).toBe("Ingestion transaction failed.");
    expect(parsed.message).toBe("Ingestion failed");
    expect(parsed.code).toBe("XX000");
    expect(parsed.metadata.opportunityId).toBe("opp-1");
    expect(payload).not.toContain("super-secret");
    expect(payload).not.toContain("<html>private</html>");
    expect(payload).toContain("[REDACTED]");
  });

  it("never stringifies unknown thrown values verbatim", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logError("ctx", { token: "abc", weird: "value" });
    const payload = spy.mock.calls[0]?.[0] as string;
    expect(payload).toContain("Unknown error");
    expect(payload).not.toContain("abc");
  });
});
