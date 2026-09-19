import { describe, expect, it, vi } from "vitest";
import { classifyApplicationPage } from "./application-link-verifier";
import { checkRobotsAllowed, clearRobotsCacheForTests } from "./robots-policy";
import {
  createSafeHttpClient,
  type SafeHttpError,
  type SafeHttpResponse,
} from "./safe-http";

const response = (
  body: string,
  overrides: Partial<SafeHttpResponse> = {}
): SafeHttpResponse => ({
  body,
  finalUrl: "https://example.org/apply/2026",
  headers: { "content-type": "text/html; charset=utf-8" },
  redirectChain: [],
  status: 200,
  ...overrides,
});

describe("safe application-link verification", () => {
  it("does not treat HTTP 200 alone as an open application", () => {
    const result = classifyApplicationPage({
      expectedEditionYear: 2026,
      officialDomains: ["example.org"],
      originalUrl: "https://example.org/apply/2026",
      response: response("<html><h1>Program information 2026</h1></html>"),
    });

    expect(result.status).toBe("unknown");
    expect(result.acceptsSubmissions).toBeNull();
  });

  it("requires semantic open language and a visible form for current_and_open", () => {
    const result = classifyApplicationPage({
      expectedEditionYear: 2026,
      officialDomains: ["example.org"],
      originalUrl: "https://example.org/apply/2026",
      response: response(`
        <html>
          <h1>Inscrições abertas — 2026</h1>
          <form method="post">
            <input name="nome" />
            <button type="submit">Inscreva-se</button>
          </form>
        </html>
      `),
    });

    expect(result).toMatchObject({
      acceptsSubmissions: true,
      documentRole: "application_form",
      editionYear: 2026,
      status: "current_and_open",
    });
  });

  it("detects an old edition even when its form still responds", () => {
    const result = classifyApplicationPage({
      expectedEditionYear: 2026,
      officialDomains: ["example.org"],
      originalUrl: "https://example.org/apply",
      response: response(
        `
          <html>
            <h1>Applications are open for 2024</h1>
            <form><input name="email" /><button type="submit">Apply</button></form>
          </html>
        `,
        { finalUrl: "https://example.org/apply/2024" }
      ),
    });

    expect(result.status).toBe("old_edition");
    expect(result.editionYear).toBe(2024);
  });

  it("blocks private DNS answers before making a request", async () => {
    const requestPinned = vi.fn();
    const client = createSafeHttpClient({
      requestPinned,
      resolveHost: async () => [{ address: "127.0.0.1", family: 4 }],
    });

    await expect(client.get("https://example.org/apply")).rejects.toMatchObject(
      {
        code: "PRIVATE_ADDRESS_BLOCKED",
      } satisfies Partial<SafeHttpError>
    );
    expect(requestPinned).not.toHaveBeenCalled();
  });

  it("revalidates every redirect target and blocks a private redirect", async () => {
    const requestPinned = vi.fn(async () => ({
      body: "",
      headers: { location: "http://internal.example/apply" },
      status: 302,
    }));
    const client = createSafeHttpClient({
      requestPinned,
      resolveHost: async (hostname) =>
        hostname === "example.org"
          ? [{ address: "8.8.8.8", family: 4 }]
          : [{ address: "10.0.0.4", family: 4 }],
    });

    await expect(client.get("https://example.org/apply")).rejects.toMatchObject(
      {
        code: "PRIVATE_ADDRESS_BLOCKED",
      }
    );
    expect(requestPinned).toHaveBeenCalledTimes(1);
  });

  it("honors a matching robots.txt disallow rule", async () => {
    clearRobotsCacheForTests();
    const client = {
      get: async () => ({
        body: "User-agent: BrasilAforaBot\nDisallow: /apply\nAllow: /apply/public",
        finalUrl: "https://example.org/robots.txt",
        headers: { "content-type": "text/plain" },
        redirectChain: [],
        status: 200,
      }),
    };

    await expect(
      checkRobotsAllowed(client, new URL("https://example.org/apply/private"))
    ).resolves.toMatchObject({ allowed: false });
    await expect(
      checkRobotsAllowed(
        client,
        new URL("https://example.org/apply/public/form")
      )
    ).resolves.toMatchObject({ allowed: true });
  });
});
