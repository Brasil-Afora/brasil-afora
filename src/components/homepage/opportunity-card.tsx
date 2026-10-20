import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BadgeCheckIcon,
  CalendarClockIcon,
  GraduationCapIcon,
  LandmarkIcon,
  MapPinIcon,
  SparklesIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { curatedImagePosition } from "@/data/curated-image-focus";
import { formatDaysLeft } from "@/lib/date-utils";

export const URGENT_DAYS = 21;

/** What a home card needs; featured, new and closing items all fit it. */
export interface HomeCardOpportunity {
  /** Null when the round has no fixed deadline (rolling or announced). */
  daysLeft: number | null;
  deadline: string;
  /** Shown instead of the deadline when there is none, e.g. "Inscrições em breve". */
  deadlineNote?: string;
  /** Small pill over the image, e.g. "Nova". */
  flag?: string;
  href: string;
  id: string;
  image: string;
  institution: string;
  level: string;
  name: string;
  officialLink: string;
  place: string;
  selectionReason?: string;
  tags: string[];
  /** The "Verificada" badge belongs to the verified set only (see AGENTS.md). */
  verified?: boolean;
}

/** Logos and artwork are framed whole on white; photos fill the cover. */
const isFramedImage = (src: string): boolean =>
  src.includes("/curated/artwork-") || src.includes("/curated/institution-");

export const OpportunityCard = ({
  opportunity,
}: {
  opportunity: HomeCardOpportunity;
}) => {
  const { daysLeft } = opportunity;
  const isUrgent = daysLeft !== null && daysLeft <= URGENT_DAYS;
  const showVerified = opportunity.verified !== false;

  return (
    <article className="group relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-navy-700 bg-navy-900/70 transition-[border-color,transform,box-shadow] duration-300 focus-within:border-signal/60 hover:-translate-y-1 hover:border-navy-600 hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.9)]">
      <div className="relative h-40 overflow-hidden bg-navy-800">
        {opportunity.image && (
          <Image
            alt=""
            className={
              isFramedImage(opportunity.image)
                ? "bg-white object-contain p-3"
                : "object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            }
            fill
            sizes="(min-width: 1280px) 20rem, (min-width: 640px) 50vw, 100vw"
            src={opportunity.image}
            style={{ objectPosition: curatedImagePosition(opportunity.image) }}
          />
        )}
        {opportunity.flag && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 font-semibold text-[12px] text-navy-950 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.7)]">
            <SparklesIcon aria-hidden="true" className="h-3.5 w-3.5" />
            {opportunity.flag}
          </span>
        )}
        {showVerified && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 font-semibold text-[12px] text-navy-950 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.7)]">
            <BadgeCheckIcon aria-hidden="true" className="h-3.5 w-3.5" />
            Verificada
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <p className="flex items-center gap-2 text-[13px] text-mist">
          <LandmarkIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate">{opportunity.institution}</span>
        </p>
        <h3 className="mt-2 text-balance font-semibold text-[17px] text-white leading-snug">
          <Link
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:decoration-signal focus-visible:underline-offset-4"
            href={opportunity.href}
          >
            {opportunity.name}
          </Link>
        </h3>

        {opportunity.selectionReason && (
          <p className="mt-3 text-[14px] text-mist leading-relaxed">
            {opportunity.selectionReason}
          </p>
        )}

        <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[14px] text-slate-200">
          {opportunity.place && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Local</dt>
              <MapPinIcon aria-hidden="true" className="h-4 w-4 text-mist" />
              <dd>{opportunity.place}</dd>
            </div>
          )}
          {opportunity.level && (
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="sr-only">Nível</dt>
              <GraduationCapIcon
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-mist"
              />
              <dd className="truncate">{opportunity.level}</dd>
            </div>
          )}
          <div className="flex w-full items-center gap-1.5">
            <dt className="sr-only">Prazo de inscrição</dt>
            <CalendarClockIcon
              aria-hidden="true"
              className="h-4 w-4 text-mist"
            />
            <dd className="tabular-nums">
              {daysLeft === null ? (
                (opportunity.deadlineNote ?? "Prazo a confirmar")
              ) : (
                <>
                  Prazo {opportunity.deadline}
                  <span
                    className={`ml-2 font-semibold ${isUrgent ? "text-signal" : "text-slate-100"}`}
                  >
                    {formatDaysLeft(daysLeft)}
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-auto pt-5">
          {opportunity.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {opportunity.tags.map((tag, index) => (
                <li
                  className={`rounded-full px-2.5 py-1 font-medium text-[12px] ${index === 0 ? "bg-fund text-white" : "bg-navy-800 text-slate-200 ring-1 ring-navy-700 ring-inset"}`}
                  key={tag}
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between border-navy-700/70 border-t pt-3.5 text-[13px]">
            {opportunity.officialLink ? (
              <a
                className="relative z-10 inline-flex items-center gap-1 text-mist underline-offset-4 transition-colors hover:text-white hover:underline"
                href={opportunity.officialLink}
                rel="noopener noreferrer"
                target="_blank"
              >
                Fonte oficial
                <span className="sr-only">
                  {" "}
                  de {opportunity.name} (abre em nova aba)
                </span>
                <ArrowUpRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span />
            )}
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-1.5 font-semibold text-slate-100 transition-colors duration-300 group-hover:text-signal"
            >
              Ver detalhes
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
