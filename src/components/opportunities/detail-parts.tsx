"use client";

import {
  BadgeCheckIcon,
  BanknoteIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  GraduationCapIcon,
  LandmarkIcon,
  LanguagesIcon,
  type LucideIcon,
  MapPinIcon,
  MonitorSmartphoneIcon,
  ReceiptIcon,
  Share2Icon,
  TagIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useApplicationSteps from "@/hooks/use-application-steps";
import { formatDaysLeft } from "@/lib/date-utils";
import { findCountry, type OpportunityLocation } from "@/lib/geo";
import CatalogCover from "./catalog-cover";
import { URGENT_DAYS } from "./catalog-model";
import type {
  DetailFact,
  DetailStep,
  FactIcon,
  OpportunityDetail,
} from "./detail-model";
import MapImage from "./map-image";
import type { MapWindow } from "./map-windows";

const FACT_ICONS: Record<FactIcon, LucideIcon> = {
  age: UsersIcon,
  calendar: CalendarClockIcon,
  clock: ClockIcon,
  fee: ReceiptIcon,
  funding: WalletIcon,
  language: LanguagesIcon,
  level: GraduationCapIcon,
  modality: MonitorSmartphoneIcon,
  place: MapPinIcon,
  price: BanknoteIcon,
  type: TagIcon,
};

const NOT_STATED = "Não informado";

// ---------------------------------------------------------------------------
// Status

export type DeadlineState = "closed" | "last-day" | "open" | "unknown";

export const deadlineState = (daysLeft: number | null): DeadlineState => {
  if (daysLeft === null) {
    return "unknown";
  }
  if (daysLeft < 0) {
    return "closed";
  }
  return daysLeft === 0 ? "last-day" : "open";
};

const isUrgent = (daysLeft: number | null): boolean =>
  daysLeft !== null && daysLeft >= 0 && daysLeft <= URGENT_DAYS;

export const StatusBadges = ({ detail }: { detail: OpportunityDetail }) => {
  const state = deadlineState(detail.daysLeft);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {detail.verified && (
        <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 font-semibold text-[12px] text-navy-950">
          <BadgeCheckIcon aria-hidden="true" className="h-3.5 w-3.5" />
          Verificada
        </span>
      )}
      {state === "closed" && (
        <span className="rounded-full bg-navy-800 px-2.5 py-1 font-semibold text-[12px] text-mist ring-1 ring-navy-700 ring-inset">
          Inscrições encerradas
        </span>
      )}
      {state !== "closed" && isUrgent(detail.daysLeft) && (
        <span className="inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 font-semibold text-[12px] text-navy-950">
          <CalendarClockIcon aria-hidden="true" className="h-3.5 w-3.5" />
          Prazo próximo
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Hero

/** What the hero shows; opportunities and programs both provide it. */
export type HeroDetail = Pick<
  OpportunityDetail,
  "cover" | "institution" | "name" | "summary"
>;

const InstitutionMark = ({ detail }: { detail: HeroDetail }) => {
  const [failed, setFailed] = useState(false);
  const logo =
    detail.cover.kind === "map" && !failed ? detail.cover.logo : null;
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_8px_20px_-10px_rgba(0,0,0,0.8)]">
      {logo ? (
        <Image
          alt=""
          className="h-7 w-7 object-contain"
          height={28}
          onError={() => setFailed(true)}
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth < 32) {
              setFailed(true);
            }
          }}
          src={logo}
          unoptimized
          width={28}
        />
      ) : (
        <LandmarkIcon aria-hidden="true" className="h-5 w-5 text-navy-900" />
      )}
    </span>
  );
};

interface HeroActionsProps {
  canSave: boolean;
  isSaved: boolean;
  officialLink: string | null;
  onSave: () => void;
  onShare: () => void;
}

export const HeroActions = ({
  canSave,
  isSaved,
  onSave,
  onShare,
  officialLink,
}: HeroActionsProps) => (
  <div className="flex flex-wrap items-center gap-3">
    {officialLink && (
      <a
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-signal px-6 font-semibold text-[15px] text-navy-950 transition-colors hover:bg-signal-strong"
        href={officialLink}
        rel="noopener noreferrer"
        target="_blank"
      >
        Acessar site oficial
        <span className="sr-only">(abre em nova aba)</span>
        <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
      </a>
    )}
    {canSave && (
      <button
        aria-pressed={isSaved}
        className="inline-flex h-12 items-center gap-2 rounded-xl border border-navy-600 px-5 font-semibold text-[15px] text-white transition-colors hover:border-signal/60 hover:bg-navy-800 aria-pressed:border-signal/60"
        onClick={onSave}
        type="button"
      >
        {isSaved ? (
          <BookmarkCheckIcon
            aria-hidden="true"
            className="h-4 w-4 text-signal"
          />
        ) : (
          <BookmarkIcon aria-hidden="true" className="h-4 w-4" />
        )}
        {isSaved ? "Salva" : "Salvar"}
      </button>
    )}
    <button
      className="inline-flex h-12 items-center gap-2 rounded-xl border border-navy-600 px-5 font-semibold text-[15px] text-white transition-colors hover:border-signal/60 hover:bg-navy-800"
      onClick={onShare}
      type="button"
    >
      <Share2Icon aria-hidden="true" className="h-4 w-4" />
      Compartilhar
    </button>
  </div>
);

export const DetailHero = ({
  actions,
  backHref,
  backLabel,
  badges,
  detail,
}: {
  actions: React.ReactNode;
  backHref: string;
  backLabel: string;
  /** Status next to the institution (verified, deadline, enrollment…). */
  badges: React.ReactNode;
  detail: HeroDetail;
}) => (
  <section className="relative isolate border-navy-700/50 border-b">
    <div className="relative h-48 overflow-hidden sm:h-60 lg:absolute lg:inset-y-0 lg:right-0 lg:-z-10 lg:h-auto lg:w-[52%]">
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_38%)]">
        <CatalogCover
          className="h-full w-full"
          cover={detail.cover}
          eager
          sizes="(min-width: 1024px) 52vw, 100vw"
        />
      </div>
      <div className="absolute inset-0 hidden bg-[linear-gradient(to_top,var(--color-navy-950)_0%,transparent_30%)] lg:block" />
    </div>

    <div className="mx-auto w-full max-w-[84rem] px-5 pt-2 pb-10 sm:px-8 lg:flex lg:min-h-[23rem] lg:flex-col lg:justify-center lg:py-12">
      <nav aria-label="Trilha de navegação">
        <ol className="flex min-w-0 items-center gap-2 text-[13px] text-mist">
          <li className="shrink-0">
            <Link className="hover:text-white hover:underline" href="/">
              Início
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0">
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </li>
          <li className="shrink-0">
            <Link className="hover:text-white hover:underline" href={backHref}>
              {backLabel}
            </Link>
          </li>
          <li aria-hidden="true" className="hidden shrink-0 sm:block">
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </li>
          <li
            aria-current="page"
            className="hidden min-w-0 truncate text-slate-200 sm:block"
          >
            {detail.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 max-w-[46rem]">
        <div className="flex flex-wrap items-center gap-3">
          <InstitutionMark detail={detail} />
          {detail.institution && (
            <p className="text-[15px] text-slate-200">{detail.institution}</p>
          )}
          {badges}
        </div>
        <h1 className="mt-4 text-balance font-bold text-[clamp(2rem,1.2rem+2.2vw,3.1rem)] text-white leading-[1.08] tracking-[-0.02em]">
          {detail.name}
        </h1>
        {detail.summary && (
          <p className="mt-4 max-w-[40rem] text-[17px] text-mist leading-relaxed">
            {detail.summary}
          </p>
        )}
        <div className="mt-7">{actions}</div>
      </div>
    </div>
  </section>
);

// ---------------------------------------------------------------------------
// Facts

const FactValue = ({ value }: { value: string | null }) =>
  value ? (
    <dd className="line-clamp-3 text-[15px] text-white" title={value}>
      {value}
    </dd>
  ) : (
    <dd className="text-[15px] text-mist-dim">{NOT_STATED}</dd>
  );

export const FactsGrid = ({ facts }: { facts: DetailFact[] }) => (
  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
    {facts.map((fact) => {
      const Icon = FACT_ICONS[fact.icon];
      return (
        <div className="flex min-w-0 gap-3" key={fact.label}>
          <Icon
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-mist"
            strokeWidth={1.7}
          />
          <div className="min-w-0">
            <dt className="text-[13px] text-mist">{fact.label}</dt>
            <FactValue value={fact.value} />
          </div>
        </div>
      );
    })}
  </dl>
);

// ---------------------------------------------------------------------------
// Section navigation (anchors with scroll-spy)

export interface DetailSectionLink {
  id: string;
  label: string;
}

/** How far below the section bar a heading counts as "being read". */
const READ_MARGIN_PX = 48;
const BOTTOM_TOLERANCE_PX = 4;
/** Site header height before it is measured (desktop). */
const DEFAULT_HEADER_PX = 68;

const siteHeaderHeight = (): number =>
  document.querySelector("header")?.offsetHeight ?? DEFAULT_HEADER_PX;

export const SectionNav = ({ sections }: { sections: DetailSectionLink[] }) => {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_PX);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Stick right under the site header, whose height changes by breakpoint.
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) {
      return;
    }
    const observer = new ResizeObserver(() =>
      setHeaderHeight(header.offsetHeight)
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // The active section is the last one whose heading has passed under the
  // header and this bar; at the very bottom it is the last section, even when
  // that one is too short to reach the line.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const readLine =
        siteHeaderHeight() +
        (navRef.current?.offsetHeight ?? 0) +
        READ_MARGIN_PX;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - BOTTOM_TOLERANCE_PX;
      let current = sections[0]?.id ?? "";
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= readLine) {
          current = section.id;
        }
      }
      setActive(atBottom ? (sections.at(-1)?.id ?? current) : current);
    };
    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  // On narrow screens the bar scrolls sideways; keep the active tab in view.
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (!(list && link)) {
      return;
    }
    const linkBox = link.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    if (linkBox.left < listBox.left || linkBox.right > listBox.right) {
      list.scrollBy({ behavior: "smooth", left: linkBox.left - listBox.left });
    }
  }, [active]);

  return (
    <nav
      aria-label="Seções desta oportunidade"
      className="sticky z-20 -mx-5 border-navy-700/70 border-b bg-navy-950 px-5 sm:-mx-0 sm:px-0"
      ref={navRef}
      style={{ top: headerHeight }}
    >
      <ul
        className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={listRef}
      >
        {sections.map((section) => (
          <li className="shrink-0" key={section.id}>
            <a
              aria-current={active === section.id ? "location" : undefined}
              className="relative block py-3.5 text-[14px] text-slate-200 transition-colors hover:text-white aria-[current=location]:text-signal"
              href={`#${section.id}`}
            >
              {section.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-signal transition-transform duration-300 ${active === section.id ? "scale-x-100" : "scale-x-0"}`}
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export const DetailSection = ({
  children,
  id,
  title,
}: {
  children: React.ReactNode;
  id: string;
  title: string;
}) => (
  <section
    aria-labelledby={`${id}-titulo`}
    className="scroll-mt-32 border-navy-700/70 border-b py-9 last:border-b-0"
    id={id}
  >
    <h2
      className="font-bold text-[1.375rem] text-white leading-tight"
      id={`${id}-titulo`}
    >
      {title}
    </h2>
    <div className="mt-5">{children}</div>
  </section>
);

export const Prose = ({ paragraphs }: { paragraphs: string[] }) => (
  <div className="max-w-[68ch] space-y-4 text-[16px] text-slate-200 leading-relaxed">
    {paragraphs.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
  </div>
);

export const SourceGap = ({ children }: { children: React.ReactNode }) => (
  <p className="max-w-[68ch] rounded-lg border border-navy-700 border-dashed px-4 py-3 text-[14px] text-mist">
    {children}
  </p>
);

export const RuleList = ({ items }: { items: string[] }) => (
  <ul className="max-w-[68ch] space-y-3">
    {items.map((item) => (
      <li
        className="flex gap-3 text-[15px] text-slate-200 leading-relaxed"
        key={item}
      >
        <span
          aria-hidden="true"
          className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-mist"
        />
        {item}
      </li>
    ))}
  </ul>
);

export const DefinitionPairs = ({
  items,
}: {
  items: { label: string; value: string }[];
}) => (
  <dl className="grid gap-x-8 gap-y-6 md:grid-cols-2">
    {items.map((item) => (
      <div key={item.label}>
        <dt className="font-semibold text-[14px] text-white">{item.label}</dt>
        <dd className="mt-1.5 text-[15px] text-slate-200 leading-relaxed">
          {item.value}
        </dd>
      </div>
    ))}
  </dl>
);

// ---------------------------------------------------------------------------
// Application steps: the student ticks off what they have done

const DATE_TOKEN_REGEX = /(\b\d{1,2}\/\d{1,2}\/\d{4}\b)/;

const StepText = ({ text }: { text: string }) => (
  <>
    {text.split(DATE_TOKEN_REGEX).map((part, index) =>
      DATE_TOKEN_REGEX.test(part) ? (
        <span
          className="whitespace-nowrap font-semibold text-white tabular-nums"
          // biome-ignore lint/suspicious/noArrayIndexKey: fragments of one immutable string.
          key={index}
        >
          {part}
        </span>
      ) : (
        part
      )
    )}
  </>
);

const StepsProgress = ({
  done,
  onClear,
  total,
}: {
  done: number;
  onClear: () => void;
  total: number;
}) => (
  <div className="mb-6">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p aria-live="polite" className="text-[14px] text-slate-200">
        {done === 0 ? (
          "Marque as etapas que você já concluiu. Fica salvo neste navegador."
        ) : (
          <>
            <span className="font-semibold text-white tabular-nums">
              {done} de {total}
            </span>{" "}
            concluídas
          </>
        )}
      </p>
      {done > 0 && (
        <p className="flex items-center gap-3 text-[13px] text-mist-dim">
          Salvo neste navegador
          <button
            className="rounded text-mist underline decoration-navy-600 underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2"
            onClick={onClear}
            type="button"
          >
            Desmarcar tudo
          </button>
        </p>
      )}
    </div>
    <div aria-hidden="true" className="mt-3 flex gap-1">
      {Array.from({ length: total }, (_, index) => (
        <span
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${index < done ? "bg-slate-200" : "bg-navy-700"}`}
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length segments.
          key={index}
        />
      ))}
    </div>
  </div>
);

export const StepsChecklist = ({
  progressKey,
  steps,
}: {
  /** Where the student's progress is remembered (scope + opportunity id). */
  progressKey: string;
  steps: DetailStep[];
}) => {
  const { clear, done, toggle } = useApplicationSteps(progressKey);
  const doneCount = steps.filter((step) => done.has(step.key)).length;
  const nextIndex =
    doneCount > 0 ? steps.findIndex((step) => !done.has(step.key)) : -1;

  return (
    <div className="max-w-[68ch]">
      <StepsProgress done={doneCount} onClear={clear} total={steps.length} />
      <ol>
        {steps.map((step, index) => {
          const checked = done.has(step.key);
          const isNext = index === nextIndex;
          const isLast = index === steps.length - 1;
          let marker =
            "border border-navy-600 bg-navy-900 text-slate-200 group-hover:border-mist";
          if (checked) {
            marker = "bg-slate-200 text-navy-950";
          } else if (isNext) {
            marker = "border-2 border-signal bg-navy-900 text-signal";
          }
          return (
            <li className="relative pb-5 last:pb-0" key={step.key}>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute top-9 bottom-1 left-[15px] w-px ${checked ? "bg-slate-200/40" : "bg-navy-700"}`}
                />
              )}
              <label className="group flex cursor-pointer gap-4">
                <input
                  checked={checked}
                  className="peer sr-only"
                  onChange={() => toggle(step.key)}
                  type="checkbox"
                />
                <span
                  aria-hidden="true"
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold text-[13px] tabular-nums transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-signal peer-focus-visible:outline-offset-2 ${marker}`}
                >
                  {checked ? (
                    <CheckIcon className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="pt-1">
                  {isNext && (
                    <span className="mb-1.5 block w-fit rounded-full bg-signal/15 px-2 py-0.5 font-semibold text-[12px] text-signal">
                      Próxima etapa
                    </span>
                  )}
                  <span
                    className={`block text-[15px] leading-relaxed transition-colors ${checked ? "text-mist" : "text-slate-200 group-hover:text-white"}`}
                  >
                    <StepText text={step.text} />
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sidebar cards

export const SideCard = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <section className="rounded-xl border border-navy-700 bg-navy-900/60 p-5">
    <h2 className="font-bold text-[16px] text-white">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

export const DeadlineCard = ({ detail }: { detail: OpportunityDetail }) => {
  const state = deadlineState(detail.daysLeft);
  const urgent = isUrgent(detail.daysLeft);
  let status = "Prazo não informado";
  if (state === "closed") {
    status = "Inscrições encerradas";
  } else if (state !== "unknown" && detail.daysLeft !== null) {
    status = formatDaysLeft(detail.daysLeft);
  }
  return (
    <SideCard title="Prazo de inscrição">
      <p className="font-bold text-[2rem] text-white tabular-nums leading-none">
        {detail.deadline || "—"}
      </p>
      <p
        className={`mt-2 inline-flex items-center gap-1.5 font-semibold text-[14px] ${urgent ? "text-signal" : "text-slate-200"}`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${urgent ? "bg-signal" : "bg-mist"}`}
        />
        {detail.lifecycleLabel ?? status}
      </p>
      {detail.applicationTarget.available && (
        <a
          className="mt-4 flex h-11 items-center justify-center rounded-xl bg-signal font-semibold text-navy-950"
          href={detail.applicationTarget.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {detail.applicationTarget.label}
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      )}
      {detail.officialLink && (
        <a
          className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-signal font-semibold text-[15px] text-navy-950 transition-colors hover:bg-signal-strong"
          href={detail.officialLink}
          rel="noopener noreferrer"
          target="_blank"
        >
          Acessar site oficial
          <span className="sr-only">(abre em nova aba)</span>
          <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
        </a>
      )}
    </SideCard>
  );
};

export const SourceCard = ({ detail }: { detail: OpportunityDetail }) => (
  <SideCard title="Fonte">
    {detail.verified ? (
      <p className="flex gap-2.5 text-[14px] text-slate-200 leading-relaxed">
        <BadgeCheckIcon
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-verified"
        />
        <span>
          Elegibilidade, prazo e link conferidos na fonte oficial em{" "}
          <strong className="font-semibold text-white">
            {detail.checkedAt}
          </strong>
          .
        </span>
      </p>
    ) : (
      <p className="text-[14px] text-mist leading-relaxed">
        Informação do catálogo
        {detail.updatedAt ? (
          <>
            , atualizada em{" "}
            <span className="text-slate-200 tabular-nums">
              {detail.updatedAt}
            </span>
          </>
        ) : null}
        . Confirme prazos e regras no site oficial antes de se inscrever.
      </p>
    )}
    {detail.officialLink && detail.officialDomain && (
      <a
        className="mt-4 inline-flex max-w-full items-center gap-1.5 text-[14px] text-atlantic underline-offset-4 hover:underline"
        href={detail.officialLink}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="truncate">{detail.officialDomain}</span>
        <span className="sr-only">(abre em nova aba)</span>
        <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      </a>
    )}
  </SideCard>
);

const MAP_HALO_RATIO = 14;
const MAP_DOT_RATIO = 40;

const inWindow = (map: MapWindow, point: OpportunityLocation): boolean =>
  point.lon >= map.west &&
  point.lon <= map.east &&
  point.lat <= map.north &&
  point.lat >= map.south;

export const PlaceCard = ({
  detail,
  map,
}: {
  detail: OpportunityDetail;
  map: MapWindow;
}) => {
  const width = map.east - map.west;
  const height = map.north - map.south;
  const pins = detail.locations.filter((point) => inWindow(map, point));
  const approximate = detail.locations.some(
    (point) => point.precision !== "city"
  );
  const iso =
    detail.scope === "national" ? "BR" : findCountry(detail.similarPlace)?.iso;
  return (
    <SideCard title="Onde acontece">
      <p className="flex gap-2 text-[15px] text-slate-200">
        <MapPinIcon
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-mist"
        />
        {detail.place || NOT_STATED}
      </p>
      {pins.length > 0 && (
        <div
          aria-hidden="true"
          className="relative mt-4 overflow-hidden rounded-lg bg-navy-950 ring-1 ring-navy-700"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <MapImage
            alt=""
            className="object-fill"
            day={map.daySrc}
            fill
            night={map.src}
            nightClassName="brightness-[1.7] saturate-[0.85]"
            sizes="21rem"
          />
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${width} ${height}`}
          >
            {pins.map((pin) => (
              <g key={`${pin.lat}:${pin.lon}`}>
                <circle
                  cx={pin.lon - map.west}
                  cy={map.north - pin.lat}
                  fill="var(--color-signal)"
                  fillOpacity={0.25}
                  r={height / MAP_HALO_RATIO}
                />
                <circle
                  cx={pin.lon - map.west}
                  cy={map.north - pin.lat}
                  fill="var(--color-signal)"
                  r={height / MAP_DOT_RATIO}
                />
              </g>
            ))}
          </svg>
        </div>
      )}
      {pins.length > 0 && approximate && (
        <p className="mt-2 text-[12px] text-mist-dim">
          Localização aproximada (capital do estado ou do país).
        </p>
      )}
      {iso && (
        <Link
          className="mt-3 inline-flex items-center gap-1 font-medium text-[14px] text-signal hover:text-signal-strong"
          href={`/mapa?pais=${iso.toLowerCase()}`}
        >
          Ver no mapa
          <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
    </SideCard>
  );
};
