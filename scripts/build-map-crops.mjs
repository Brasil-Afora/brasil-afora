// Cuts the catalog's map images — the two header maps and the regional card
// covers — from an 8192×4096 equirectangular world map:
//
//   node scripts/build-map-crops.mjs public/map-day.jpg public/catalog/day
//
// The windows below are the record of where each image sits on the globe.
// The header windows are the ones in src/components/opportunities/
// map-windows.ts (pins are drawn over those, so they must match exactly).
// The cover windows were never written down when the night covers were made;
// they were recovered on 2026-09-23 by matching each committed night cover
// against public/map.jpg (normalized cross-correlation 0.94–0.98), snapped
// to the round degrees the matches landed on, and checked by re-cutting the
// night covers from them (mean difference 0.5–6.5 of 255; the high end is
// the densest city lights, where the original resize bloomed the points).
//
// Output keeps each committed night file's name and pixel size. Same rule as
// the night set: a re-cut of an image already published ships under a new
// filename, because the image URL is part of the optimization cache key.
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [source, outDir] = process.argv.slice(2);
if (!(source && outDir)) {
  console.error("usage: node scripts/build-map-crops.mjs <8192x4096 map> <output dir>");
  process.exit(1);
}

const MAP_WIDTH = 8192;
const MAP_HEIGHT = 4096;

/** name: [west, east, north, south, width, height] */
const CROPS = {
  "header-mundo-v2": [-130, 160, 66, -48, 2000, 786],
  "header-brasil": [-82, -18, 8, -36, 1200, 825],
  "cover-africa": [-16.71, 53, 19.63, -15.13, 800, 399],
  "cover-america-do-norte": [-127, -63, 58, 26, 800, 400],
  "cover-america-latina": [-95, -35, 3, -27, 800, 400],
  "cover-asia": [70.16, 139.98, 47.72, 12.9, 800, 399],
  "cover-brasil": [-72.84, -27, -2.35, -25.17, 800, 399],
  "cover-centro-oeste": [-65, -41, -9, -21, 800, 400],
  "cover-europa": [-10, 34, 61, 39, 800, 400],
  "cover-mundo": [-95, 55.1, 57.5, -17.5, 800, 400],
  "cover-nordeste": [-52, -28, -2.5, -14.5, 800, 400],
  "cover-norte": [-75, -45, 3.62, -11.36, 800, 399],
  "cover-oceania": [125, 175, -15.5, -40.5, 800, 400],
  "cover-sudeste": [-57.01, -32.97, -14.98, -27, 800, 400],
  "cover-sul": [-62, -40, -22, -33, 800, 399],
};

mkdirSync(outDir, { recursive: true });
for (const [name, [west, east, north, south, width, height]] of Object.entries(CROPS)) {
  const region = {
    height: Math.round(((north - south) / 180) * MAP_HEIGHT),
    left: Math.round(((west + 180) / 360) * MAP_WIDTH),
    top: Math.round(((90 - north) / 180) * MAP_HEIGHT),
    width: Math.round(((east - west) / 360) * MAP_WIDTH),
  };
  await sharp(source)
    .extract(region)
    .resize(width, height, { fit: "fill", kernel: "lanczos3" })
    .jpeg({ mozjpeg: true, quality: 82 })
    .toFile(path.join(outDir, `${name}.jpg`));
}
console.log(`${Object.keys(CROPS).length} crops in ${outDir}`);
