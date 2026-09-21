import "server-only";

import {
  type ClaimedLinkJob,
  LINK_WORKER_JOB_KIND,
  type LinkQueueBoundary,
} from "@/server/link-verification/link-worker";

const REQUEST_TIMEOUT_MS = 30_000;
const TRAILING_SLASHES = /\/+$/;
export const MINIMUM_TOKEN_LENGTH = 32;

export class LinkQueueTransportError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "LinkQueueTransportError";
    this.retryable = retryable;
  }
}

type Fetch = typeof globalThis.fetch;

const parseJob = (value: unknown, operation: string): ClaimedLinkJob => {
  if (typeof value !== "object" || value === null) {
    throw new LinkQueueTransportError(
      `recrawl ${operation} response did not contain a job`,
      false
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
      false
    );
  }
  // The worker never widens its own scope from a response: a job of any other
  // kind is a contract violation, not something to execute.
  if (job.jobKind !== LINK_WORKER_JOB_KIND) {
    throw new LinkQueueTransportError(
      `recrawl ${operation} response contained the wrong job kind`,
      false
    );
  }
  if (typeof job.leaseToken !== "string" || job.leaseToken.trim() === "") {
    throw new LinkQueueTransportError(
      `recrawl ${operation} response did not contain an active lease token`,
      false
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

export const createHttpLinkQueue = ({
  baseUrl,
  fetchImplementation = globalThis.fetch,
  token,
}: {
  baseUrl: string;
  fetchImplementation?: Fetch;
  token: string;
}): LinkQueueBoundary => {
  const root = baseUrl.replace(TRAILING_SLASHES, "");
  if (token.trim().length < MINIMUM_TOKEN_LENGTH) {
    throw new LinkQueueTransportError(
      `LINK_WORKER_TOKEN must contain at least ${MINIMUM_TOKEN_LENGTH} characters`,
      false
    );
  }

  const post = async (
    path: string,
    body: Record<string, unknown>
  ): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetchImplementation(`${root}${path}`, {
        body: JSON.stringify(body),
        headers: {
          authorization: `Bearer ${token.trim()}`,
          "content-type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new LinkQueueTransportError(
        `maintenance API request failed: ${(error as Error).name}`,
        true
      );
    }
    if (!response.ok) {
      const retryable =
        response.status >= 500 || [408, 425, 429].includes(response.status);
      throw new LinkQueueTransportError(
        `maintenance API returned HTTP ${response.status} for ${path}`,
        retryable
      );
    }
    try {
      return await response.json();
    } catch {
      throw new LinkQueueTransportError(
        "maintenance API returned invalid JSON",
        false
      );
    }
  };

  return {
    async claim(limit: number): Promise<ClaimedLinkJob[]> {
      const payload = (await post("/api/v1/maintenance/recrawls/claims", {
        job_kinds: [LINK_WORKER_JOB_KIND],
        limit,
      })) as { data?: { jobs?: unknown } };
      const jobs = payload?.data?.jobs;
      if (!Array.isArray(jobs)) {
        throw new LinkQueueTransportError(
          "recrawl claim response did not contain a job list",
          false
        );
      }
      return jobs.map((job) => parseJob(job, "claim"));
    },
    complete(
      jobId: string,
      leaseToken: string,
      input: {
        error?: string;
        material_change?: boolean;
        retryable?: boolean;
        success: boolean;
      }
    ): Promise<unknown> {
      return post(`/api/v1/maintenance/recrawls/${jobId}/completion`, {
        ...input,
        lease_token: leaseToken,
      });
    },
  };
};
