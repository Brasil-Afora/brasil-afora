import { describe, expect, it } from "vitest";
import {
  createHttpLinkQueue,
  createHttpLinkVerifier,
  LinkQueueTransportError,
} from "@/server/link-verification/link-queue-http";
import { PermanentLinkJobError } from "@/server/link-verification/link-worker";

const TOKEN = "link-worker-token-cccccccccccccccccccc";
const ROUND = "33333333-3333-4333-8333-333333333333";

interface Recorded {
  authorization: string | null;
  body: unknown;
  url: string;
}

const fakeFetch = (
  status: number,
  payload: unknown,
  recorded: Recorded[] = []
): typeof globalThis.fetch =>
  ((input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    recorded.push({
      authorization: headers.get("authorization"),
      body: init?.body ? JSON.parse(String(init.body)) : null,
      url: String(input),
    });
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status,
      })
    );
  }) as typeof globalThis.fetch;

const verifierFor = (status: number, payload: unknown, recorded?: Recorded[]) =>
  createHttpLinkVerifier({
    baseUrl: "http://web.test/",
    fetchImplementation: fakeFetch(status, payload, recorded),
    token: TOKEN,
  });

describe("link verifier over HTTP", () => {
  it("verifies through the link-check route as the link worker", async () => {
    const recorded: Recorded[] = [];
    const outcome = await verifierFor(
      201,
      {
        data: { status: "closed" },
        meta: { material_change: true, previous_status: "current_and_open" },
      },
      recorded
    )(ROUND);
    expect(outcome).toEqual({
      materialChange: true,
      previousStatus: "current_and_open",
      status: "closed",
    });
    expect(recorded).toEqual([
      {
        authorization: `Bearer ${TOKEN}`,
        body: {},
        url: `http://web.test/api/v1/application-rounds/${ROUND}/link-checks`,
      },
    ]);
  });

  it("treats a missing round or URL as permanent", async () => {
    for (const [status, code] of [
      [404, "APPLICATION_ROUND_NOT_FOUND"],
      [422, "APPLICATION_URL_MISSING"],
    ] as const) {
      await expect(
        verifierFor(status, { error: { code, message: "x" } })(ROUND)
      ).rejects.toBeInstanceOf(PermanentLinkJobError);
    }
  });

  it("never treats an auth, validation or server refusal as permanent", async () => {
    // A misconfigured deployment must not dead-letter the queue: these are the
    // worker's own problem and stay retryable.
    for (const [status, code] of [
      [401, "UNAUTHORIZED"],
      [403, "MAINTENANCE_SCOPE_FORBIDDEN"],
      [422, "VALIDATION_ERROR"],
      [503, "MAINTENANCE_AUTH_MISCONFIGURED"],
      [500, "LINK_CHECK_FAILED"],
    ] as const) {
      const failure = await verifierFor(status, {
        error: { code, message: "x" },
      })(ROUND).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(LinkQueueTransportError);
      expect(failure).not.toBeInstanceOf(PermanentLinkJobError);
    }
  });

  it("rejects a success response that lacks the assessment contract", async () => {
    await expect(
      verifierFor(201, { data: { status: "closed" } })(ROUND)
    ).rejects.toBeInstanceOf(LinkQueueTransportError);
  });
});

describe("link queue over HTTP", () => {
  it("claims only application-link jobs with its own credential", async () => {
    const recorded: Recorded[] = [];
    const queue = createHttpLinkQueue({
      baseUrl: "http://web.test",
      fetchImplementation: fakeFetch(200, { data: { jobs: [] } }, recorded),
      token: TOKEN,
    });
    expect(await queue.claim(1)).toEqual([]);
    expect(recorded[0]).toMatchObject({
      authorization: `Bearer ${TOKEN}`,
      body: { job_kinds: ["application_link"], limit: 1 },
    });
  });

  it("refuses to execute a job of another kind the server returned", async () => {
    const queue = createHttpLinkQueue({
      baseUrl: "http://web.test",
      fetchImplementation: fakeFetch(200, {
        data: {
          jobs: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              jobKind: "source_document",
              leaseToken: "55555555-5555-4555-8555-555555555555",
              status: "running",
            },
          ],
        },
      }),
      token: TOKEN,
    });
    await expect(queue.claim(1)).rejects.toThrow("wrong job kind");
  });

  it("refuses to start with a credential too short to be a secret", () => {
    expect(() =>
      createHttpLinkQueue({ baseUrl: "http://web.test", token: "short" })
    ).toThrow("LINK_WORKER_TOKEN");
  });
});
