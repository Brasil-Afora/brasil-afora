import { ShieldCheckIcon } from "lucide-react";
import Image from "next/image";
import HomeCategoryShortcuts from "./home-category-shortcuts";
import { type SearchEntry, VERIFIED_CHECK_DATE } from "./home-data";
import HomeSearch from "./home-search";

const HERO_IMAGE = "/home/edinburgh-evening-skyline.jpg";

const HandNote = ({ className }: { className: string }) => (
  <p
    className={`ba-hand-note pointer-events-none absolute w-max -rotate-[7deg] font-hand font-semibold text-white leading-[0.95] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] ${className}`}
  >
    Mais conhecimento
    <br />
    para um futuro
    <br />
    <span className="ml-8">maior.</span>
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
  <section className="relative isolate border-navy-700/50 border-b">
    {/* One photo: a banner above the headline on small screens; on desktop
        the dusk skyline owns the right side and dissolves into the navy. */}
    <div className="relative h-44 overflow-hidden sm:h-60 lg:absolute lg:inset-y-0 lg:right-0 lg:-z-10 lg:h-auto lg:w-[58%]">
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_45%,transparent_100%)] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_42%)]">
        <Image
          alt=""
          className="object-cover object-[55%_45%] brightness-[0.8] -hue-rotate-[14deg] saturate-[1.15] lg:object-[50%_42%]"
          fill
          preload
          sizes="(min-width: 1024px) 58vw, 100vw"
          src={HERO_IMAGE}
        />
        <div className="absolute inset-0 hidden bg-[linear-gradient(to_top,var(--color-navy-950)_0%,transparent_28%),linear-gradient(to_bottom,rgba(3,17,31,0.45)_0%,transparent_22%)] lg:block" />
      </div>
      <HandNote className="right-5 bottom-8 text-[1.45rem] sm:right-10 sm:text-[1.7rem] lg:right-[7%] lg:bottom-[16%] lg:text-[2rem]" />
    </div>

    <div className="mx-auto w-full max-w-[84rem] px-5 pt-2 pb-12 sm:px-8 lg:pt-14 lg:pb-12">
      <div className="max-w-[44rem]">
        <h1 className="text-balance font-bold text-[clamp(2.3rem,1.1rem+3vw,3.6rem)] text-white leading-[1.04] tracking-[-0.025em]">
          Sua jornada acadêmica não tem fronteiras
        </h1>
        <p className="mt-5 max-w-[37rem] text-[17px] text-mist leading-relaxed">
          Bolsas de estudo, summer programs, intercâmbios, olimpíadas e feiras
          para estudantes brasileiros de todos os níveis, no Brasil e no mundo.
        </p>
        <div className="mt-8 max-w-[42rem]">
          <HomeSearch verifiedEntries={verifiedEntries} />
        </div>
      </div>
      <div className="mt-5 max-w-[56rem]">
        <HomeCategoryShortcuts />
      </div>
      <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-slate-200">
        <ShieldCheckIcon aria-hidden="true" className="h-5 w-5 text-signal" />
        <span>Seleção verificada em fontes oficiais</span>
        <span aria-hidden="true" className="hidden text-mist-dim sm:inline">
          •
        </span>
        <span className="text-mist">Conferida em {VERIFIED_CHECK_DATE}</span>
      </p>
    </div>
  </section>
);

export default HomeHero;
