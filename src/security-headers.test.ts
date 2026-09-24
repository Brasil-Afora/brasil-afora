import { describe, expect, it } from "vitest";
import nextConfig, {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "../next.config";

const headerMap = (isProduction: boolean): Map<string, string> =>
  new Map(buildSecurityHeaders(isProduction).map((h) => [h.key, h.value]));

describe("security headers", () => {
  it("registers headers for all routes", async () => {
    const routes = await nextConfig.headers?.();
    expect(routes).toHaveLength(1);
    expect(routes?.[0]?.source).toBe("/:path*");
    expect((routes?.[0]?.headers ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("sets a non-breaking Content-Security-Policy", () => {
    const csp = headerMap(false).get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("'self'");
    expect(csp).toContain("https://www.googletagmanager.com");
    expect(csp).toContain("https://www.google-analytics.com");
    // Required by the inline theme-init script in src/app/layout.tsx.
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("omits unsafe-eval from script-src in production", () => {
    expect(buildContentSecurityPolicy(true)).not.toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(false)).toContain("'unsafe-eval'");
  });

  it("sends clickjacking, sniffing, referrer, and permissions headers", () => {
    const headers = headerMap(true);
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()"
    );
  });

  it("sends HSTS only in production", () => {
    expect(headerMap(true).get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );
    expect(headerMap(false).has("Strict-Transport-Security")).toBe(false);
  });
});
