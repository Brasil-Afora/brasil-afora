/**
 * Persistent application-link verification worker.
 *
 * Runs as its own long-lived process (a Render Background Worker), separate
 * from the Python source-document worker. It claims only `application_link`
 * jobs, using a credential that holds only `queue:claim:application_link` and
 * `queue:write`, so it cannot schedule, cannot drive supervised source runs,
 * and cannot touch source-document jobs.
 *
 * It never publishes: `verifyApplicationLink` writes an operational assessment,
 * refreshes `editions.last_verified_at`, and opens a review task when the link
 * degrades. Editorial publication state is untouched (BF-06).
 *
 *   bun run src/workers/application-link-worker.ts --once
 *   bun run src/workers/application-link-worker.ts
 *
 * Environment: DATABASE_URL, WEB_BASE_URL, LINK_WORKER_TOKEN,
 *              LINK_WORKER_BATCH_LIMIT (default 1),
 *              LINK_WORKER_IDLE_SLEEP_MS (default 30000).
 *
 * Shutdown: SIGTERM finishes the job in flight and exits; an idle sleep is cut
 * short. The batch limit defaults to 1 on purpose — every job in a claimed
 * batch is leased at claim time, so a larger batch means a SIGTERM either
 * waits for all of them or abandons leases until they expire. Verification is
 * sequential and network-bound, so a larger batch saves only claim round
 * trips, never throughput.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "@/db/schema";
import { createHttpLinkQueue } from "@/server/link-verification/link-queue-http";
import {
  createDatabaseLinkVerifier,
  type LinkJobResult,
  runLinkWorkerBatch,
} from "@/server/link-verification/link-worker";

const requiredEnvironment = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const numericEnvironment = (key: string, fallback: number): number => {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${key} must be a positive integer.`);
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

const main = async (): Promise<number> => {
  const once = process.argv.includes("--once");
  const batchLimit = numericEnvironment("LINK_WORKER_BATCH_LIMIT", 1);
  const idleSleepMs = numericEnvironment("LINK_WORKER_IDLE_SLEEP_MS", 30_000);
  const pool = new Pool({
    connectionString: requiredEnvironment("DATABASE_URL"),
    max: 4,
  });
  const database = drizzle({ casing: "snake_case", client: pool, schema });
  const queue = createHttpLinkQueue({
    baseUrl: requiredEnvironment("WEB_BASE_URL"),
    token: requiredEnvironment("LINK_WORKER_TOKEN"),
  });
  const verify = createDatabaseLinkVerifier(database);

  const shutdown = new AbortController();
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      // Finish the job in flight; the queue lease is only released by the
      // completion call or by expiry, never by process exit.
      if (!shutdown.signal.aborted) {
        log("shutdown_requested", { signal });
        shutdown.abort();
      }
    });
  }

  log("started", { batchLimit, idleSleepMs, once });
  let exitCode = 0;
  try {
    do {
      let results: LinkJobResult[] = [];
      try {
        results = await runLinkWorkerBatch({
          limit: batchLimit,
          queue,
          verify,
        });
      } catch (error) {
        log("batch_failed", { message: (error as Error).message });
        if (once) {
          exitCode = 1;
          break;
        }
        await interruptibleSleep(idleSleepMs, shutdown.signal);
        continue;
      }
      for (const result of results) {
        log(result.success ? "job_completed" : "job_failed", { ...result });
      }
      if (once) {
        break;
      }
      if (results.length === 0) {
        await interruptibleSleep(idleSleepMs, shutdown.signal);
      }
    } while (!shutdown.signal.aborted);
  } finally {
    await pool.end();
    log("stopped", { exitCode });
  }
  return exitCode;
};

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    log("fatal", { message: (error as Error).message });
    process.exitCode = 1;
  });
