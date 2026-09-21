import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MINIMUM_TOKEN_LENGTH = 32;

/**
 * Every privileged maintenance action this application exposes.
 *
 * A capability is named after the operation, not after the actor, so that a
 * credential can never acquire an action simply by being renamed.
 */
export const MAINTENANCE_CAPABILITIES = [
  "queue:schedule",
  "queue:claim:source_document",
  "queue:claim:application_link",
  "queue:write",
  "source-run:manage",
  "link-check:run",
] as const;

export type MaintenanceCapability = (typeof MAINTENANCE_CAPABILITIES)[number];

export const CLAIMABLE_JOB_KINDS = [
  "application_link",
  "source_document",
] as const;

export type ClaimableJobKind = (typeof CLAIMABLE_JOB_KINDS)[number];

interface CredentialDefinition {
  capabilities: readonly MaintenanceCapability[];
  environmentVariable: string;
  principalId: string;
}

/**
 * The production credential model.
 *
 * Each service gets the smallest capability set its real code path needs, so a
 * leaked worker credential cannot schedule, cannot touch another worker's job
 * kind, and cannot drive supervised source runs.
 *
 * `MAINTENANCE_WORKER_TOKEN` — the historical single omnipotent maintenance
 * credential — is deliberately absent. It is never accepted, so a deployment
 * that still carries it in its environment fails closed instead of silently
 * restoring unscoped access.
 */
export const MAINTENANCE_CREDENTIALS: readonly CredentialDefinition[] = [
  {
    capabilities: ["queue:schedule"],
    environmentVariable: "SCHEDULER_TOKEN",
    principalId: "scheduler",
  },
  {
    capabilities: ["queue:claim:source_document", "queue:write"],
    environmentVariable: "SOURCE_WORKER_TOKEN",
    principalId: "source-worker",
  },
  {
    // The link worker verifies through the web's link-check route instead of
    // holding a database credential of its own, so it needs link-check:run.
    capabilities: [
      "queue:claim:application_link",
      "queue:write",
      "link-check:run",
    ],
    environmentVariable: "LINK_WORKER_TOKEN",
    principalId: "link-worker",
  },
  {
    capabilities: [
      "source-run:manage",
      "queue:claim:source_document",
      "queue:write",
    ],
    environmentVariable: "SOURCE_RUN_OPERATOR_TOKEN",
    principalId: "source-run-operator",
  },
] as const;

/**
 * Bearer credentials owned by other auth modules. They hold no maintenance
 * capability, but a maintenance credential sharing a value with one of them
 * would let the holder of either act as both.
 */
const OTHER_SERVICE_CREDENTIALS = [
  "INGESTION_API_TOKEN",
  "OUTBOX_WORKER_TOKEN",
];

export interface MaintenancePrincipal {
  capabilities: readonly MaintenanceCapability[];
  id: string;
  kind: "admin" | "service";
}

type AuthorizationResult =
  | { principal: MaintenancePrincipal; response: null }
  | { principal: null; response: NextResponse };

const readBearerToken = (request: NextRequest): string | null => {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice("Bearer ".length).trim() || null;
};

// Comparing fixed-length digests keeps the comparison time independent of the
// supplied token's length as well as its content.
const digest = (value: string): Buffer =>
  createHash("sha256").update(value).digest();

const equalSecrets = (left: string, right: string): boolean =>
  timingSafeEqual(digest(left), digest(right));

const configuredValue = (environmentVariable: string): string | null =>
  process.env[environmentVariable]?.trim() || null;

const misconfigured = (code: string, detail: string): NextResponse => {
  // The detail names environment variables, so it goes to the server log only;
  // an unauthenticated caller learns that the credential set is unsound and
  // nothing about which part of it.
  console.error(`[maintenance-auth] ${code}: ${detail}`);
  return NextResponse.json(
    {
      error: {
        code,
        message: "Maintenance credentials are misconfigured on the server.",
      },
    },
    { status: 503 }
  );
};

/**
 * Refuse to authenticate at all while the credential set is unsound.
 *
 * Two credentials sharing one secret would collapse their capability sets back
 * into a single omnipotent token, so that is treated as a misconfiguration
 * rather than as a union of scopes. This deliberately fails every maintenance
 * route, admin sessions included: an unsound credential set is an incident, and
 * stopping is safer than continuing to authenticate against it.
 */
export const maintenanceCredentialConfigurationError =
  (): NextResponse | null => {
    const seen = new Map<string, string>();
    for (const credential of MAINTENANCE_CREDENTIALS) {
      const value = configuredValue(credential.environmentVariable);
      if (value === null) {
        continue;
      }
      if (value.length < MINIMUM_TOKEN_LENGTH) {
        return misconfigured(
          "MAINTENANCE_AUTH_MISCONFIGURED",
          `${credential.environmentVariable} must contain at least ${MINIMUM_TOKEN_LENGTH} characters.`
        );
      }
      const duplicate = seen.get(value);
      if (duplicate) {
        return misconfigured(
          "MAINTENANCE_AUTH_SCOPE_COLLAPSE",
          `${credential.environmentVariable} and ${duplicate} must not share the same secret.`
        );
      }
      seen.set(value, credential.environmentVariable);
    }
    for (const environmentVariable of OTHER_SERVICE_CREDENTIALS) {
      const value = configuredValue(environmentVariable);
      const duplicate = value === null ? undefined : seen.get(value);
      if (duplicate) {
        return misconfigured(
          "MAINTENANCE_AUTH_SCOPE_COLLAPSE",
          `${environmentVariable} and ${duplicate} must not share the same secret.`
        );
      }
    }
    return null;
  };

/**
 * Resolve a bearer token to a configured service credential, or null.
 *
 * Every configured credential is compared, with no early return, so the time
 * taken does not reveal which slot matched. Exported so the credential table
 * can be asserted without reaching the admin session fallback, which needs a
 * database.
 */
export const resolveMaintenanceCredential = (
  suppliedToken: string
): CredentialDefinition | null => {
  let matched: CredentialDefinition | null = null;
  for (const credential of MAINTENANCE_CREDENTIALS) {
    const value = configuredValue(credential.environmentVariable);
    const equal =
      value !== null &&
      value.length >= MINIMUM_TOKEN_LENGTH &&
      equalSecrets(value, suppliedToken);
    if (equal && matched === null) {
      matched = credential;
    }
  }
  return matched;
};

const forbidden = (required: string): NextResponse =>
  NextResponse.json(
    {
      error: {
        code: "MAINTENANCE_SCOPE_FORBIDDEN",
        message: `This credential is not authorized for ${required}.`,
      },
    },
    { status: 403 }
  );

/**
 * Authorize a request that needs at least one of the given capabilities.
 *
 * Service credentials are checked first and are never widened by the admin
 * fallback: a credential that authenticates but lacks every listed capability
 * is rejected with 403 rather than being retried as a human session.
 */
export const requireAnyMaintenanceCapability = async (
  request: NextRequest,
  capabilities: readonly MaintenanceCapability[]
): Promise<AuthorizationResult> => {
  const configurationError = maintenanceCredentialConfigurationError();
  if (configurationError) {
    return { principal: null, response: configurationError };
  }

  const suppliedToken = readBearerToken(request);
  if (suppliedToken) {
    const credential = resolveMaintenanceCredential(suppliedToken);
    if (credential) {
      if (
        !capabilities.some((capability) =>
          credential.capabilities.includes(capability)
        )
      ) {
        return {
          principal: null,
          response: forbidden(capabilities.join(" or ")),
        };
      }
      return {
        principal: {
          capabilities: credential.capabilities,
          id: credential.principalId,
          kind: "service",
        },
        response: null,
      };
    }
  }

  const { requireAdminInRoute } = await import("@/server/route-auth");
  const adminResult = await requireAdminInRoute(request);
  if (adminResult.response) {
    return { principal: null, response: adminResult.response };
  }
  return {
    principal: {
      capabilities: MAINTENANCE_CAPABILITIES,
      id: adminResult.session.user.id,
      kind: "admin",
    },
    response: null,
  };
};

export const requireMaintenanceCapability = (
  request: NextRequest,
  capability: MaintenanceCapability
): Promise<AuthorizationResult> =>
  requireAnyMaintenanceCapability(request, [capability]);

/**
 * The job kinds a principal may claim.
 *
 * An empty result means the principal may claim nothing, which callers must
 * treat as a refusal — never as "no filter".
 */
export const claimableJobKinds = (
  principal: MaintenancePrincipal
): ClaimableJobKind[] =>
  CLAIMABLE_JOB_KINDS.filter((jobKind) =>
    principal.capabilities.includes(`queue:claim:${jobKind}`)
  );

export const jobKindScopeError = (
  principal: MaintenancePrincipal,
  requestedJobKinds: readonly string[] | undefined
): NextResponse | null => {
  const allowed = claimableJobKinds(principal);
  if (allowed.length === 0) {
    return forbidden("any queue:claim capability");
  }
  if (!requestedJobKinds) {
    return null;
  }
  const refused = requestedJobKinds.filter(
    (jobKind) => !allowed.includes(jobKind as ClaimableJobKind)
  );
  if (refused.length > 0) {
    return forbidden(
      refused.map((jobKind) => `queue:claim:${jobKind}`).join(" or ")
    );
  }
  return null;
};
