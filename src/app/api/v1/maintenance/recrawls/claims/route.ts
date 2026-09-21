import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { claimRecrawlJobs } from "@/server/maintenance/recrawl-scheduler";
import {
  CLAIMABLE_JOB_KINDS,
  claimableJobKinds,
  jobKindScopeError,
  requireAnyMaintenanceCapability,
} from "@/server/maintenance-auth";

export const dynamic = "force-dynamic";

const claimRequestSchema = z
  .object({
    job_kinds: z
      .array(z.enum(CLAIMABLE_JOB_KINDS))
      .min(1)
      .max(CLAIMABLE_JOB_KINDS.length)
      .optional(),
    job_ids: z.array(z.uuid()).min(1).max(10).optional(),
    limit: z.number().int().min(1).max(100).default(10),
  })
  .strict();

export async function POST(request: NextRequest) {
  // Holding any claim capability gets a principal; jobKindScopeError below
  // decides which kinds that principal may actually take.
  const authResult = await requireAnyMaintenanceCapability(request, [
    "queue:claim:source_document",
    "queue:claim:application_link",
  ]);
  if (authResult.response) {
    return authResult.response;
  }
  const principal = authResult.principal;

  const rawBody = await request.text();
  let body: unknown = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    body = null;
  }
  const parsed = claimRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Recrawl claim request is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const scopeError = jobKindScopeError(principal, parsed.data.job_kinds);
  if (scopeError) {
    return scopeError;
  }
  // Claiming by explicit job ids is the supervised source-run path, and it is
  // the one claim that bypasses BF-10's `source_run_id` exclusion. Without
  // this check an unattended worker that learned a run's job ids could claim
  // work reserved for that run, which is exactly the isolation BF-10 exists
  // to provide. Only `source-run:manage` may do it.
  if (
    parsed.data.job_ids &&
    !principal.capabilities.includes("source-run:manage")
  ) {
    return NextResponse.json(
      {
        error: {
          code: "MAINTENANCE_SCOPE_FORBIDDEN",
          message:
            "Claiming specific job ids requires the source-run:manage capability.",
        },
      },
      { status: 403 }
    );
  }
  // An omitted job_kinds never means "every kind": it narrows to exactly the
  // kinds this credential may claim, so a source worker cannot take an
  // application-link job by leaving the filter out.
  const jobKinds = parsed.data.job_kinds ?? claimableJobKinds(principal);
  const jobs = await claimRecrawlJobs(
    db,
    principal.id,
    parsed.data.limit,
    new Date(),
    jobKinds,
    undefined,
    parsed.data.job_ids
  );
  return NextResponse.json({ data: { jobs } });
}
