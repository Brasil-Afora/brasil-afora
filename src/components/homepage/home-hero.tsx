import { ShieldCheckIcon } from "lucide-react";
import { heroCopy } from "@/lib/copy/pt-br";
import { HERO_PHOTOS, heroPhotoStartIndex } from "./hero-photos";
import HomeCategoryShortcuts from "./home-category-shortcuts";
import { type SearchEntry, VERIFIED_CHECK_DATE } from "./home-data";
import HomeHeroPhotos from "./home-hero-photos";
import HomeSearch from "./home-search";

const HandNote = ({ className }: { className: string }) => (
  <p
    className={`ba-hand-note pointer-events-none absolute w-max -rotate-[7deg] font-hand font-semibold text-white leading-[0.95] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] ${className}`}
  >
    {heroCopy.handNote[0]}
    <br />
    {heroCopy.handNote[1]}
    <br />
    <span className="ml-8">{heroCopy.handNote[2]}</span>
    <svg
      aria-hidden="true"
      className="mt-1 ml-10 h-4 w-32"
      fill="none"
      viewBox="0 0 128 16"
    >
      <path
        className="ba-stroke"
        d="M2 13 C 34 8, 78 4, 126 2"
        pathLength={1}
        stroke="var(--color-signal)"
        strokeLinecap="round"
        strokeWidth={3}
      />
    </svg>
  </p>
);

const HomeHero = ({ verifiedEntries }: { verifiedEntries: SearchEntry[] }) => (
  <section className="ba-hero relative isolate border-navy-700/50 border-b">
    {/* The photo: a banner above the headline on small screens; on desktop
        it owns the right side and dissolves into the navy, or sits as a plate
        on the paper in the light theme (see `.ba-hero-frame` in globals.css).
        Both themes share one pool of photos and grade them differently. */}
    <HomeHeroPhotos start={heroPhotoStartIndex(HERO_PHOTOS.length)}>
      <HandNote className="right-5 bottom-8 text-[1.45rem] sm:right-10 sm:text-[1.7rem] lg:right-[3%] lg:bottom-[16%] lg:text-[1.6rem] xl:right-[7%] xl:text-[2rem]" />
    </HomeHeroPhotos>

    <div className="mx-auto w-full max-w-[84rem] px-5 pt-2 pb-12 sm:px-8 lg:pt-14 lg:pb-12">
      <div className="ba-hero-copy max-w-[44rem]">
        <h1 className="text-balance font-bold text-[clamp(2.3rem,1.1rem+3vw,3.6rem)] text-white leading-[1.04] tracking-[-0.025em]">
          {heroCopy.title}
        </h1>
        <p className="mt-5 max-w-[37rem] text-[17px] text-mist leading-relaxed">
          {heroCopy.lede}
        </p>
        <div className="mt-8 max-w-[42rem]">
          <HomeSearch verifiedEntries={verifiedEntries} />
        </div>
      </div>
      <div className="ba-hero-copy mt-5 max-w-[44rem] xl:max-w-[56rem]">
        <HomeCategoryShortcuts />
      </div>
      <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-slate-200">
        <ShieldCheckIcon aria-hidden="true" className="h-5 w-5 text-signal" />
        <span>{heroCopy.verified}</span>
        <span aria-hidden="true" className="hidden text-mist-dim sm:inline">
          •
        </span>
        <span className="text-mist">
          {heroCopy.verifiedCheckedOn(VERIFIED_CHECK_DATE)}
        </span>
      </p>
    </div>
  </section>
);

export default HomeHero;
