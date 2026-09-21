/**
 * Persistent application-link verification worker.
 *
 * Runs as its own long-lived process (a Render Background Worker), separate
 * from the Python source-document worker. It holds exactly one credential,
 * LINK_WORKER_TOKEN, scoped to queue:claim:application_link, queue:write and
 * link-check:run. It has no database credential: it claims and completes jobs
 * through the maintenance API and verifies through the web's link-check route,
 * so the process that fetches untrusted, externally sourced URLs cannot touch
 * the database except through that one narrowly scoped route.
 *
 * It never publishes. A verification writes an operational assessment,
 * refreshes the edition's last-verified time, and opens a review task when the
 * link degrades. Editorial publication state is untouched (BF-06).
 *
 *   bun --conditions react-server src/workers/application-link-worker.ts --once
 *   bun --conditions react-server src/workers/application-link-worker.ts
 *
 * `--conditions react-server` is required: shared modules are marked with the
 * `server-only` package, whose export map resolves to an empty module only
 * under that condition.
 *
 * Environment: WEB_BASE_URL, LINK_WORKER_TOKEN,
 *              LINK_WORKER_BATCH_LIMIT (1–100, default 1),
 *              LINK_WORKER_IDLE_SLEEP_MS (default 30000).
 *
 * Shutdown: SIGTERM finishes the job in flight and exits, and an idle sleep is
 * cut short; a second signal exits immediately. The batch limit defaults to 1
 * on purpose — every job in a claimed batch is leased at claim time, so a
 * larger batch means a SIGTERM either waits for all of them or abandons their
 * leases. Verification is sequential and network-bound, so a larger batch saves
 * only claim round trips, never throughput.
 */
import {
  createHttpLinkQueue,
  createHttpLinkVerifier,
} from "@/server/link-verification/link-queue-http";
import {
  type LinkJobResult,
  runLinkWorkerBatch,
} from "@/server/link-verification/link-worker";

const DIGITS = /^\d+$/;
const MAX_BACKOFF_MS = 30 * 60 * 1000;

const requiredEnvironment = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const integerEnvironment = (
  key: string,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return fallback;
  }
  // Strict: "30s" or "5.0" is a configuration mistake, not 30 or 5.
  const parsed = DIGITS.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${key} must be an integer between ${minimum} and ${maximum}.`
    );
  }
  return parsed;
};

/** Sleep that a shutdown request cuts short. */
const interruptibleSleep = (
  milliseconds: number,
  shutdown: AbortSignal
): Promise<void> =>
  new Promise((resolve) => {
    if (shutdown.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(done, milliseconds);
    function done(): void {
      clearTimeout(timer);
      shutdown.removeEventListener("abort", done);
      resolve();
    }
    shutdown.addEventListener("abort", done, { once: true });
  });

const log = (event: string, fields: Record<string, unknown> = {}): void => {
  process.stdout.write(
    `${JSON.stringify({ event, service: "application-link-worker", timestamp: new Date().toISOString(), ...fields })}\n`
  );
};

interface WorkerConfiguration {
  batchLimit: number;
  idleSleepMs: number;
  once: boolean;
  queue: ReturnType<typeof createHttpLinkQueue>;
  verify: ReturnType<typeof createHttpLinkVerifier>;
}

const readConfiguration = (): WorkerConfiguration => {
  const baseUrl = requiredEnvironment("WEB_BASE_URL");
  const token = requiredEnvironment("LINK_WORKER_TOKEN");
  return {
    batchLimit: integerEnvironment("LINK_WORKER_BATCH_LIMIT", 1, 1, 100),
    idleSleepMs: integerEnvironment(
      "LINK_WORKER_IDLE_SLEEP_MS",
      30_000,
      1000,
      MAX_BACKOFF_MS
    ),
    once: process.argv.includes("--once"),
    queue: createHttpLinkQueue({ baseUrl, token }),
    verify: createHttpLinkVerifier({ baseUrl, token }),
  };
};

const installShutdownHandlers = (): AbortController => {
  const shutdown = new AbortController();
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      if (shutdown.signal.aborted) {
        // A second signal means the operator will not wait for the job in
        // flight. Its lease expires and BF-08 reclaims it.
        log("forced_exit", { signal });
        process.exit(130);
      }
      // Finish the job in flight; the queue lease is only released by the
      // completion call or by expiry, never by process exit.
      log("shutdown_requested", { signal });
      shutdown.abort();
    });
  }
  return shutdown;
};

const logResults = (results: LinkJobResult[]): void => {
  for (const result of results) {
    log(result.success ? "job_completed" : "job_failed", { ...result });
    if (!result.completionConfirmed) {
      log("completion_unconfirmed", { jobId: result.jobId });
    }
  }
};

/** One claim-and-execute cycle; null means the claim itself failed. */
const runCycle = async (
  configuration: WorkerConfiguration
): Promise<LinkJobResult[] | null> => {
  try {
    return await runLinkWorkerBatch({
      limit: configuration.batchLimit,
      queue: configuration.queue,
      verify: configuration.verify,
    });
  } catch (error) {
    log("batch_failed", { message: (error as Error).message });
    return null;
  }
};

const main = async (): Promise<number> => {
  const configuration = readConfiguration();
  const shutdown = installShutdownHandlers();
  const { idleSleepMs, once } = configuration;
  log("started", {
    batchLimit: configuration.batchLimit,
    idleSleepMs,
    once,
  });

  let consecutiveInfrastructureFailures = 0;
  do {
    const results = await runCycle(configuration);
    // The worker's own reach to the web is failing (unreachable, refused,
    // misconfigured). Every claim would burn one attempt on some job with no
    // chance of success, so back off exponentially instead of reclaiming.
    const infrastructureFailed =
      results === null ||
      results.some((result) => result.infrastructureFailure);
    if (results !== null) {
      logResults(results);
    }
    if (once) {
      log("stopped", { exitCode: infrastructureFailed ? 1 : 0 });
      return infrastructureFailed ? 1 : 0;
    }
    if (infrastructureFailed) {
      consecutiveInfrastructureFailures += 1;
      const sleepMs = Math.min(
        MAX_BACKOFF_MS,
        idleSleepMs * 2 ** (consecutiveInfrastructureFailures - 1)
      );
      log("backing_off", { consecutiveInfrastructureFailures, sleepMs });
      await interruptibleSleep(sleepMs, shutdown.signal);
      continue;
    }
    consecutiveInfrastructureFailures = 0;
    if (results.length === 0) {
      await interruptibleSleep(idleSleepMs, shutdown.signal);
    }
  } while (!shutdown.signal.aborted);

  log("stopped", { exitCode: 0 });
  return 0;
};

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    log("fatal", { message: (error as Error).message });
    process.exitCode = 1;
  });
