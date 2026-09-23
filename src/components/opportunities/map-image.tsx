import Image, { type ImageProps } from "next/image";

type MapImageProps = Omit<
  ImageProps,
  "className" | "loading" | "preload" | "priority" | "src"
> & {
  className?: string;
  /** The daylight twin: the same window of public/map-day.jpg. */
  day: string;
  /** The night-lights image. */
  night: string;
  /** A grade for the night image only; the day set is graded at build. */
  nightClassName?: string;
};

/**
 * A map image in both themes: the night lights on the navy ground, and on
 * paper its daylight twin, cut at the same longitude/latitude window from
 * NASA's Blue Marble (scripts/build-map-crops.mjs), so pins drawn over
 * either land in the same place.
 *
 * Both are rendered and CSS shows the one for the theme (globals.css,
 * `.ba-when-dark` / `.ba-when-light`), so nothing swaps after hydration.
 * Both stay lazy: a lazy image that isn't displayed is never fetched, so each
 * theme downloads only its own. Never preload them, or both load.
 */
const MapImage = ({
  className = "",
  day,
  night,
  nightClassName = "",
  ...props
}: MapImageProps) => (
  <>
    <Image
      {...props}
      className={`ba-when-dark ${className} ${nightClassName}`}
      loading="lazy"
      src={night}
    />
    <Image
      {...props}
      className={`ba-when-light ${className}`}
      loading="lazy"
      src={day}
    />
  </>
);

export default MapImage;
