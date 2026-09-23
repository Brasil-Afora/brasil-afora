// Builds public/map-day.jpg, the daylight twin of public/map.jpg, from NASA's
// Blue Marble: Next Generation July composite with shaded topography:
//
//   node scripts/build-map-day.mjs path/to/world.topo.200407.3x21600x10800.jpg
//
// Source (not committed, 21.8 MB):
//   https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography/july/world.topo.200407.3x21600x10800.jpg
//   sha256 40a42c4511ccfbcdc6928d026a50da190e718772c7e6141ebd4ee9dbe946eda8
//   Credit: NASA Earth Observatory.
//
// Same size and equirectangular extent as the night map (8192×4096, lon −180
// to 180, lat 90 to −90), so every longitude/latitude window — tiles,
// headers, covers, pins — lands on the same pixels in both.
//
// The grade is for the paper theme:
// - Water. Blue Marble's ocean is near-black (water absorbs light), which on
//   paper reads as a dark slab. Measured on the source: every water pixel
//   (open sea, coasts, the Caspian, Baltic, Titicaca, Great Lakes) has
//   luminance <= 6, and the darkest land (Congo forest) is 27, so darkness
//   finds water where hue can't (dark lakes aren't blue). Two more cues catch
//   brighter water: Arctic melt-season water is a cold teal (red near zero,
//   blue level with green), and turbid shelf water (southern North Sea,
//   Malacca) has red at zero. Red/green is >= 0.59 on every land sample.
//   Water is repainted `SEA`, blended by that weight so coasts stay soft.
//   Sediment plumes and shallow turquoise are bright and keep their colour.
// - Land. Shadows lifted, and green pulled toward olive: on this site green
//   means "Verificada".
import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/build-map-day.mjs <world.topo.200407.3x21600x10800.jpg>");
  process.exit(1);
}
const OUTPUT = "public/map-day.jpg";
const WIDTH = 8192;
const HEIGHT = 4096;
const SEA = [180, 200, 213];
const GAMMA = 0.72;
const GREEN_KEEP = 0.55;
const WARM = 6;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (v) => Math.min(255, Math.max(0, v));

const { data, info } = await sharp(source, { limitInputPixels: false })
  .resize(WIDTH, HEIGHT, { kernel: "lanczos3" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const out = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 3) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  const gg = Math.max(g, 1);
  const teal = smooth(0.7, 0.9, b / gg) * (1 - smooth(0.35, 0.55, r / gg));
  const redless = 1 - smooth(0.2, 0.45, r / gg);
  const water = Math.max(
    1 - smooth(8, 20, luma),
    Math.max(teal, redless) * (1 - smooth(30, 48, luma))
  );

  let R = 255 * (r / 255) ** GAMMA;
  let G = 255 * (g / 255) ** GAMMA;
  let B = 255 * (b / 255) ** GAMMA;
  const greenness = smooth(0, 18, G - Math.max(R, B));
  const lumaLifted = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const keep = 1 - (1 - GREEN_KEEP) * greenness;
  R = lumaLifted + (R - lumaLifted) * keep + WARM * greenness * 0.9;
  G = lumaLifted + (G - lumaLifted) * keep;
  B = lumaLifted + (B - lumaLifted) * keep - WARM * 0.5;

  out[i] = Math.round(water * SEA[0] + (1 - water) * clamp(R));
  out[i + 1] = Math.round(water * SEA[1] + (1 - water) * clamp(G));
  out[i + 2] = Math.round(water * SEA[2] + (1 - water) * clamp(B));
}

await sharp(out, { raw: { channels: 3, height: info.height, width: info.width } })
  .jpeg({ mozjpeg: true, quality: 88 })
  .toFile(OUTPUT);
console.log(`${OUTPUT} (${WIDTH}×${HEIGHT})`);
