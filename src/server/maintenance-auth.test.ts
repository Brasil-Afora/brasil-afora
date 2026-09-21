import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  claimableJobKinds,
  jobKindScopeError,
  MAINTENANCE_CAPABILITIES,
  MAINTENANCE_CREDENTIALS,
  type MaintenanceCapability,
  requireMaintenanceCapability,
  resolveMaintenanceCredential,
} from "@/server/maintenance-auth";

const SCHEDULER = "scheduler-token-0000000000000000000000";
const SOURCE_WORKER = "source-worker-token-000000000000000000";
const LINK_WORKER = "link-worker-token-00000000000000000000";
const OPERATOR = "source-run-operator-token-000000000000";
const LEGACY = "legacy-omnipotent-maintenance-token-000";

const bearer = (token: string | null): NextRequest =>
  ({
    headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}),
  }) as unknown as NextRequest;

/**
 * Every capability, paired with the one credential that is supposed to hold it
 * and the credentials that must be refused it. Derived from the shipped
 * credential table so a new credential cannot quietly widen an old actor.
 */
const CREDENTIAL_TOKENS: Record<string, string> = {
  LINK_WORKER_TOKEN: LINK_WORKER,
  SCHEDULER_TOKEN: SCHEDULER,
  SOURCE_RUN_OPERATOR_TOKEN: OPERATOR,
  SOURCE_WORKER_TOKEN: SOURCE_WORKER,
};

const ORIGINAL_ENVIRONMENT = { ...process.env };

const configureAllCredentials = (): void => {
  for (const credential of MAINTENANCE_CREDENTIALS) {
    process.env[credential.environmentVariable] =
      CREDENTIAL_TOKENS[credential.environmentVariable];
  }
};

beforeEach(() => {
  for (const credential of MAINTENANCE_CREDENTIALS) {
    delete process.env[credential.environmentVariable];
  }
  delete process.env.MAINTENANCE_WORKER_TOKEN;
  delete process.env.INGESTION_API_TOKEN;
  delete process.env.OUTBOX_WORKER_TOKEN;
  configureAllCredentials();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENVIRONMENT };
});

describe("maintenance credential scopes", () => {
  it("grants each credential exactly the capabilities it declares", async () => {
    for (const credential of MAINTENANCE_CREDENTIALS) {
      const token = CREDENTIAL_TOKENS[credential.environmentVariable];
      for (const capability of MAINTENANCE_CAPABILITIES) {
        const result = await requireMaintenanceCapability(
          bearer(token),
          capability
        );
        const expected = credential.capabilities.includes(capability);
        expect(
          result.response === null,
          `${credential.environmentVariable} -> ${capability}`
        ).toBe(expected);
        if (expected) {
          expect(result.principal?.id).toBe(credential.principalId);
          expect(result.principal?.kind).toBe("service");
        } else {
          expect(result.response?.status).toBe(403);
        }
      }
    }
  });

  it("refuses the retired omnipotent maintenance token", () => {
    // Setting the historical variable must not resurrect it: no configured
    // credential resolves from it, so the request can only reach the human
    // admin path, never a service principal.
    process.env.MAINTENANCE_WORKER_TOKEN = LEGACY;
    expect(resolveMaintenanceCredential(LEGACY)).toBeNull();
    expect(
      MAINTENANCE_CREDENTIALS.map(
        (credential) => credential.environmentVariable
      )
    ).not.toContain("MAINTENANCE_WORKER_TOKEN");
  });

  it("keeps the scheduler credential out of ingestion-facing queue writes", async () => {
    const write = await requireMaintenanceCapability(
      bearer(SCHEDULER),
      "queue:write"
    );
    expect(write.response?.status).toBe(403);
    const claim = await requireMaintenanceCapability(
      bearer(SCHEDULER),
      "queue:claim:source_document"
    );
    expect(claim.response?.status).toBe(403);
  });

  it("keeps both workers out of scheduling and supervised source runs", async () => {
    for (const token of [SOURCE_WORKER, LINK_WORKER]) {
      for (const capability of [
        "queue:schedule",
        "source-run:manage",
      ] as MaintenanceCapability[]) {
        const result = await requireMaintenanceCapability(
          bearer(token),
          capability
        );
        expect(result.response?.status).toBe(403);
      }
    }
  });

  it("does not let either worker claim the other worker's job kind", async () => {
    const sourceWorkerOnLink = await requireMaintenanceCapability(
      bearer(SOURCE_WORKER),
      "queue:claim:application_link"
    );
    expect(sourceWorkerOnLink.response?.status).toBe(403);
    const linkWorkerOnSource = await requireMaintenanceCapability(
      bearer(LINK_WORKER),
      "queue:claim:source_document"
    );
    expect(linkWorkerOnSource.response?.status).toBe(403);
  });

  it("never lets a service credential fall through to the admin path", async () => {
    // A credential that authenticates but lacks the capability must fail
    // closed at 403, not be retried as a human session (which would surface a
    // 401 and invite a credential-stuffing retry loop).
    const result = await requireMaintenanceCapability(
      bearer(LINK_WORKER),
      "queue:schedule"
    );
    expect(result.response?.status).toBe(403);
  });

  it("fails closed when two credentials share one secret", async () => {
    process.env.LINK_WORKER_TOKEN = SOURCE_WORKER;
    const result = await requireMaintenanceCapability(
      bearer(SOURCE_WORKER),
      "queue:claim:source_document"
    );
    expect(result.principal).toBeNull();
    expect(result.response?.status).toBe(503);
  });

  it("fails closed when a maintenance credential reuses the ingestion secret", async () => {
    // INGESTION_API_TOKEN lives in another auth module, but sharing its value
    // would let the scheduler's host submit ingestions (and vice versa).
    process.env.INGESTION_API_TOKEN = SCHEDULER;
    const result = await requireMaintenanceCapability(
      bearer(SCHEDULER),
      "queue:schedule"
    );
    expect(result.principal).toBeNull();
    expect(result.response?.status).toBe(503);
  });

  it("does not tell an unauthenticated caller which credential is broken", async () => {
    process.env.LINK_WORKER_TOKEN = SOURCE_WORKER;
    const result = await requireMaintenanceCapability(
      bearer(null),
      "queue:schedule"
    );
    const body = JSON.stringify(await result.response?.json());
    expect(result.response?.status).toBe(503);
    expect(body).not.toContain("LINK_WORKER_TOKEN");
    expect(body).not.toContain("SOURCE_WORKER_TOKEN");
  });

  it("fails closed on a credential that is too short to be a secret", async () => {
    process.env.SCHEDULER_TOKEN = "short";
    const result = await requireMaintenanceCapability(
      bearer(SOURCE_WORKER),
      "queue:claim:source_document"
    );
    expect(result.response?.status).toBe(503);
  });

  it("refuses an unconfigured credential rather than defaulting open", () => {
    delete process.env.LINK_WORKER_TOKEN;
    expect(resolveMaintenanceCredential(LINK_WORKER)).toBeNull();
    // The still-configured credentials keep working, so this is a refusal of
    // one credential and not a collapse of the whole table.
    expect(resolveMaintenanceCredential(SOURCE_WORKER)?.principalId).toBe(
      "source-worker"
    );
  });
});

describe("claim job-kind scoping", () => {
  const principalFor = (
    capabilities: readonly MaintenanceCapability[]
  ): Parameters<typeof claimableJobKinds>[0] => ({
    capabilities,
    id: "test",
    kind: "service",
  });

  it("narrows an omitted job_kinds to the credential's own kinds", () => {
    expect(
      claimableJobKinds(
        principalFor(["queue:claim:source_document", "queue:write"])
      )
    ).toEqual(["source_document"]);
    expect(
      claimableJobKinds(
        principalFor(["queue:claim:application_link", "queue:write"])
      )
    ).toEqual(["application_link"]);
  });

  it("refuses an explicit request for a kind outside the credential", () => {
    const principal = principalFor([
      "queue:claim:source_document",
      "queue:write",
    ]);
    expect(jobKindScopeError(principal, ["application_link"])?.status).toBe(
      403
    );
    expect(
      jobKindScopeError(principal, ["source_document", "application_link"])
        ?.status
    ).toBe(403);
    expect(jobKindScopeError(principal, ["source_document"])).toBeNull();
    expect(jobKindScopeError(principal, undefined)).toBeNull();
  });

  it("refuses a principal that may claim nothing instead of claiming everything", () => {
    const principal = principalFor(["queue:schedule"]);
    expect(claimableJobKinds(principal)).toEqual([]);
    expect(jobKindScopeError(principal, undefined)?.status).toBe(403);
  });

  it("gives an admin both kinds", () => {
    expect(claimableJobKinds(principalFor(MAINTENANCE_CAPABILITIES))).toEqual([
      "application_link",
      "source_document",
    ]);
  });
});

describe("link worker verification capability", () => {
  it("lets the link worker run link checks but nothing it does not need", () => {
    const link = MAINTENANCE_CREDENTIALS.find(
      (credential) => credential.environmentVariable === "LINK_WORKER_TOKEN"
    );
    expect([...(link?.capabilities ?? [])].sort()).toEqual([
      "link-check:run",
      "queue:claim:application_link",
      "queue:write",
    ]);
  });
});

describe("supervised source-run job-id isolation", () => {
  /**
   * BF-10 keeps supervised-run jobs away from unattended claims by excluding
   * any job whose payload carries `source_run_id` — unless the caller names
   * the job ids explicitly, which is how a run claims its own work. That
   * bypass must therefore be reachable only by the source-run operator.
   */
  it("gives only the operator credential the source-run:manage capability", () => {
    const holders = MAINTENANCE_CREDENTIALS.filter((credential) =>
      credential.capabilities.includes("source-run:manage")
    ).map((credential) => credential.environmentVariable);
    expect(holders).toEqual(["SOURCE_RUN_OPERATOR_TOKEN"]);
  });
});
