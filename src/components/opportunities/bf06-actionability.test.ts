import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const detailSources = [
  new URL(
    "../international-opportunities/internacional-info.tsx",
    import.meta.url
  ),
  new URL("../national-opportunities/nacional-info.tsx", import.meta.url),
];

describe("BF-06 detail-page actionability", () => {
  it("never exposes the raw application URL as an ungated anchor", () => {
    for (const sourceUrl of detailSources) {
      const source = readFileSync(sourceUrl, "utf8");
      expect(source).not.toContain("href={oportunidade.applicationUrl}");
      expect(source).toContain("href={applicationTarget.href}");
    }
  });
});
