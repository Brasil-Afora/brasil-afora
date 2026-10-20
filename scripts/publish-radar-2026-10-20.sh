#!/usr/bin/env bash
set -euo pipefail

# One authorized publication run (owner chat, 2026-10-20). The project's default
# build command stays `next build`; this script is only used by a one-off deploy.
if [[ "${VERCEL_ENV:-}" != "production" ]]; then
  echo "Radar publication requires the linked project's production environment." >&2
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" || "${DATABASE_URL}" == "[SENSITIVE]" ]]; then
  echo "Production database configuration is unavailable." >&2
  exit 1
fi

bun run build
import_args=(
  src/scripts/import-curated-master.ts
  --master data/editorial/2026-10-20/master.json
  --qa data/editorial/2026-10-20/qa.json
  --images data/editorial/2026-10-20/images.json
  --authorization-reference owner-chat-2026-10-20-publish-radar-summer-records
)
bun run "${import_args[@]}" --audit /tmp/radar-production-dry.json
bun -e '
const fs = require("node:fs");
const audit = JSON.parse(fs.readFileSync("/tmp/radar-production-dry.json", "utf8"));
const s = audit.summary;
if (s.master_total !== 16 || s.inserted !== 16 || s.merged !== 0 || s.missing_images !== 0 || s.programs !== 0) {
  throw new Error("Production plan differs from the reviewed batch; import stopped before writing.");
}
console.log("RADAR_PRODUCTION_PLAN_VALIDATED", JSON.stringify(s));
'
bun run "${import_args[@]}" --audit /tmp/radar-production-applied.json --apply
bun -e '
const fs = require("node:fs");
console.log("RADAR_PUBLICATION_AUDIT_BEGIN");
console.log(fs.readFileSync("/tmp/radar-production-applied.json", "utf8"));
console.log("RADAR_PUBLICATION_AUDIT_END");
'
