import "server-only";

import { NextResponse } from "next/server";

/**
 * Every bearer credential the application accepts, across all auth modules.
 *
 * Each belongs to exactly one actor. Two sharing a value would let the holder
 * of either act as both — the scheduler's host could submit ingestions, an
 * outbox caller could drive the queue — so every module refuses to
 * authenticate while any two collide.
 */
export const SERVICE_CREDENTIAL_VARIABLES = [
  "SCHEDULER_TOKEN",
  "SOURCE_WORKER_TOKEN",
  "LINK_WORKER_TOKEN",
  "SOURCE_RUN_OPERATOR_TOKEN",
  "INGESTION_API_TOKEN",
  "OUTBOX_WORKER_TOKEN",
] as const;

/** The first pair of configured service credentials that share a value. */
export const sharedServiceCredentials = (): [string, string] | null => {
  const seen = new Map<string, string>();
  for (const name of SERVICE_CREDENTIAL_VARIABLES) {
    const value = process.env[name]?.trim();
    if (!value) {
      continue;
    }
    const other = seen.get(value);
    if (other) {
      return [other, name];
    }
    seen.set(value, name);
  }
  return null;
};

/**
 * A 503 for an unsound credential set. The detail names environment variables,
 * so it goes to the server log only; the caller learns nothing about which
 * credential is at fault.
 */
export const credentialMisconfiguration = (
  code: string,
  detail: string
): NextResponse => {
  console.error(`[service-credentials] ${code}: ${detail}`);
  return NextResponse.json(
    {
      error: {
        code,
        message: "Service credentials are misconfigured on the server.",
      },
    },
    { status: 503 }
  );
};

export const sharedCredentialError = (code: string): NextResponse | null => {
  const shared = sharedServiceCredentials();
  return shared
    ? credentialMisconfiguration(
        code,
        `${shared[0]} and ${shared[1]} must not share the same secret.`
      )
    : null;
};
