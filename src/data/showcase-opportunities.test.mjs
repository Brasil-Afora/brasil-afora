import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dataDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dataDirectory, "../..");
const dataPath = path.join(dataDirectory, "showcase-opportunities.json");
const verifiedDataModulePath = path.join(
  dataDirectory,
  "verified-opportunities.ts"
);
const internationalMainPath = path.join(
  projectRoot,
  "src/components/international-opportunities/internacional-main.tsx"
);
const nationalMainPath = path.join(
  projectRoot,
  "src/components/national-opportunities/nacional-main.tsx"
);
const internationalInfoPath = path.join(
  projectRoot,
  "src/components/international-opportunities/internacional-info.tsx"
);
const nationalInfoPath = path.join(
  projectRoot,
  "src/components/national-opportunities/nacional-info.tsx"
);
const internationalHookPath = path.join(
  projectRoot,
  "src/hooks/use-oportunidades-internacionais.ts"
);
const nationalHookPath = path.join(
  projectRoot,
  "src/hooks/use-oportunidades-nacionais.ts"
);
const verifiedSectionPath = path.join(
  projectRoot,
  "src/components/opportunities/verified-opportunities-section.tsx"
);
const productionUrlFiles = [
  "src/app/layout.tsx",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
];
const HTTPS_URL_REGEX = /^https:\/\//;
const SHOWCASE_IMAGE_REGEX = /^\/opportunities\/showcase\/.+\.jpg$/;
const BR_DEADLINE_REGEX = /^\d{2}\/\d{2}\/202[67]$/;
const LEADING_SLASH_REGEX = /^\//;
const PRODUCTION_URL_REGEX = /https:\/\/brasil-afora\.vercel\.app/;
const LOCALHOST_FALLBACK_REGEX =
  /const (?:FALLBACK|DEFAULT)_SITE_URL = "http:\/\/localhost:3000"/;
const INTERNAL_VERIFIED_SECTION_REGEX = /<VerifiedOpportunitiesSection/;
const OPEN_DEADLINE_FILTER_REGEX = /isOpportunityDeadlineOpen/;
const VERIFIED_DETAIL_REGEX =
  /isVerified(?:International|National)OpportunityId/;
const BRAZILIAN_ELIGIBILITY_REGEX = /brasileir/i;

test("ships verified international and national opportunities for Brazilian students", async () => {
  await assert.doesNotReject(() => stat(dataPath));

  const showcase = JSON.parse(await BunFileCompat.readText(dataPath));
  assert.equal(showcase.verifiedAt, "2026-09-01");
  assert.equal(showcase.international.length, 3);
  assert.equal(showcase.national.length, 3);

  const opportunities = [...showcase.international, ...showcase.national];
  const ids = opportunities.map(({ id }) => id);
  const links = opportunities.map(({ linkOficial }) => linkOficial);
  assert.equal(new Set(ids).size, opportunities.length);
  assert.equal(new Set(links).size, opportunities.length);

  for (const opportunity of opportunities) {
    assert.ok(opportunity.nome.length > 8);
    assert.match(opportunity.linkOficial, HTTPS_URL_REGEX);
    assert.match(opportunity.imagem, SHOWCASE_IMAGE_REGEX);
    assert.match(opportunity.prazoInscricao, BR_DEADLINE_REGEX);

    const eligibilityText = [
      opportunity.descricao,
      opportunity.requisitosEspecificos,
      opportunity.requisitos,
      opportunity.sobre,
    ]
      .flat()
      .filter(Boolean)
      .join(" ");
    assert.match(eligibilityText, BRAZILIAN_ELIGIBILITY_REGEX);

    const imagePath = path.join(
      projectRoot,
      "public",
      opportunity.imagem.replace(LEADING_SLASH_REGEX, "")
    );
    const imageStats = await stat(imagePath);
    assert.ok(imageStats.size > 100_000);
  }
});

test("renders verified opportunities through the normal internal card and detail flow", async () => {
  await assert.doesNotReject(() => stat(verifiedDataModulePath));
  await assert.doesNotReject(() => stat(verifiedSectionPath));

  const [internationalMain, nationalMain, internationalInfo, nationalInfo] =
    await Promise.all([
      BunFileCompat.readText(internationalMainPath),
      BunFileCompat.readText(nationalMainPath),
      BunFileCompat.readText(internationalInfoPath),
      BunFileCompat.readText(nationalInfoPath),
    ]);

  assert.match(internationalMain, INTERNAL_VERIFIED_SECTION_REGEX);
  assert.match(nationalMain, INTERNAL_VERIFIED_SECTION_REGEX);
  assert.match(internationalMain, OPEN_DEADLINE_FILTER_REGEX);
  assert.match(nationalMain, OPEN_DEADLINE_FILTER_REGEX);
  assert.match(internationalInfo, VERIFIED_DETAIL_REGEX);
  assert.match(nationalInfo, VERIFIED_DETAIL_REGEX);
});

test("does not show legacy catalog opportunities after their deadlines", async () => {
  const [internationalHook, nationalHook] = await Promise.all([
    BunFileCompat.readText(internationalHookPath),
    BunFileCompat.readText(nationalHookPath),
  ]);

  assert.match(internationalHook, OPEN_DEADLINE_FILTER_REGEX);
  assert.match(nationalHook, OPEN_DEADLINE_FILTER_REGEX);
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
