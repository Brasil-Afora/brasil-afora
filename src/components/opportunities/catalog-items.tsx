import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BanknoteIcon,
  CalendarClockIcon,
  LandmarkIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { formatDaysLeft } from "@/lib/date-utils";
import CatalogCover from "./catalog-cover";
import { type CatalogItem, URGENT_DAYS } from "./catalog-model";

const isUrgent = (item: CatalogItem): boolean =>
  item.daysLeft !== null && item.daysLeft <= URGENT_DAYS;

const StatusBadge = ({ item }: { item: CatalogItem }) => {
  if (item.verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 font-semibold text-[12px] text-navy-950 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.7)]">
        <BadgeCheckIcon aria-hidden="true" className="h-3.5 w-3.5" />
        Verificada
      </span>
    );
  }
  if (isUrgent(item)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 font-semibold text-[12px] text-navy-950 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.7)]">
        <CalendarClockIcon aria-hidden="true" className="h-3.5 w-3.5" />
        Prazo próximo
      </span>
    );
  }
  return null;
};

const Deadline = ({
  item,
  stacked = false,
}: {
  item: CatalogItem;
  stacked?: boolean;
}) => (
  <span className="tabular-nums">
    {item.lifecycleLabel ?? `Prazo ${item.deadline}`}
    {item.daysLeft !== null && (
      <span
        className={`font-semibold ${stacked ? "block" : "ml-2"} ${isUrgent(item) ? "text-signal" : "text-slate-100"}`}
      >
        {formatDaysLeft(item.daysLeft)}
      </span>
    )}
  </span>
);

const Countdown = ({ item }: { item: CatalogItem }) =>
  item.daysLeft === null ? (
    <span className="font-semibold text-[14px] text-mist">
      {item.lifecycleLabel}
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold text-[14px] tabular-nums ${isUrgent(item) ? "text-signal" : "text-slate-100"}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${isUrgent(item) ? "bg-signal" : "bg-mist"}`}
      />
      {formatDaysLeft(item.daysLeft)}
    </span>
  );

const priceClass = (item: CatalogItem): string =>
  item.price.known ? "font-semibold text-white" : "text-mist";

const TitleLink = ({ item }: { item: CatalogItem }) => (
  <Link
    className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:decoration-signal focus-visible:underline-offset-4"
    href={item.href}
  >
    {item.name}
  </Link>
);

const Tags = ({ item }: { item: CatalogItem }) =>
  item.tags.length > 0 ? (
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
  ) : null;

const cardShell =
  "group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-navy-700 bg-navy-900/70 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-navy-600 hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.9)] focus-within:border-signal/60";

export const CatalogCard = ({
  eager = false,
  item,
}: {
  eager?: boolean;
  item: CatalogItem;
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
        <StatusBadge item={item} />
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
        <div className="flex min-w-0 items-center gap-2">
          <dt className="sr-only">Preço</dt>
          <BanknoteIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-mist"
          />
          <dd className={`truncate tabular-nums ${priceClass(item)}`}>
            {item.price.label}
          </dd>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <dt className="sr-only">Local</dt>
          <MapPinIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-mist"
          />
          <dd className="truncate">{item.place}</dd>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <dt className="sr-only">Prazo de inscrição</dt>
          <CalendarClockIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-mist"
          />
          <dd className="tabular-nums">Prazo {item.deadline}</dd>
        </div>
        {item.audience && (
          <div className="flex min-w-0 items-start gap-2">
            <dt className="sr-only">Público</dt>
            <UsersIcon
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-mist"
            />
            <dd className="line-clamp-2">Para: {item.audience}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <Countdown item={item} />
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy-600 text-slate-100 transition-colors duration-300 group-hover:border-signal group-hover:bg-signal group-hover:text-navy-950"
        >
          <ArrowRightIcon className="h-4 w-4" />
        </span>
      </div>
    </div>
  </article>
);

export const CatalogRow = ({ item }: { item: CatalogItem }) => (
  <article className="group relative flex items-center gap-4 rounded-xl border border-navy-700 bg-navy-900/70 p-3 transition-colors duration-300 focus-within:border-signal/60 hover:border-navy-600 sm:pr-5">
    <CatalogCover
      className="h-20 w-28 shrink-0 rounded-lg sm:w-36"
      compact
      cover={item.cover}
      sizes="9rem"
    />
    <div className="min-w-0 flex-1">
      <p className="flex min-w-0 items-center gap-2 text-[12px] text-mist">
        {item.verified && (
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-verified">
            <BadgeCheckIcon aria-hidden="true" className="h-3.5 w-3.5" />
            Verificada
          </span>
        )}
        <span className="truncate">{item.institution}</span>
      </p>
      <h3 className="mt-0.5 line-clamp-2 font-semibold text-[15px] text-white leading-snug sm:text-[16px]">
        <TitleLink item={item} />
      </h3>
      <p className="mt-1 truncate text-[13px] text-slate-300">
        {[item.place, item.level].filter(Boolean).join(" · ")}
      </p>
      <p
        className={`mt-1 flex items-center gap-1.5 truncate text-[13px] tabular-nums ${priceClass(item)}`}
      >
        <BanknoteIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <span className="sr-only">Preço:</span>
        {item.price.label}
      </p>
      <p className="mt-1 text-[13px] text-slate-200 md:hidden">
        <Deadline item={item} />
      </p>
    </div>
    <div className="hidden w-44 shrink-0 text-[14px] text-slate-200 md:block">
      <p className="flex items-start gap-2">
        <CalendarClockIcon
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-mist"
        />
        <Deadline item={item} stacked />
      </p>
    </div>
    <span
      aria-hidden="true"
      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy-600 text-slate-100 transition-colors duration-300 group-hover:border-signal group-hover:bg-signal group-hover:text-navy-950 sm:flex"
    >
      <ArrowRightIcon className="h-4 w-4" />
    </span>
  </article>
);

export const CatalogCardSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex h-full flex-col overflow-hidden rounded-xl border border-navy-700 bg-navy-900/70"
  >
    <div className="h-40 animate-pulse bg-navy-800" />
    <div className="space-y-3 px-5 pt-4 pb-5">
      <div className="h-3 w-1/2 animate-pulse rounded bg-navy-800" />
      <div className="h-5 w-5/6 animate-pulse rounded bg-navy-800" />
      <div className="flex gap-2">
        <div className="h-6 w-24 animate-pulse rounded-full bg-navy-800" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-navy-800" />
      </div>
      <div className="h-3 w-2/3 animate-pulse rounded bg-navy-800" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-navy-800" />
    </div>
  </div>
);
