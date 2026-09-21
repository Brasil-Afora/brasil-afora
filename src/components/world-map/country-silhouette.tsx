import type { MapCountry } from "./map-data";

const DEGREES_TO_RADIANS = Math.PI / 180;
const COORDINATE_DIGITS = 2;

/**
 * The country's mainland as a small shape, drawn from the same outline the
 * map lights up. Longitudes shrink by the cosine of the middle latitude so
 * northern countries aren't stretched sideways.
 */
const pathOf = (country: MapCountry) => {
  const outline = country.polygons[0]?.[0];
  if (!outline || outline.length === 0) {
    return null;
  }
  const lons = outline.map(([lon]) => lon);
  const lats = outline.map(([, lat]) => lat);
  const west = Math.min(...lons);
  const north = Math.max(...lats);
  const south = Math.min(...lats);
  const squeeze = Math.cos(((north + south) / 2) * DEGREES_TO_RADIANS);
  const points = outline.map(
    ([lon, lat]) =>
      `${((lon - west) * squeeze).toFixed(COORDINATE_DIGITS)} ${(north - lat).toFixed(COORDINATE_DIGITS)}`
  );
  return {
    d: `M${points.join("L")}Z`,
    height: north - south,
    width: (Math.max(...lons) - west) * squeeze,
  };
};

const CountrySilhouette = ({
  className,
  country,
}: {
  className?: string;
  country: MapCountry;
}) => {
  const shape = pathOf(country);
  if (!shape) {
    return (
      <span
        aria-hidden="true"
        className={`flex items-center justify-center ${className ?? ""}`}
      >
        <span className="h-2.5 w-2.5 rounded-full border-2 border-current" />
      </span>
    );
  }
  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      viewBox={`0 0 ${shape.width.toFixed(COORDINATE_DIGITS)} ${shape.height.toFixed(COORDINATE_DIGITS)}`}
    >
      <path
        d={shape.d}
        fill="currentColor"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default CountrySilhouette;
