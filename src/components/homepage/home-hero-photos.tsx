"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { heroCopy } from "@/lib/copy/pt-br";
import { HERO_PHOTO_HOLD_MS, HERO_PHOTOS, type HeroPhoto } from "./hero-photos";

const PHOTO_SIZES = "(min-width: 1024px) 58vw, 100vw";

/** Both themes share the photo; each reads its own grade from these. */
type ToneStyle = CSSProperties & {
  "--ba-tone-dark"?: string;
  "--ba-tone-light"?: string;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const readReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};
const readVisible = () => document.visibilityState === "visible";

const readServerFalse = () => false;
const readServerTrue = () => true;

/**
 * Advances through the photos: each one holds, then the next fades in over it,
 * but only once it has loaded, so a slow network never fades to a blank frame.
 * Only the current, previous and next photos are mounted.
 */
const useRotation = (count: number, start: number, running: boolean) => {
  const [current, setCurrent] = useState(start);
  const [previous, setPrevious] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set());
  const [due, setDue] = useState(false);
  const next = (current + 1) % count;

  // The hold restarts whenever `due` drops back to false, i.e. right after
  // each advance, and on resume after a pause.
  useEffect(() => {
    if (!running || due) {
      return;
    }
    const timer = window.setTimeout(() => setDue(true), HERO_PHOTO_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [due, running]);

  useEffect(() => {
    if (due && running && loaded.has(next)) {
      setPrevious(current);
      setCurrent(next);
      setDue(false);
    }
  }, [current, due, loaded, next, running]);

  const markLoaded = useCallback((index: number) => {
    setLoaded((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  }, []);

  return { current, markLoaded, next, previous, ready: loaded.has(current) };
};

const PhotoCredit = ({ photo }: { photo: HeroPhoto }) => (
  <>
    <span className="text-slate-200">{photo.place}</span>
    <span aria-hidden="true"> · </span>
    {heroCopy.photoBy}{" "}
    <a
      className="whitespace-nowrap underline decoration-navy-600 underline-offset-2 transition-colors hover:text-slate-100"
      href={photo.sourceUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      {photo.author}
    </a>
    ,{" "}
    {photo.licenseUrl ? (
      <a
        className="whitespace-nowrap underline decoration-navy-600 underline-offset-2 transition-colors hover:text-slate-100"
        href={photo.licenseUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        {photo.license}
      </a>
    ) : (
      <span className="whitespace-nowrap">{photo.license}</span>
    )}
  </>
);

interface HomeHeroPhotosProps {
  /** The handwritten note; it sits on whichever photo is showing. */
  children: ReactNode;
  start: number;
}

/**
 * The hero's photograph: one pool of university photos crossfading every few
 * seconds, the same set in both themes (the grade differs, see globals.css).
 * Holds still under reduced motion (the pause button can still start it) and
 * while the tab is hidden. The credit for the photo on screen sits under it.
 */
const HomeHeroPhotos = ({ children, start }: HomeHeroPhotosProps) => {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    readServerFalse
  );
  const visible = useSyncExternalStore(
    subscribeVisibility,
    readVisible,
    readServerTrue
  );
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const paused = userPaused ?? reducedMotion;
  const running = !paused && visible;

  const { current, markLoaded, next, previous, ready } = useRotation(
    HERO_PHOTOS.length,
    start,
    running
  );
  const mounted = new Set([current]);
  if (previous !== null) {
    mounted.add(previous);
  }
  if (running) {
    mounted.add(next);
  }
  const shown = HERO_PHOTOS[current];

  return (
    <>
      <div
        className="ba-hero-frame relative h-44 overflow-hidden sm:h-60 lg:absolute lg:inset-y-0 lg:right-0 lg:-z-10 lg:h-auto lg:w-[58%]"
        // The note and its shade wait for a photo to sit on (globals.css).
        data-ready={ready || undefined}
      >
        <div className="ba-hero-mask absolute inset-0 isolate [mask-image:linear-gradient(to_bottom,black_45%,transparent_100%)] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_42%)]">
          {HERO_PHOTOS.map((photo, index) => {
            if (!mounted.has(index)) {
              return null;
            }
            let state: "current" | "previous" | undefined;
            if (index === current) {
              state = "current";
            } else if (index === previous) {
              state = "previous";
            }
            const style: ToneStyle = { objectPosition: photo.position };
            if (photo.toneDark) {
              style["--ba-tone-dark"] = photo.toneDark;
            }
            if (photo.toneLight) {
              style["--ba-tone-light"] = photo.toneLight;
            }
            return (
              <Image
                alt=""
                className="ba-hero-slide object-cover"
                data-state={state}
                fill
                key={photo.src}
                onLoad={() => markLoaded(index)}
                preload={index === start}
                sizes={PHOTO_SIZES}
                src={photo.src}
                style={style}
              />
            );
          })}
          <div className="ba-hero-dissolve absolute inset-0 z-[2] hidden bg-[linear-gradient(to_top,var(--color-navy-950)_0%,transparent_28%),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-navy-950)_45%,transparent)_0%,transparent_22%)] lg:block" />
          <div aria-hidden="true" className="ba-hero-scrim" />
        </div>
        {children}
      </div>

      <div className="ba-hero-caption flex items-center justify-end gap-2.5 px-5 pt-2 text-[12px] text-mist leading-snug sm:px-8 lg:absolute lg:right-[max(2rem,calc(50%-40rem))] lg:bottom-2.5 lg:max-w-[40%] lg:px-0 lg:pt-0">
        <p className="min-w-0 text-right">
          <PhotoCredit photo={shown} />
        </p>
        <button
          aria-label={paused ? heroCopy.photosPlay : heroCopy.photosPause}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-navy-700 text-mist transition-colors hover:border-signal/70 hover:text-slate-100 focus-visible:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/40"
          onClick={() => setUserPaused(!paused)}
          type="button"
        >
          {paused ? (
            <PlayIcon aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <PauseIcon aria-hidden="true" className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </>
  );
};

export default HomeHeroPhotos;
