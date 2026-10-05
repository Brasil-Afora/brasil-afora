import entries from "./radar-presentation-2026-10-03.json";

/** Display copy only: canonical identities and reviewed requirements stay intact. */
export const radarPresentation = (name: string) =>
  (
    entries as Record<
      string,
      { name: string; summary: string; audience: string; image: string }
    >
  )[name];
