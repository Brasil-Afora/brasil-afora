import {
  type CatalogItem,
  coverFor,
  toInternationalItem,
  toNationalItem,
} from "@/components/opportunities/catalog-model";
import {
  type DetailStep,
  toInternationalDetail,
  toNationalDetail,
} from "@/components/opportunities/detail-model";
import {
  isVerifiedInternationalOpportunityId,
  isVerifiedNationalOpportunityId,
  verifiedInternationalOpportunities,
  verifiedNationalOpportunities,
} from "@/data/verified-opportunities";
import { getBrasiliaDaysUntil } from "@/lib/date-utils";
import { findCountry, findState, type GeoPoint } from "@/lib/geo";
import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";
import type { LocationsById } from "@/server/geo/opportunity-locations";
import type { FavoriteOpportunity } from "./types";

// The profile joins three things by opportunity id: the favorites saved in
// the account, the application tracking kept in this browser (status, pin,
// the student's own tasks, and the steps ticked on each opportunity page),
// and the opportunity records themselves (verified set and catalog).

export type ApplicationStatus = "Em preparação" | "Inscrito" | "Aprovado";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Em preparação",
  "Inscrito",
  "Aprovado",
];

export interface ChecklistTask {
  completed: boolean;
  text: string;
}

// These keys and shapes predate the redesign; students already have data in
// them, so they must not change.
export const STATUS_STORAGE_KEY = "oportunidadesStatus";
export const PINNED_STORAGE_KEY = "oportunidadesPinned";
export const TASKS_STORAGE_KEY = "oportunidadesChecklist";

export type StatusById = Record<string, ApplicationStatus>;
export type PinnedById = Record<string, boolean>;
export type TasksById = Record<string, ChecklistTask[]>;

type Scope = CatalogItem["scope"];

export interface ProfileItem extends CatalogItem {
  /** Country for "similar" suggestions ("Brasil" for national ones). */
  country: string;
  /** The favorite's catalog, for removing it; null when it isn't saved. */
  favorite: FavoriteOpportunity["categoria"] | null;
  /** Steps from the source, the same ones the opportunity page lists. */
  steps: DetailStep[];
  /** Where the opportunity page keeps the ticked steps. */
  stepsKey: string;
  type: string;
}

export interface ProfileView {
  /** Where the student's opportunities are, for the header map. */
  pins: GeoPoint[];
  saved: ProfileItem[];
  similar: CatalogItem[];
  started: ProfileItem[];
  /** Open deadlines within the coming weeks, soonest first. */
  upcoming: ProfileItem[];
}

interface ProfileSources {
  favorites: FavoriteOpportunity[];
  international: InternationalOpportunity[];
  national: NationalOpportunity[];
  now: Date;
  pinned: PinnedById;
  statuses: StatusById;
  steps: Record<string, string[]>;
  tasks: TasksById;
  verifiedLocations: { international: LocationsById; national: LocationsById };
}

const UPCOMING_DAYS = 30;
const SIMILAR_COUNT = 3;
const SAME_TYPE_SCORE = 2;
const SAME_COUNTRY_SCORE = 1;
const UNKNOWN_DEADLINE = Number.MAX_SAFE_INTEGER;
const DIACRITICS_REGEX = /\p{M}/gu;

const STATUS_ORDER: Record<ApplicationStatus, number> = {
  "Em preparação": 0,
  Inscrito: 1,
  Aprovado: 2,
};

const normalize = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase().trim();

const keyOf = (scope: Scope, id: string) => `${scope}:${id}`;

const isOpen = (item: CatalogItem): boolean =>
  item.daysLeft !== null && item.daysLeft >= 0;

const byDeadline = (a: CatalogItem, b: CatalogItem): number =>
  (a.daysLeft ?? UNKNOWN_DEADLINE) - (b.daysLeft ?? UNKNOWN_DEADLINE);

// ---------------------------------------------------------------------------
// Records

type RecordEntry =
  | {
      kind: "international";
      record: InternationalOpportunity;
      verified: boolean;
    }
  | { kind: "national"; record: NationalOpportunity; verified: boolean };

const indexRecords = ({
  international,
  national,
  verifiedLocations,
}: ProfileSources): Map<string, RecordEntry> => {
  const index = new Map<string, RecordEntry>();
  for (const record of international) {
    index.set(keyOf("international", record.id), {
      kind: "international",
      record,
      verified: false,
    });
  }
  for (const record of national) {
    index.set(keyOf("national", record.id), {
      kind: "national",
      record,
      verified: false,
    });
  }
  for (const record of verifiedInternationalOpportunities) {
    index.set(keyOf("international", record.id), {
      kind: "international",
      record: {
        ...record,
        localizacoes: verifiedLocations.international[record.id] ?? [],
      },
      verified: isVerifiedInternationalOpportunityId(record.id),
    });
  }
  for (const record of verifiedNationalOpportunities) {
    index.set(keyOf("national", record.id), {
      kind: "national",
      record: {
        ...record,
        localizacoes: verifiedLocations.national[record.id] ?? [],
      },
      verified: isVerifiedNationalOpportunityId(record.id),
    });
  }
  return index;
};

const itemOf = (
  entry: RecordEntry,
  favorite: ProfileItem["favorite"],
  now: Date
): ProfileItem => {
  if (entry.kind === "international") {
    const { record, verified } = entry;
    return {
      ...toInternationalItem(record, verified, now),
      country: record.pais,
      favorite,
      steps: toInternationalDetail(record, verified, now).applySteps,
      stepsKey: keyOf("international", record.id),
      type: record.tipo,
    };
  }
  const { record, verified } = entry;
  return {
    ...toNationalItem(record, verified, now),
    country: "Brasil",
    favorite,
    steps: toNationalDetail(record, verified, now).applySteps,
    stepsKey: keyOf("national", record.id),
    type: record.tipo,
  };
};

/** A favorite whose record isn't in the lists: what the favorite itself says. */
const itemFromFavorite = (
  favorite: FavoriteOpportunity,
  now: Date
): ProfileItem => {
  const scope: Scope =
    favorite.categoria === "internacional" ? "international" : "national";
  const region =
    scope === "international"
      ? (findCountry(favorite.pais)?.region ?? "mundo")
      : (findState(favorite.pais)?.region ?? "brasil");
  return {
    audience: "",
    country: scope === "international" ? favorite.pais : "Brasil",
    cover: coverFor(favorite.imagem, region, favorite.nome, ""),
    daysLeft: getBrasiliaDaysUntil(favorite.prazoInscricao, now),
    deadline: favorite.prazoInscricao,
    favorite: favorite.categoria,
    href: favorite.detalhePath,
    id: favorite.id,
    institution: "",
    level: "",
    locations: [],
    name: favorite.nome,
    place: favorite.pais,
    scope,
    steps: [],
    stepsKey: keyOf(scope, favorite.id),
    tags: [],
    type: "",
    verified: false,
  };
};

// ---------------------------------------------------------------------------
// Tracking

export const stepsDoneOf = (
  item: ProfileItem,
  steps: Record<string, string[]>
): number => {
  const done = new Set(steps[item.stepsKey] ?? []);
  return item.steps.filter((step) => done.has(step.key)).length;
};

const isStarted = (item: ProfileItem, sources: ProfileSources): boolean =>
  Boolean(sources.statuses[item.id]) ||
  (sources.tasks[item.id]?.length ?? 0) > 0 ||
  (sources.steps[item.stepsKey]?.length ?? 0) > 0;

const byProgress =
  ({ pinned, statuses }: ProfileSources) =>
  (a: ProfileItem, b: ProfileItem): number =>
    STATUS_ORDER[statuses[a.id] ?? "Em preparação"] -
      STATUS_ORDER[statuses[b.id] ?? "Em preparação"] ||
    Number(Boolean(pinned[b.id])) - Number(Boolean(pinned[a.id])) ||
    byDeadline(a, b);

// ---------------------------------------------------------------------------
// Similar

const similarTo = (
  mine: ProfileItem[],
  index: Map<string, RecordEntry>,
  now: Date
): CatalogItem[] => {
  if (mine.length === 0) {
    return [];
  }
  const taken = new Set(mine.map((item) => item.stepsKey));
  const takenNames = new Set(mine.map((item) => normalize(item.name)));
  const types = new Set(mine.map((item) => normalize(item.type)));
  const countries = new Set(mine.map((item) => normalize(item.country)));
  const seen = new Set<string>();
  return [...index.entries()]
    .filter(([key]) => !taken.has(key))
    .map(([, entry]) => itemOf(entry, null, now))
    .filter((item) => {
      const name = normalize(item.name);
      if (!isOpen(item) || takenNames.has(name) || seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    })
    .map((item) => ({
      item,
      score:
        (types.has(normalize(item.type)) ? SAME_TYPE_SCORE : 0) +
        (countries.has(normalize(item.country)) ? SAME_COUNTRY_SCORE : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byDeadline(a.item, b.item))
    .slice(0, SIMILAR_COUNT)
    .map(({ item }) => item);
};

// ---------------------------------------------------------------------------
// The view

export const buildProfileView = (sources: ProfileSources): ProfileView => {
  const { favorites, now, statuses, tasks } = sources;
  const index = indexRecords(sources);
  const items = new Map<string, ProfileItem>();

  for (const favorite of favorites) {
    const scope: Scope =
      favorite.categoria === "internacional" ? "international" : "national";
    const entry = index.get(keyOf(scope, favorite.id));
    const item = entry
      ? itemOf(entry, favorite.categoria, now)
      : itemFromFavorite(favorite, now);
    items.set(item.stepsKey, item);
  }

  // Opportunities followed without being saved: ticked steps (scoped keys),
  // or a status or tasks (keyed by id alone, which is unique across both).
  const trackedKeys = [
    ...Object.keys(sources.steps),
    ...[...Object.keys(statuses), ...Object.keys(tasks)].flatMap((id) => [
      keyOf("international", id),
      keyOf("national", id),
    ]),
  ];
  for (const key of trackedKeys) {
    const entry = index.get(key);
    if (entry && !items.has(key)) {
      items.set(key, itemOf(entry, null, now));
    }
  }

  const all = [...items.values()];
  const started = all
    .filter((item) => isStarted(item, sources))
    .sort(byProgress(sources));
  const startedKeys = new Set(started.map((item) => item.stepsKey));
  const saved = all
    .filter((item) => item.favorite && !startedKeys.has(item.stepsKey))
    .sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || byDeadline(a, b));
  const upcoming = [...started, ...saved]
    .filter(
      (item) =>
        item.daysLeft !== null &&
        item.daysLeft >= 0 &&
        item.daysLeft <= UPCOMING_DAYS &&
        statuses[item.id] !== "Aprovado" &&
        statuses[item.id] !== "Inscrito"
    )
    .sort(byDeadline);

  return {
    pins: [...started, ...saved].flatMap((item) => item.locations),
    saved,
    similar: similarTo([...started, ...saved], index, now),
    started,
    upcoming,
  };
};
