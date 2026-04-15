"use client";

import dynamic from "next/dynamic";

const WorldMapPage = dynamic(() => import("./world-map-page"), {
  ssr: false,
});

export default function WorldMapPageClient() {
  return <WorldMapPage />;
}
