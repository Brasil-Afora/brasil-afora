// Cuts public/map.jpg (8192×4096, equirectangular night lights) into the tile
// pyramid the /mapa page zooms through:
//
//   node scripts/build-map-tiles.mjs
//
// Tiles follow Leaflet's EPSG:4326 grid: at zoom z the world is
// 512·2^z × 256·2^z pixels in 256px tiles, x from lon −180, y from lat 90.
// Zoom 4 is the source's own resolution.
//
// The output folder is versioned (v1): tiles are cached by URL, so a re-cut
// must go to a new folder and the page must point at it.
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "public/map.jpg";
const OUTPUT = "public/map-tiles/v1";
const TILE = 256;
const MAX_ZOOM = 4;
const QUALITY = 72;

rmSync(OUTPUT, { force: true, recursive: true });

let count = 0;
for (let zoom = 0; zoom <= MAX_ZOOM; zoom++) {
  const columns = 2 ** (zoom + 1);
  const rows = 2 ** zoom;
  const level = await sharp(SOURCE)
    .resize(columns * TILE, rows * TILE, { kernel: "lanczos3" })
    .toBuffer();
  for (let x = 0; x < columns; x++) {
    mkdirSync(path.join(OUTPUT, String(zoom), String(x)), { recursive: true });
    for (let y = 0; y < rows; y++) {
      await sharp(level)
        .extract({ height: TILE, left: x * TILE, top: y * TILE, width: TILE })
        .webp({ quality: QUALITY })
        .toFile(path.join(OUTPUT, String(zoom), String(x), `${y}.webp`));
      count++;
    }
  }
}
console.log(`${count} tiles in ${OUTPUT}`);
