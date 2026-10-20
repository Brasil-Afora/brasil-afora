import {
  CATALOG_PATHS,
  normalizeSearchText,
} from "@/components/homepage/home-data";
import { fundingTag } from "@/components/opportunities/catalog-model";
import { PROGRAMS_PATH } from "@/components/programs/program-model";
import type { Program } from "@/components/programs/types";
import {
  verifiedInternationalOpportunities,
  verifiedNationalOpportunities,
} from "@/data/verified-opportunities";
import { db } from "@/db/client";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { opportunities } from "@/db/schema/opportunities";
import { isCatalogOpportunityVisible } from "@/lib/catalog-visibility";
import { MASTER_STATUS_LABELS } from "@/lib/curated-import/master";
import { getBrasiliaDaysUntil } from "@/lib/date-utils";
import {
  type HomeHighlight,
  type HomeHighlights,
  selectHighlights,
} from "@/lib/home-highlights";
import { mergeCatalogOpportunities } from "@/lib/merge-catalog-opportunities";
import {
  type InternationalOpportunity,
  type NationalOpportunity,
  type NationalOpportunityRecord,
  type OpportunityRecord,
  resolveInternationalOpportunity,
  resolveNationalOpportunity,
} from "@/lib/opportunities-api";
import {
  resolveInternationalLocations,
  resolveNationalLocations,
} from "@/server/geo/resolve-location";
import { getVisiblePrograms } from "@/server/programs";
import { enrichCuratedRecords } from "@/server/publication/curated-catalog";

const ISO_DAY_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;

/** The catalog API serializes rows as JSON; the mappers expect that shape. */
const asApiJson = <T>(value: unknown): T =>
  JSON.parse(JSON.stringify(value)) as T;

const toBrDate = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const iso = value instanceof Date ? value.toISOString() : value;
  const match = ISO_DAY_REGEX.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
};

const statusNote = (status: string | undefined): string | undefined =>
  status && status in MASTER_STATUS_LABELS
    ? MASTER_STATUS_LABELS[status as keyof typeof MASTER_STATUS_LABELS]
    : undefined;

const fromInternational = (
  opportunity: InternationalOpportunity,
  addedOn: string | null,
  now: Date
): HomeHighlight => {
  const scholarship = fundingTag(opportunity.custo, opportunity.tipoBolsa);
  return {
    addedOn,
    collection: "international",
    identity: "",
    daysLeft: getBrasiliaDaysUntil(opportunity.prazoInscricao, now),
    deadline: opportunity.prazoInscricao,
    deadlineNote: statusNote(opportunity.curatedStatus),
    href: `${CATALOG_PATHS.international}/${opportunity.id}`,
    id: `international:${opportunity.id}`,
    image: opportunity.imagem,
    institution: opportunity.instituicaoResponsavel,
    level: opportunity.nivelEnsino,
    name: opportunity.nome,
    officialLink: opportunity.linkOficial,
    place: opportunity.pais,
    tags: [opportunity.tipo, ...(scholarship ? [scholarship] : [])].filter(
      Boolean
    ),
    verified: opportunity.verified === true,
  };
};

const fromNational = (
  opportunity: NationalOpportunity,
  addedOn: string | null,
  now: Date
): HomeHighlight => ({
  addedOn,
  collection: "national",
  identity: "",
  daysLeft: getBrasiliaDaysUntil(opportunity.prazoInscricao, now),
  deadline: opportunity.prazoInscricao,
  deadlineNote: statusNote(opportunity.curatedStatus),
  href: `${CATALOG_PATHS.national}/${opportunity.id}`,
  id: `national:${opportunity.id}`,
  image: opportunity.imagem,
  institution: opportunity.instituicaoResponsavel,
  level: opportunity.nivelEnsino,
  name: opportunity.nome,
  officialLink: opportunity.linkOficial,
  place: opportunity.cidadeEstado || opportunity.pais,
  tags: [opportunity.tipo].filter(Boolean),
  verified: opportunity.verified === true,
});

const fromProgram = (program: Program, now: Date): HomeHighlight => {
  const deadline = program.inscricoes.prazoInscricao ?? "";
  return {
    // Programs carry no creation date; the import/check date is the closest.
    addedOn: program.atualizadoEm || null,
    collection: "programs",
    identity: "",
    daysLeft: getBrasiliaDaysUntil(deadline, now),
    deadline,
    deadlineNote: program.inscricoes.continuo
      ? "Inscrições contínuas"
      : (statusNote(program.inscricoes.situacaoNaFonte) ??
        (program.inscricoes.abertura
          ? `Abertura: ${program.inscricoes.abertura}`
          : undefined)),
    href: `${PROGRAMS_PATH}/${program.id}`,
    id: `programs:${program.id}`,
    image: program.imagem ?? "",
    institution: program.instituicaoResponsavel,
    level: program.niveis.join(" · "),
    name: program.nome,
    officialLink: program.linkOficial,
    place: program.pais ?? program.local,
    tags: [program.tipo, ...program.beneficios.slice(0, 1)].filter(Boolean),
    verified: program.verified === true,
  };
};

const readInternational = async (now: Date): Promise<HomeHighlight[]> => {
  const rows = await db.select().from(opportunities);
  const enriched = await enrichCuratedRecords(
    rows.map((row) => ({
      ...row,
      locations: resolveInternationalLocations(row.city, row.country),
    }))
  );
  const addedById = new Map(
    rows.map((row) => [row.id, toBrDate(row.createdAt)])
  );
  const records = enriched.flatMap((record) => {
    const mapped = resolveInternationalOpportunity(
      asApiJson<OpportunityRecord>(record),
      null
    );
    return mapped ? [mapped] : [];
  });
  return mergeCatalogOpportunities(records, verifiedInternationalOpportunities)
    .filter((opportunity) => isCatalogOpportunityVisible(opportunity, now))
    .map((opportunity) =>
      fromInternational(opportunity, addedById.get(opportunity.id) ?? null, now)
    );
};

const readNational = async (now: Date): Promise<HomeHighlight[]> => {
  const rows = await db.select().from(nationalOpportunities);
  const enriched = await enrichCuratedRecords(
    rows.map((row) => ({
      ...row,
      locations: resolveNationalLocations(row.cityState),
    }))
  );
  const addedById = new Map(
    rows.map((row) => [row.id, toBrDate(row.createdAt)])
  );
  const records = enriched.flatMap((record) => {
    const mapped = resolveNationalOpportunity(
      asApiJson<NationalOpportunityRecord>(record),
      null
    );
    return mapped ? [mapped] : [];
  });
  return mergeCatalogOpportunities(records, verifiedNationalOpportunities)
    .filter((opportunity) => isCatalogOpportunityVisible(opportunity, now))
    .map((opportunity) =>
      fromNational(opportunity, addedById.get(opportunity.id) ?? null, now)
    );
};

const settle = async (
  read: Promise<HomeHighlight[]>
): Promise<HomeHighlight[]> => {
  try {
    return await read;
  } catch {
    return [];
  }
};

/**
 * "Novas oportunidades" (joined the catalog in the last NEW_WINDOW_DAYS,
 * newest first) and "Prestes a fechar" (deadline within CLOSING_WINDOW_DAYS,
 * soonest first), across the three public collections. Uses the catalog's own
 * mapping and visibility rule, so nothing appears here that the catalog hides.
 */
export const getHomeHighlights = async (
  now: Date = new Date()
): Promise<HomeHighlights> => {
  const [international, national, programs] = await Promise.all([
    settle(readInternational(now)),
    settle(readNational(now)),
    settle(
      getVisiblePrograms().then((list) =>
        list.map((program) => fromProgram(program, now))
      )
    ),
  ]);
  return selectHighlights(
    [...international, ...national, ...programs].map((item) => ({
      ...item,
      identity: `${normalizeSearchText(item.name).trim()}|${normalizeSearchText(item.institution).trim()}`,
    })),
    now
  );
};
