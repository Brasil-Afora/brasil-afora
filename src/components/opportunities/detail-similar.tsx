"use client";

import { ArrowRightIcon, BadgeCheckIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  isVerifiedInternationalOpportunityId,
  isVerifiedNationalOpportunityId,
  verifiedInternationalOpportunities,
  verifiedNationalOpportunities,
} from "@/data/verified-opportunities";
import {
  useInternationalOpportunitiesQuery,
  useNationalOpportunitiesQuery,
} from "@/hooks/queries/use-opportunity-queries";
import CatalogCover from "./catalog-cover";
import {
  type CatalogItem,
  type CatalogScope,
  toInternationalItem,
  toNationalItem,
} from "./catalog-model";
import { SideCard } from "./detail-parts";

const MAX_SIMILAR = 3;
const SAME_TYPE_SCORE = 2;
const SAME_PLACE_SCORE = 1;
const DIACRITICS_REGEX = /\p{M}/gu;

const normalize = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase().trim();

const nameKey = (name: string): string => normalize(name);

interface SimilarProps {
  currentId: string;
  place: string;
  scope: CatalogScope;
  type: string;
}

/** Open opportunities of the same scope, same type first, then same place. */
const useSimilarItems = ({
  currentId,
  place,
  scope,
  type,
}: SimilarProps): CatalogItem[] => {
  const international = useInternationalOpportunitiesQuery({
    enabled: scope === "international",
  });
  const national = useNationalOpportunitiesQuery({
    enabled: scope === "national",
  });

  return useMemo(() => {
    const now = new Date();
    const items: { item: CatalogItem; type: string }[] =
      scope === "international"
        ? [
            ...verifiedInternationalOpportunities,
            ...(international.data ?? []),
          ].map((raw) => ({
            item: toInternationalItem(
              raw,
              isVerifiedInternationalOpportunityId(raw.id),
              now
            ),
            type: raw.tipo,
          }))
        : [...verifiedNationalOpportunities, ...(national.data ?? [])].map(
            (raw) => ({
              item: toNationalItem(
                raw,
                isVerifiedNationalOpportunityId(raw.id),
                now
              ),
              type: raw.tipo,
            })
          );

    const seen = new Set<string>();
    const wantedType = normalize(type);
    const wantedPlace = normalize(place);
    return items
      .filter(({ item }) => {
        const key = nameKey(item.name);
        const open = item.daysLeft !== null && item.daysLeft >= 0;
        if (item.id === currentId || seen.has(key) || !open) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map(({ item, type: itemType }) => {
        const sameType =
          wantedType !== "" && normalize(itemType) === wantedType;
        const samePlace =
          wantedPlace !== "" && normalize(item.place).includes(wantedPlace);
        return {
          item,
          score:
            (sameType ? SAME_TYPE_SCORE : 0) +
            (samePlace ? SAME_PLACE_SCORE : 0),
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score || (a.item.daysLeft ?? 0) - (b.item.daysLeft ?? 0)
      )
      .slice(0, MAX_SIMILAR)
      .map(({ item }) => item);
  }, [currentId, international.data, national.data, place, scope, type]);
};

const DetailSimilar = (props: SimilarProps) => {
  const items = useSimilarItems(props);
  const catalogHref =
    props.scope === "international"
      ? "/oportunidades/internacionais"
      : "/oportunidades/nacionais";

  if (items.length === 0) {
    return null;
  }

  return (
    <SideCard title="Oportunidades parecidas">
      <ul className="-my-1 divide-y divide-navy-700/70">
        {items.map((item) => (
          <li
            className="group relative flex items-center gap-3 py-3"
            key={item.id}
          >
            <CatalogCover
              className="h-14 w-20 shrink-0 rounded-lg"
              compact
              cover={item.cover}
              sizes="5rem"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-semibold text-[14px] text-white leading-snug">
                <Link
                  className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:decoration-signal"
                  href={item.href}
                >
                  {item.name}
                </Link>
              </p>
              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-mist">
                {item.verified && (
                  <BadgeCheckIcon
                    aria-label="Verificada"
                    className="h-3.5 w-3.5 shrink-0 text-verified"
                  />
                )}
                <span className="truncate">
                  {item.place} · Prazo {item.deadline}
                </span>
              </p>
            </div>
            <ArrowRightIcon
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-mist transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-signal"
            />
          </li>
        ))}
      </ul>
      <Link
        className="mt-3 inline-flex items-center gap-1.5 font-medium text-[14px] text-signal hover:text-signal-strong"
        href={catalogHref}
      >
        Ver todas
        <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
      </Link>
    </SideCard>
  );
};

export default DetailSimilar;
