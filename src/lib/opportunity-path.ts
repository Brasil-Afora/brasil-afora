/**
 * Detail-page URLs for catalog opportunities. A database record's address is
 * its name as a slug plus the first block of its UUID
 * (`/oportunidades/internacionais/yale-young-global-scholars-2027-d1c6abf8`):
 * the words tell people and search engines what the page is, and the id block
 * keeps the link working when the name is edited. Verified records already
 * have readable ids, so their address is the id itself.
 */

export type OpportunityPathScope = "international" | "national";

export const OPPORTUNITY_PATHS: Record<OpportunityPathScope, string> = {
  international: "/oportunidades/internacionais",
  national: "/oportunidades/nacionais",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_ID_REGEX = /^(?:(.*)-)?([0-9a-f]{8})$/i;
const DIACRITICS_REGEX = /\p{M}/gu;
const NON_SLUG_REGEX = /[^a-z0-9]+/g;
const EDGE_DASHES_REGEX = /^-+|-+$/g;
const MAX_SLUG_LENGTH = 70;

export const isOpportunityUuid = (value: string): boolean =>
  UUID_REGEX.test(value);

/** "Bolsa Lester B. Pearson — 2027" → "bolsa-lester-b-pearson-2027". */
export const slugifyOpportunityName = (name: string): string => {
  const slug = name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(NON_SLUG_REGEX, "-")
    .replace(EDGE_DASHES_REGEX, "");
  if (slug.length <= MAX_SLUG_LENGTH) {
    return slug;
  }
  const cut = slug.slice(0, MAX_SLUG_LENGTH + 1);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(
    EDGE_DASHES_REGEX,
    ""
  );
};

/** The last path segment of an opportunity's detail page. */
export const opportunityPathSegment = (id: string, name: string): string => {
  if (!isOpportunityUuid(id)) {
    return id;
  }
  const shortId = id.slice(0, 8).toLowerCase();
  const slug = slugifyOpportunityName(name);
  return slug ? `${slug}-${shortId}` : shortId;
};

export const opportunityPath = (
  scope: OpportunityPathScope,
  id: string,
  name: string
): string => `${OPPORTUNITY_PATHS[scope]}/${opportunityPathSegment(id, name)}`;

export type OpportunityParam =
  | { kind: "id"; id: string }
  | { kind: "short-id"; shortId: string };

/**
 * What a detail-page segment points at: a full UUID (old links), the id block
 * of a slug address, or a verified record's own id.
 */
export const parseOpportunityParam = (segment: string): OpportunityParam => {
  const value = decodeURIComponent(segment);
  if (isOpportunityUuid(value)) {
    return { kind: "id", id: value.toLowerCase() };
  }
  const shortId = SHORT_ID_REGEX.exec(value)?.[2];
  return shortId
    ? { kind: "short-id", shortId: shortId.toLowerCase() }
    : { kind: "id", id: value };
};
