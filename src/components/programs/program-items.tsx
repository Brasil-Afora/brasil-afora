import {
  ArrowRightIcon,
  CalendarClockIcon,
  CompassIcon,
  LandmarkIcon,
  MonitorSmartphoneIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import CatalogCover from "@/components/opportunities/catalog-cover";
import { formatDaysLeft } from "@/lib/date-utils";
import type { ProgramItem, ProgramStatus } from "./program-model";

// Siblings of the opportunity card and row (catalog-items.tsx): same shell,
// cover, tags and footer. What differs is time: an opportunity counts down to
// one deadline, a program shows where its enrollment round stands.

const statusTone = (status: ProgramStatus): string => {
  if (status.urgent) {
    return "text-signal";
  }
  return status.kind === "aberto" ? "text-slate-100" : "text-mist";
};

/** Amber means "you can act now"; a ring marks what hasn't opened yet. */
const StatusDot = ({ status }: { status: ProgramStatus }) => {
  let dot = "bg-navy-600";
  if (status.kind === "aberto" || status.kind === "continuo") {
    dot = "bg-signal";
  } else if (status.kind === "em-breve") {
    dot = "border border-mist";
  }
  return (
    <span
      aria-hidden="true"
      className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
    />
  );
};

export const ProgramStatusLine = ({
  compact = false,
  status,
  stacked = false,
}: {
  /** Short label and a two-line detail, for card and row footers. */
  compact?: boolean;
  status: ProgramStatus;
  stacked?: boolean;
}) => {
  const countdown =
    status.daysLeft === null ? null : formatDaysLeft(status.daysLeft);
  return (
    <span className="flex min-w-0 gap-2 text-[14px] leading-snug">
      <StatusDot status={status} />
      <span className="min-w-0">
        <span className={`font-semibold ${statusTone(status)}`}>
          {compact ? status.shortLabel : status.label}
          {countdown && !stacked && (
            <span className="tabular-nums"> · {countdown}</span>
          )}
        </span>
        {countdown && stacked && (
          <span
            className={`block font-semibold tabular-nums ${statusTone(status)}`}
          >
            {countdown}
          </span>
        )}
        {status.detail && (
          <span
            className={`block text-[13px] text-mist tabular-nums ${compact ? "line-clamp-2" : ""}`}
            title={compact ? status.detail : undefined}
          >
            {status.detail}
          </span>
        )}
      </span>
    </span>
  );
};

const ProgramBadge = ({ item }: { item: ProgramItem }) =>
  item.status.urgent ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 font-semibold text-[12px] text-navy-950 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.7)]">
      <CalendarClockIcon aria-hidden="true" className="h-3.5 w-3.5" />
      Prazo próximo
    </span>
  ) : null;

const TitleLink = ({ item }: { item: ProgramItem }) => (
  <Link
    className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:decoration-signal focus-visible:underline-offset-4"
    href={item.href}
  >
    {item.name}
  </Link>
);

const Tags = ({ item }: { item: ProgramItem }) => (
  <ul className="flex flex-wrap gap-2">
    {item.tags.map((tag) => (
      <li
        className={`max-w-full truncate rounded-full px-2.5 py-1 font-medium text-[12px] ${tag.tone === "fund" ? "bg-fund text-white" : "bg-navy-800 text-slate-200 ring-1 ring-navy-700 ring-inset"}`}
        key={tag.label}
      >
        {tag.label}
      </li>
    ))}
  </ul>
);

const ArrowDisc = ({ className = "flex" }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={`${className} h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy-600 text-slate-100 transition-colors duration-300 group-hover:border-signal group-hover:bg-signal group-hover:text-navy-950`}
  >
    <ArrowRightIcon className="h-4 w-4" />
  </span>
);

const cardShell =
  "group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-navy-700 bg-navy-900/70 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-navy-600 hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.9)] focus-within:border-signal/60";

export const ProgramCard = ({
  eager = false,
  item,
}: {
  eager?: boolean;
  item: ProgramItem;
}) => (
  <article className={cardShell}>
    <div className="relative">
      <CatalogCover
        className="h-40"
        cover={item.cover}
        eager={eager}
        sizes="(min-width: 1024px) 22rem, (min-width: 640px) 50vw, 100vw"
      />
      <div className="absolute top-3 right-3">
        <ProgramBadge item={item} />
      </div>
    </div>

    <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
      <p className="flex items-center gap-2 text-[13px] text-mist">
        <LandmarkIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.institution}</span>
      </p>
      <h3 className="mt-2 line-clamp-3 text-balance font-semibold text-[17px] text-white leading-snug">
        <TitleLink item={item} />
      </h3>
      <div className="mt-3">
        <Tags item={item} />
      </div>

      <dl className="mt-4 grid gap-1.5 text-[14px] text-slate-200">
        <div className="flex min-w-0 items-start gap-2">
          <dt className="sr-only">Para quem</dt>
          <UsersIcon
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-mist"
          />
          <dd className="line-clamp-2">{item.audience}</dd>
        </div>
        {item.format && (
          <div className="flex min-w-0 items-center gap-2">
            <dt className="sr-only">Formato</dt>
            <MonitorSmartphoneIcon
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-mist"
            />
            <dd className="truncate">{item.format}</dd>
          </div>
        )}
        <div className="flex min-w-0 items-center gap-2">
          <dt className="sr-only">Destino</dt>
          <CompassIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-mist"
          />
          <dd className="truncate">{item.destination}</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <p className="min-w-0">
          <span className="sr-only">Inscrições: </span>
          <ProgramStatusLine compact status={item.status} />
        </p>
        <ArrowDisc />
      </div>
    </div>
  </article>
);

export const ProgramRow = ({ item }: { item: ProgramItem }) => (
  <article className="group relative flex items-center gap-4 rounded-xl border border-navy-700 bg-navy-900/70 p-3 transition-colors duration-300 focus-within:border-signal/60 hover:border-navy-600 sm:pr-5">
    <CatalogCover
      className="h-20 w-28 shrink-0 rounded-lg sm:w-36"
      compact
      cover={item.cover}
      sizes="9rem"
    />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[12px] text-mist">{item.institution}</p>
      <h3 className="mt-0.5 line-clamp-2 font-semibold text-[15px] text-white leading-snug sm:text-[16px]">
        <TitleLink item={item} />
      </h3>
      <p className="mt-1 truncate text-[13px] text-slate-300">
        {[item.type, item.levels, item.format].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-1.5 md:hidden">
        <ProgramStatusLine compact status={item.status} />
      </div>
    </div>
    <div className="hidden w-52 shrink-0 md:block">
      <ProgramStatusLine compact stacked status={item.status} />
    </div>
    <ArrowDisc className="hidden sm:flex" />
  </article>
);
