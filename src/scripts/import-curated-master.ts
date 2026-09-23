/** Offline editorial import. Dry-run by default; --apply requires an explicit authorization reference. */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { publicOpportunityV1Schema } from "@/contracts/opportunity-v1";
import { db, pgPool } from "@/db/client";
import {
  auditEvents,
  editions,
  organizations,
  outboxEvents,
  productFitAssessments,
  programs,
  publicationGateDecisions,
  publicationVersions,
} from "@/db/schema/ingestion";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { opportunities } from "@/db/schema/opportunities";
import {
  currentDeadline,
  identityKey,
  isProgramRecord,
  type MasterRecord,
  masterRecordSchema,
  normalizeName,
  normalizeOfficialUrl,
  qaRecordSchema,
} from "@/lib/curated-import/master";
import {
  mapMasterToLegacy,
  masterDescription,
} from "@/lib/curated-import/projection";
import { curatedPublicationSchema } from "@/server/publication/curated-projection";
import { deliverPendingOutbox } from "@/server/publication/publication-workflow";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const stableId = (s: string) => {
  const h = hash(s);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const load = (p: string | undefined) => {
  if (!p) {
    throw new Error("Required JSON path missing");
  }
  return JSON.parse(readFileSync(p, "utf8"));
};
const typeMap: Record<string, string> = {
  academic_program: "short_course",
  winter_program: "short_course",
  summer_program: "summer_program",
  fellowship: "fellowship",
  scholarship: "scholarship",
  research: "research",
  competition: "competition",
  grant: "scholarship",
  mentorship: "mentorship",
  volunteering: "volunteering",
  internship: "internship",
  postgraduate: "degree",
  language_program: "language_course",
};
const levelMap: Record<string, string> = {
  elementary_school: "elementary_middle",
  primary_school: "elementary_middle",
  middle_school: "elementary_middle",
  high_school: "high_school",
  technical_school: "technical_secondary",
  gap_year: "gap_year",
  undergraduate: "undergraduate",
  graduate: "graduate",
  masters: "graduate",
  phd: "graduate",
  recent_graduate: "recent_graduate",
};
interface ImageChoice {
  image: string;
  source_url: string;
}
interface LinkCorrection {
  action: string;
  original_url: string;
  replacement_url?: string;
}
const mergeReason = (matched: boolean) =>
  matched
    ? "Matched existing record by name, reviewed alias or unique official URL"
    : "New curated identity";
const deadlinePrecision = (r: MasterRecord) => {
  if (r.applications_status === "rolling") {
    return "rolling";
  }
  return currentDeadline(r) ? "date_only" : "unknown";
};
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Import validations deliberately fail before the single batch transaction.
const run = async () => {
  const master = masterRecordSchema.array().parse(load(arg("--master")));
  const qa = qaRecordSchema.array().parse(load(arg("--qa")).records);
  if (new Set(master.map(identityKey)).size !== master.length) {
    throw new Error("Duplicate master identities");
  }
  const qaByKey = new Map(qa.map((r) => [identityKey(r), r]));
  if (
    qaByKey.size !== master.length ||
    master.some((r) => !qaByKey.has(identityKey(r)))
  ) {
    throw new Error("Master/QA identity mismatch");
  }
  const images: Record<string, ImageChoice> = arg("--images")
    ? load(arg("--images"))
    : {};
  const corrections: LinkCorrection[] = arg("--link-review")
    ? load(arg("--link-review"))
    : [];
  const replacement = new Map(
    corrections
      .filter((x) => x.action === "REPLACE_URL" && x.replacement_url)
      .map((x) => [x.original_url, x.replacement_url ?? x.original_url])
  );
  const legacy = [
    ...(await db.select().from(opportunities)).map((x) => ({
      ...x,
      collection: "international",
    })),
    ...(await db.select().from(nationalOpportunities)).map((x) => ({
      ...x,
      collection: "national",
    })),
  ];
  const existingOrganizations = await db.select().from(organizations);
  const organizationByName = new Map(
    existingOrganizations.map((organization) => [
      normalizeName(organization.canonicalName),
      organization,
    ])
  );
  const organizationNames = new Map<string, string>();
  for (const record of master) {
    const name = record.organization || record.name;
    const key = normalizeName(name);
    if (!organizationNames.has(key)) {
      organizationNames.set(
        key,
        organizationByName.get(key)?.canonicalName ?? name
      );
    }
  }
  const versions = (await db.select().from(publicationVersions)).sort(
    (a, b) => a.version - b.version
  );
  const existingImport = new Map(
    versions.flatMap((v) => {
      const parsed = curatedPublicationSchema.safeParse(
        v.payload.curated_master
      );
      return parsed.success
        ? [[identityKey(parsed.data.source), v] as const]
        : [];
    })
  );
  const masterUrlCount = new Map<string, number>();
  for (const r of master) {
    const u = normalizeOfficialUrl(r.official_url);
    masterUrlCount.set(u, (masterUrlCount.get(u) ?? 0) + 1);
  }
  const now = new Date().toISOString();
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const claimed = new Set<string>();
  const planned = master.map((original, index) => {
    const key = identityKey(original);
    const prior = existingImport.get(key);
    const aliasNames: Record<string, string> = {
      "UWC Short Course: Amazônia 360": "Amazônia 360",
      "Inteli Camp 2027": "Inteli Camp",
      "Feira Brasileira de Ciências e Engenharia — FEBRACE":
        "FEBRACE – Feira Brasileira de Ciências e Engenharia",
    };
    const candidates = legacy.filter(
      (x) =>
        normalizeName(x.name) === normalizeName(original.name) ||
        normalizeName(x.name) ===
          normalizeName(aliasNames[original.name] ?? original.name) ||
        (masterUrlCount.get(normalizeOfficialUrl(original.official_url)) ===
          1 &&
          normalizeOfficialUrl(x.officialLink) ===
            normalizeOfficialUrl(original.official_url))
    );
    if (candidates.length > 1) {
      throw new Error(`Ambiguous merge: ${original.name}`);
    }
    const matched = candidates[0];
    const id =
      prior?.editionId ?? matched?.id ?? stableId(`master-edition:${key}`);
    if (claimed.has(id)) {
      throw new Error(`Two source records target ${id}`);
    }
    claimed.add(id);
    const source: MasterRecord = {
      ...original,
      official_url:
        replacement.get(original.official_url) ?? original.official_url,
    };
    const q = qaByKey.get(key);
    if (!q) {
      throw new Error(`Missing QA: ${key}`);
    }
    const chosen = images[key];
    const metadata = curatedPublicationSchema.parse({
      source,
      verified: q.verification_badge_recommended,
      badgeReason: q.badge_reason,
      sourceHash: hash(JSON.stringify({ original, qa: q, chosen, source })),
      importedAt: now,
      image: chosen?.image ?? matched?.image ?? "",
      imageSource: chosen?.source_url ?? null,
      program: isProgramRecord(source),
      authorizationReference: arg("--authorization-reference") ?? "dry-run",
    });
    return {
      index,
      key,
      id,
      source,
      metadata,
      prior,
      matched,
      action: prior || matched ? "MERGED" : "INSERTED",
      programId: stableId(`master-program:${key}`),
      versionId: randomUUID(),
    };
  });
  const summary = {
    master_total: master.length,
    inserted: planned.filter((x) => x.action === "INSERTED").length,
    merged: planned.filter((x) => x.action === "MERGED").length,
    skipped: 0,
    missing_images: planned.filter((x) => !x.metadata.image).length,
    verified: planned.filter((x) => x.metadata.verified).length,
    programs: planned.filter((x) => x.metadata.program).length,
    existing_records: legacy.length,
    applied: false,
  };
  const auditPath = arg("--audit") ?? "curated-import-audit.json";
  const audit = () => ({
    summary,
    records: planned.map((x) => ({
      source_index: x.index,
      source_identity: x.key,
      name: x.source.name,
      database_id: x.id,
      program_id: x.programId,
      action: x.action,
      source_hash: x.metadata.sourceHash,
      collection:
        x.source.scope === "international" ? "international" : "national",
      program: x.metadata.program,
      verified: x.metadata.verified,
      reason: x.prior
        ? "Existing curated identity"
        : mergeReason(Boolean(x.matched)),
    })),
  });
  writeFileSync(auditPath, JSON.stringify(audit(), null, 2));
  console.info(summary);
  if (!process.argv.includes("--apply")) {
    return;
  }
  if (!arg("--authorization-reference")) {
    throw new Error("Explicit authorization reference is required for --apply");
  }
  if (summary.missing_images) {
    throw new Error(
      "Image audit is incomplete; refusing partial visual import"
    );
  }
  const pending = await pgPool.query(
    "SELECT count(*)::int count FROM outbox_events WHERE published_at IS NULL AND dead_lettered_at IS NULL"
  );
  if (pending.rows[0].count) {
    throw new Error("Unrelated pending outbox work must be handled separately");
  }
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The offline batch keeps all canonical writes in one atomic transaction; publication remains in the outbox.
  await db.transaction(async (tx) => {
    for (const x of planned) {
      if (
        x.prior?.payload.curated_master &&
        curatedPublicationSchema.parse(x.prior.payload.curated_master)
          .sourceHash === x.metadata.sourceHash
      ) {
        continue;
      }
      const r = x.source;
      const lifecycle = mapMasterToLegacy(r, x.metadata.image, today)
        .international.lifecycleStatus;
      const orgKey = normalizeName(r.organization || r.name);
      const orgName = organizationNames.get(orgKey) ?? r.name;
      const orgId =
        organizationByName.get(orgKey)?.id ??
        stableId(`master-organization:${orgKey}`);
      const org = await tx
        .insert(organizations)
        .values({
          id: orgId,
          canonicalName: orgName,
          officialDomains: [new URL(r.official_url).hostname],
        })
        .onConflictDoUpdate({
          target: organizations.id,
          set: { canonicalName: orgName },
        })
        .returning({ id: organizations.id });
      await tx
        .insert(programs)
        .values({
          id: x.programId,
          canonicalName: r.name,
          organizerId: org[0].id,
          officialHomepage: r.official_url,
          opportunityTypes: [typeMap[r.type] ?? "unknown"],
          subjectAreas: r.fields,
        })
        .onConflictDoUpdate({
          target: programs.id,
          set: {
            canonicalName: r.name,
            officialHomepage: r.official_url,
            subjectAreas: r.fields,
          },
        });
      await tx
        .insert(editions)
        .values({
          id: x.id,
          programId: x.programId,
          identityKey: "editorial-master-2026-09-23",
          editionLabel: r.name,
          status: lifecycle,
        })
        .onConflictDoUpdate({
          target: editions.id,
          set: { status: lifecycle },
        });
      const projection = publicOpportunityV1Schema.parse({
        id: x.id,
        publication_version_id: x.versionId,
        collection: r.scope === "international" ? "international" : "national",
        title: r.name,
        description: masterDescription(r),
        organizer: r.organization || null,
        opportunity_types: [typeMap[r.type] ?? "unknown"],
        education_levels: [
          ...new Set(
            r.levels.flatMap((v) => (levelMap[v] ? [levelMap[v]] : []))
          ),
        ],
        modality: r.format === "remote" ? "online" : r.format,
        brazil_eligibility:
          r.brazilian_eligibility === "confirmed"
            ? "eligible"
            : "likely_eligible",
        age_rules: [],
        location: [r.city, r.country].filter(Boolean).join("; ") || null,
        start_date: null,
        end_date: null,
        application_deadline_date: currentDeadline(r),
        application_deadline_time: null,
        application_deadline_timezone: null,
        deadline_precision: deadlinePrecision(r),
        lifecycle,
        official_information_url: r.official_url,
        application_url: null,
        application_link_status: "unchecked",
        can_apply: false,
        image_url: x.metadata.image.startsWith("http")
          ? x.metadata.image
          : null,
        is_free: null,
        cost_amount: null,
        currency: null,
        last_verified_at: null,
        semantic_fields: {},
      });
      await tx.insert(publicationVersions).values({
        id: x.versionId,
        editionId: x.id,
        version: (x.prior?.version ?? 0) + 1,
        editorialState: "approved",
        payload: {
          curated_master: x.metadata,
          public_projection: projection,
        },
        compatibilityPayload: {},
        createdBy: "authorized-editorial-master-import",
        approvedAt: new Date(now),
        supersedesVersionId: x.prior?.id ?? null,
      });
      await tx.insert(productFitAssessments).values({
        editionId: x.id,
        decision: "include",
        reasons: ["user_approved_editorial_master"],
        siteCollection: projection.collection,
        mappedOpportunityTypes: projection.opportunity_types,
        mappedEducationLevels: projection.education_levels,
        siteContractCompatible: true,
      });
      await tx.insert(publicationGateDecisions).values({
        editionId: x.id,
        publicationVersionId: x.versionId,
        outcome: "manual_review",
        reasons: ["approved_master_dataset"],
        explanations: [x.metadata.authorizationReference],
        sourceCohort: "curated-master-2026-09-23",
      });
      await tx.insert(auditEvents).values({
        actorId: x.metadata.authorizationReference,
        actorKind: "editorial_batch",
        action: "publication.approved",
        entityType: "publication_version",
        entityId: x.versionId,
        metadata: {
          source_hash: x.metadata.sourceHash,
          master_identity: x.key,
          source_index: x.index,
          reason:
            "Explicit user instruction to publish every approved master record; no reviewer account impersonated.",
        },
      });
      await tx.insert(outboxEvents).values({
        aggregateType: "publication_version",
        aggregateId: x.versionId,
        eventType: "publication.approved",
        payload: {
          edition_id: x.id,
          publication_version_id: x.versionId,
          authorization_reference: x.metadata.authorizationReference,
        },
        deduplicationKey: `publication.approved:${x.versionId}`,
      });
    }
  });
  let totalDelivered = 0;
  while (true) {
    const delivered = await deliverPendingOutbox(
      db,
      "authorized-curated-master-import",
      100
    );
    totalDelivered += delivered.delivered;
    if (delivered.failed) {
      throw new Error(
        "Publication outbox failed; inspect errors before retrying"
      );
    }
    if (delivered.delivered === 0) {
      break;
    }
  }
  console.info({ delivered: totalDelivered });
  summary.applied = true;
  writeFileSync(auditPath, JSON.stringify(audit(), null, 2));
};
try {
  await run();
} finally {
  await pgPool.end();
}
