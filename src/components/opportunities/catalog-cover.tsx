"use client";

import Image from "next/image";
import { useState } from "react";
import type { CatalogCover as CatalogCoverData } from "./catalog-model";
import MapImage from "./map-image";

interface CatalogCoverProps {
  className: string;
  compact?: boolean;
  cover: CatalogCoverData;
  eager?: boolean;
  sizes: string;
}

const isRemote = (src: string): boolean => src.startsWith("http");

// Favicon services answer unknown sites with a tiny generic globe; anything
// this small reads as a placeholder, so the monogram takes its place.
const MIN_LOGO_SIZE = 32;

const LogoTile = ({
  compact,
  logo,
  monogram,
}: {
  compact: boolean;
  logo: string | null;
  monogram: string;
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = logo !== null && !logoFailed;

  return (
    <span
      className={`flex items-center justify-center rounded-2xl bg-white shadow-[0_12px_28px_-12px_rgba(0,0,0,0.9)] ${compact ? "h-10 w-10 rounded-xl" : "h-14 w-14"}`}
    >
      {showLogo ? (
        <Image
          alt=""
          className={
            compact ? "h-6 w-6 object-contain" : "h-9 w-9 object-contain"
          }
          height={36}
          onError={() => setLogoFailed(true)}
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth < MIN_LOGO_SIZE) {
              setLogoFailed(true);
            }
          }}
          src={logo}
          unoptimized
          width={36}
        />
      ) : (
        <span
          className={`font-bold text-navy-950 tracking-wide ${compact ? "text-[11px]" : "text-[15px]"}`}
        >
          {monogram}
        </span>
      )}
    </span>
  );
};

/**
 * A real photograph when the record has one; otherwise the regional map
 * (night lights on navy, daylight on paper) with the institution's logo (or
 * monogram) on a tile.
 */
const CatalogCover = ({
  className,
  compact = false,
  cover,
  eager = false,
  sizes,
}: CatalogCoverProps) => (
  <div className={`relative overflow-hidden bg-navy-800 ${className}`}>
    {cover.kind === "photo" ? (
      <Image
        alt=""
        className={
          cover.src.includes("/curated/artwork-")
            ? "bg-white object-contain p-3"
            : "object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        }
        fill
        loading={eager ? "eager" : "lazy"}
        sizes={sizes}
        src={cover.src}
        unoptimized={isRemote(cover.src)}
      />
    ) : (
      <>
        <MapImage
          alt=""
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          day={cover.daySrc}
          // Both twins stay lazy (map-image.tsx); first-row covers still
          // jump the queue once they're on screen.
          fetchPriority={eager ? "high" : "auto"}
          fill
          night={cover.src}
          nightClassName="brightness-[1.35] saturate-[0.85]"
          sizes={sizes}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <LogoTile
            compact={compact}
            logo={cover.logo}
            monogram={cover.monogram}
          />
        </div>
      </>
    )}
  </div>
);

export default CatalogCover;
