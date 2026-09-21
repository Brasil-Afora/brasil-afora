import "server-only";

import {
  type ClaimedLinkJob,
  LINK_WORKER_JOB_KIND,
  type LinkQueueBoundary,
  type LinkVerificationOutcome,
  type LinkVerifier,
  PermanentLinkJobError,
} from "@/server/link-verification/link-worker";

const QUEUE_REQUEST_TIMEOUT_MS = 30_000;
// Longer than the link-check route's 60s function limit, so the worker never
// gives up on a verification the web is still allowed to finish.
const VERIFY_REQUEST_TIMEOUT_MS = 75_000;
const TRAILING_SLASHES = /\/+$/;
export const MINIMUM_TOKEN_LENGTH = 32;

/**
 * Codes the link-check route returns for a job that can never succeed. Any
 * other refusal — auth, validation, a 5xx — is the worker's own problem and is
 * retried, so a misconfigured deployment cannot dead-letter the queue.
 */
const PERMANENT_LINK_CHECK_CODES = new Set([
  "APPLICATION_ROUND_NOT_FOUND",
  "APPLICATION_URL_MISSING",
]);

export class LinkQueueTransportError extends Error {
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(message: string, retryable: boolean, status: number | null) {
    super(message);
    this.name = "LinkQueueTransportError";
    this.retryable = retryable;
    this.status = status;
  }
}

type Fetch = typeof globalThis.fetch;

const parseJob = (value: unknown, operation: string): ClaimedLinkJob => {
  if (typeof value !== "object" || value === null) {
    throw new LinkQueueTransportError(
      `recrawl ${operation} response did not contain a job`,
      false,
      null
    );
  }
  const job = value as Record<string, unknown>;
  if (
    typeof job.id !== "string" ||
    typeof job.jobKind !== "string" ||
    typeof job.status !== "string"
  ) {
    throw new LinkQueueTransportError(
      `recrawl ${operation} response contained an invalid job contract`,
      false,
      null
    );
  }
  // The worker never widens its own scope from a response: a job of any other
  // kind is a contract violation, not something to execute.
  if (job.jobKind !== LINK_WORKER_JOB_KIND) {
    throw new LinkQueueTransportError(
      `recrawl ${operation} response contained the wrong job kind`,
      false,
      null
    );
  }
  if (typeof job.leaseToken !== "string" || job.leaseToken.trim() === "") {
    throw new LinkQueueTransportError(
      `recrawl ${operation} response did not contain an active lease token`,
      false,
      null
    );
  }
  return {
    applicationRoundId:
      typeof job.applicationRoundId === "string"
        ? job.applicationRoundId
        : null,
    id: job.id,
    jobKind: job.jobKind,
    leaseToken: job.leaseToken,
    status: job.status,
  };
};

interface PostResult {
  body: unknown;
  ok: boolean;
  status: number;
}

const createPoster = ({
  baseUrl,
  fetchImplementation,
  token,
}: {
  baseUrl: string;
  fetchImplementation: Fetch;
  token: string;
}) => {
  const root = baseUrl.replace(TRAILING_SLASHES, "");
  const bearer = token.trim();
  if (bearer.length < MINIMUM_TOKEN_LENGTH) {
    throw new LinkQueueTransportError(
      `LINK_WORKER_TOKEN must contain at least ${MINIMUM_TOKEN_LENGTH} characters`,
      false,
      null
    );
  }
  return async (
    path: string,
    body: Record<string, unknown>,
    timeoutMs: number
  ): Promise<PostResult> => {
    let response: Response;
    try {
      response = await fetchImplementation(`${root}${path}`, {
        body: JSON.stringify(body),
        headers: {
          authorization: `Bearer ${bearer}`,
          "content-type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new LinkQueueTransportError(
        `maintenance API request failed: ${(error as Error).name}`,
        true,
        null
      );
    }
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      if (response.ok) {
        throw new LinkQueueTransportError(
          "maintenance API returned invalid JSON",
          false,
          response.status
        );
      }
    }
    return { body: parsed, ok: response.ok, status: response.status };
  };
};

const transportFailure = (path: string, status: number): never => {
  const retryable = status >= 500 || [408, 425, 429].includes(status);
  throw new LinkQueueTransportError(
    `maintenance API returned HTTP ${status} for ${path}`,
    retryable,
    status
  );
};

export const createHttpLinkQueue = ({
  baseUrl,
  fetchImplementation = globalThis.fetch,
  token,
}: {
  baseUrl: string;
  fetchImplementation?: Fetch;
  token: string;
}): LinkQueueBoundary => {
  const post = createPoster({ baseUrl, fetchImplementation, token });
  return {
    async claim(limit: number): Promise<ClaimedLinkJob[]> {
      const path = "/api/v1/maintenance/recrawls/claims";
      const result = await post(
        path,
        { job_kinds: [LINK_WORKER_JOB_KIND], limit },
        QUEUE_REQUEST_TIMEOUT_MS
      );
      if (!result.ok) {
        return transportFailure(path, result.status);
      }
      const jobs = (result.body as { data?: { jobs?: unknown } } | null)?.data
        ?.jobs;
      if (!Array.isArray(jobs)) {
        throw new LinkQueueTransportError(
          "recrawl claim response did not contain a job list",
          false,
          result.status
        );
      }
      return jobs.map((job) => parseJob(job, "claim"));
    },
    async complete(jobId, leaseToken, input): Promise<unknown> {
      const path = `/api/v1/maintenance/recrawls/${jobId}/completion`;
      const result = await post(
        path,
        { ...input, lease_token: leaseToken },
        QUEUE_REQUEST_TIMEOUT_MS
      );
      if (!result.ok) {
        return transportFailure(path, result.status);
      }
      return result.body;
    },
  };
};

/**
 * Verify through the web's link-check route, authenticated as the link worker.
 *
 * The route resolves the round from the same database the queue lives in, so
 * "round not found" is a genuine permanent answer rather than a sign that the
 * worker is pointed at the wrong database — the worker has no database to be
 * wrong about.
 */
export const createHttpLinkVerifier = ({
  baseUrl,
  fetchImplementation = globalThis.fetch,
  token,
}: {
  baseUrl: string;
  fetchImplementation?: Fetch;
  token: string;
}): LinkVerifier => {
  const post = createPoster({ baseUrl, fetchImplementation, token });
  return async (applicationRoundId): Promise<LinkVerificationOutcome> => {
    const path = `/api/v1/application-rounds/${encodeURIComponent(applicationRoundId)}/link-checks`;
    const result = await post(path, {}, VERIFY_REQUEST_TIMEOUT_MS);
    if (!result.ok) {
      const code = (result.body as { error?: { code?: unknown } } | null)?.error
        ?.code;
      if (
        typeof code === "string" &&
        PERMANENT_LINK_CHECK_CODES.has(code) &&
        (result.status === 404 || result.status === 422)
      ) {
        throw new PermanentLinkJobError(
          code,
          "The link-check route reports this job can never succeed."
        );
      }
      return transportFailure(path, result.status);
    }
    const body = result.body as {
      data?: { status?: unknown };
      meta?: { material_change?: unknown; previous_status?: unknown };
    } | null;
    const status = body?.data?.status;
    const materialChange = body?.meta?.material_change;
    const previousStatus = body?.meta?.previous_status;
    if (
      typeof status !== "string" ||
      typeof materialChange !== "boolean" ||
      !(previousStatus === null || typeof previousStatus === "string")
    ) {
      throw new LinkQueueTransportError(
        "link-check response did not contain an assessment contract",
        false,
        result.status
      );
    }
    return { materialChange, previousStatus, status };
  };
};
