import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PUBLIC_RENDERING_FILES = [
  "../components/international-opportunities/internacional-info.tsx",
  "../components/international-opportunities/internacional-list.tsx",
  "../components/national-opportunities/nacional-info.tsx",
  "../components/national-opportunities/nacional-list.tsx",
  "../components/opportunities/opportunity-card.tsx",
  "../components/opportunities/types.ts",
  "./opportunities-api.ts",
  "../server/publication/publication-workflow.ts",
] as const;

const PROHIBITED_FINAL_PLACEHOLDER =
  /(["'`])(?:-|N\/A|N\/D|Não informado|null|undefined)\1/g;

describe("public missing-information policy", () => {
  it.each(
    PUBLIC_RENDERING_FILES
  )("does not contain a prohibited final placeholder in %s", (relativePath) => {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");

    expect(source.match(PROHIBITED_FINAL_PLACEHOLDER)).toBeNull();
  });
});
