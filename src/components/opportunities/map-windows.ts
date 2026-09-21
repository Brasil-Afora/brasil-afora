// Night-lights map crops of public/map.jpg (equirectangular) and the
// longitude/latitude window each one covers. Overlays project points with
// x = lon - west, y = north - lat inside that window.
//
// NOTE: filenames carry a version suffix on purpose. The image URL is part of
// the Next.js image-optimization cache key, so any future re-crop MUST be
// saved under a new filename; otherwise stale optimized variants (old crop,
// same URL) will silently misalign every pin and route drawn on the map.

export interface MapWindow {
  east: number;
  north: number;
  south: number;
  src: string;
  west: number;
}

/** Home map, international header and international detail pages. */
export const WORLD_MAP: MapWindow = {
  src: "/catalog/header-mundo-v2.jpg",
  west: -130,
  east: 160,
  north: 66,
  south: -48,
};

/** National header and national detail pages. */
export const BRAZIL_MAP: MapWindow = {
  src: "/catalog/header-brasil.jpg",
  west: -82,
  east: -18,
  north: 8,
  south: -36,
};
