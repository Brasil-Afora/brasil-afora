/**
 * Lists published opportunities that have no entry in src/data/cost-profiles.json,
 * so their price and funding can be added after new records go live.
 *
 *   bun run cost:missing                      # checks https://brasilafora.org
 *   bun run cost:missing http://localhost:3113
 */
import costProfiles from "../data/cost-profiles.json";

const base = process.argv[2] ?? "https://brasilafora.org";
const profiles: Record<string, unknown> = costProfiles.profiles;

const COLLECTIONS = [
  ["opportunities", "opportunities"],
  ["national-opportunities", "nationalOpportunities"],
] as const;

let missing = 0;
for (const [path, key] of COLLECTIONS) {
  const response = await fetch(`${base}/api/${path}`);
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  const body = (await response.json()) as Record<
    string,
    { id: string; name: string }[]
  >;
  for (const record of body[key] ?? []) {
    if (!(record.id in profiles)) {
      missing += 1;
      console.log(`${path}\t${record.id}\t${record.name}`);
    }
  }
}
console.log(
  missing === 0 ? "Every record has a cost profile." : `${missing} missing.`
);
