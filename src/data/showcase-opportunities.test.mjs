import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dataDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dataDirectory, "../..");
const dataPath = path.join(dataDirectory, "showcase-opportunities.json");
const internationalMainPath = path.join(
  projectRoot,
  "src/components/international-opportunities/internacional-main.tsx"
);
const productionUrlFiles = [
  "src/app/layout.tsx",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
];
const HTTPS_URL_REGEX = /^https:\/\//;
const SHOWCASE_IMAGE_REGEX = /^\/opportunities\/showcase\/.+\.jpg$/;
const DEADLINE_REGEX = /^202[67]-\d{2}-\d{2}$/;
const LEADING_SLASH_REGEX = /^\//;
const PRODUCTION_URL_REGEX = /https:\/\/brasil-afora\.vercel\.app/;
const LOCALHOST_FALLBACK_REGEX =
  /const (?:FALLBACK|DEFAULT)_SITE_URL = "http:\/\/localhost:3000"/;
const SHOWCASE_COUNT_REGEX =
  /resultCount=\{filteredData\.length \+ INTERNATIONAL_SHOWCASE_COUNT\}/;
const UNCONDITIONAL_SHOWCASE_REGEX =
  /\n\s*<InternacionalShowcase \/>\n\s*<OpportunityList/;
const FILTER_GATED_SHOWCASE_REGEX =
  /!isFilterActive\s*&&\s*<InternacionalShowcase/;

test("ships a small curated dataset with local high-resolution artwork", async () => {
  await assert.doesNotReject(() => stat(dataPath));

  const opportunities = JSON.parse(await BunFileCompat.readText(dataPath));
  assert.equal(opportunities.length, 3);

  const links = opportunities.map(({ officialLink }) => officialLink);
  assert.equal(new Set(links).size, opportunities.length);

  for (const opportunity of opportunities) {
    assert.ok(opportunity.name.length > 8);
    assert.match(opportunity.officialLink, HTTPS_URL_REGEX);
    assert.match(opportunity.image, SHOWCASE_IMAGE_REGEX);
    assert.match(opportunity.applicationDeadline, DEADLINE_REGEX);

    const imagePath = path.join(
      projectRoot,
      "public",
      opportunity.image.replace(LEADING_SLASH_REGEX, "")
    );
    const imageStats = await stat(imagePath);
    assert.ok(imageStats.size > 100_000);
  }
});

test("keeps verified showcase visible independently of catalog filters", async () => {
  const source = await BunFileCompat.readText(internationalMainPath);

  assert.match(source, SHOWCASE_COUNT_REGEX);
  assert.match(source, UNCONDITIONAL_SHOWCASE_REGEX);
  assert.doesNotMatch(source, FILTER_GATED_SHOWCASE_REGEX);
});

test("falls back to the public production domain for metadata", async () => {
  for (const relativePath of productionUrlFiles) {
    const source = await BunFileCompat.readText(
      path.join(projectRoot, relativePath)
    );

    assert.match(source, PRODUCTION_URL_REGEX);
    assert.doesNotMatch(source, LOCALHOST_FALLBACK_REGEX);
  }
});

const BunFileCompat = {
  async readText(filePath) {
    const { readFile } = await import("node:fs/promises");
    return readFile(filePath, "utf8");
  },
};
