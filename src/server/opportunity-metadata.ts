import {
  getVerifiedInternationalOpportunityById,
  getVerifiedNationalOpportunityById,
} from "@/data/verified-opportunities";

export interface OpportunityMetadata {
  description: string;
  title: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENTENCE_REGEX = /^(.{30,158}?[.!?])(\s|$)/;
const MAX_DESCRIPTION = 160;

const describe = (text: string): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentence = SENTENCE_REGEX.exec(clean)?.[1];
  if (sentence) {
    return sentence;
  }
  return clean.length > MAX_DESCRIPTION
    ? `${clean.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`
    : clean;
};

/**
 * Title and description for an opportunity's page metadata (shared links,
 * search results). Verified records come from the site's data; catalog records
 * from the database. Returns null when the record can't be found or read.
 */
export const getOpportunityMetadata = async (
  scope: "international" | "national",
  id: string
): Promise<OpportunityMetadata | null> => {
  const verified =
    scope === "international"
      ? getVerifiedInternationalOpportunityById(id)
      : getVerifiedNationalOpportunityById(id);
  if (verified) {
    const text = "descricao" in verified ? verified.descricao : verified.sobre;
    return { description: describe(text), title: verified.nome };
  }
  if (!UUID_REGEX.test(id)) {
    return null;
  }
  try {
    const [{ db }, { eq }] = await Promise.all([
      import("@/db/client"),
      import("drizzle-orm"),
    ]);
    if (scope === "international") {
      const { opportunities } = await import("@/db/schema/opportunities");
      const [row] = await db
        .select({ name: opportunities.name, text: opportunities.description })
        .from(opportunities)
        .where(eq(opportunities.id, id))
        .limit(1);
      return row ? { description: describe(row.text), title: row.name } : null;
    }
    const { nationalOpportunities } = await import(
      "@/db/schema/national-opportunities"
    );
    const [row] = await db
      .select({
        name: nationalOpportunities.name,
        text: nationalOpportunities.about,
      })
      .from(nationalOpportunities)
      .where(eq(nationalOpportunities.id, id))
      .limit(1);
    return row ? { description: describe(row.text), title: row.name } : null;
  } catch {
    return null;
  }
};
