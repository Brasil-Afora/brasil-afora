"use client";

import {
  ArrowRightIcon,
  BadgeCheckIcon,
  HeartIcon,
  PlayIcon,
} from "lucide-react";
import Link from "next/link";
import CatalogCover from "@/components/opportunities/catalog-cover";
import { Deadline } from "./profile-applications";
import type { ProfileItem } from "./profile-model";

const SavedCard = ({
  item,
  onRemove,
  onStart,
}: {
  item: ProfileItem;
  onRemove: (item: ProfileItem) => void;
  onStart: (item: ProfileItem) => void;
}) => {
  const closed = item.daysLeft !== null && item.daysLeft < 0;
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-xl border border-navy-700 bg-navy-900/60 ${closed ? "opacity-70" : ""}`}
    >
      <div className="relative">
        <CatalogCover
          className="h-32"
          cover={item.cover}
          sizes="(min-width: 1280px) 20rem, (min-width: 640px) 50vw, 100vw"
        />
        <button
          aria-label={`Remover ${item.name} das salvas`}
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-navy-950/85 text-signal shadow-[0_8px_20px_-8px_rgba(0,0,0,0.9)] transition-colors hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-signal"
          onClick={() => onRemove(item)}
          title="Remover das salvas"
          type="button"
        >
          <HeartIcon aria-hidden="true" className="h-4 w-4 fill-current" />
        </button>
      </div>
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        {item.institution && (
          <p className="flex items-center gap-1.5 truncate text-[12px] text-mist">
            {item.verified && (
              <BadgeCheckIcon
                aria-label="Verificada"
                className="h-3.5 w-3.5 shrink-0 text-verified"
              />
            )}
            <span className="truncate">{item.institution}</span>
          </p>
        )}
        <h3 className="mt-1 line-clamp-2 font-semibold text-[16px] text-white leading-snug">
          <Link
            className="underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            href={item.href}
          >
            {item.name}
          </Link>
        </h3>
        <p className="mt-1.5 text-[13px] text-mist">
          {item.place && <span>{item.place} · </span>}
          <Deadline item={item} />
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          {closed ? (
            <span className="text-[13px] text-mist-dim">
              Fica aqui até você remover.
            </span>
          ) : (
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-signal/70 px-3.5 font-semibold text-[13px] text-white transition-colors hover:bg-signal hover:text-navy-950 focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2"
              onClick={() => onStart(item)}
              type="button"
            >
              <PlayIcon aria-hidden="true" className="h-3.5 w-3.5" />
              Começar
            </button>
          )}
          <Link
            aria-label={`Ver detalhes de ${item.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-navy-600 text-mist transition-colors hover:border-signal/60 hover:text-white"
            href={item.href}
          >
            <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </li>
  );
};

const ProfileSaved = ({
  failed,
  items,
  loading,
  onRemove,
  onRetry,
  onStart,
}: {
  failed: boolean;
  items: ProfileItem[];
  loading: boolean;
  onRemove: (item: ProfileItem) => void;
  onRetry: () => void;
  onStart: (item: ProfileItem) => void;
}) => (
  <section aria-labelledby="salvas-titulo" className="scroll-mt-24" id="salvas">
    <h2
      className="font-bold text-[1.375rem] text-white leading-tight"
      id="salvas-titulo"
    >
      Salvas
    </h2>
    {failed && (
      <p className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-navy-700 border-dashed px-5 py-4 text-[15px] text-mist">
        Não foi possível carregar suas oportunidades salvas.
        <button
          className="font-semibold text-signal hover:text-signal-strong"
          onClick={onRetry}
          type="button"
        >
          Tentar de novo
        </button>
      </p>
    )}
    {loading && (
      <div
        aria-hidden="true"
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <div className="h-72 animate-pulse rounded-xl bg-navy-900" />
        <div className="h-72 animate-pulse rounded-xl bg-navy-900" />
      </div>
    )}
    {!(loading || failed) && items.length === 0 && (
      <p className="mt-4 max-w-[60ch] rounded-xl border border-navy-700 border-dashed px-5 py-4 text-[15px] text-mist leading-relaxed">
        Nenhuma oportunidade salva fora das que você já começou. Use “Salvar” na
        página de uma oportunidade do{" "}
        <Link
          className="text-signal underline-offset-2 hover:underline"
          href="/oportunidades/internacionais"
        >
          catálogo internacional
        </Link>{" "}
        ou do{" "}
        <Link
          className="text-signal underline-offset-2 hover:underline"
          href="/oportunidades/nacionais"
        >
          nacional
        </Link>
        .
      </p>
    )}
    {!loading && items.length > 0 && (
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <SavedCard
            item={item}
            key={item.stepsKey}
            onRemove={onRemove}
            onStart={onStart}
          />
        ))}
      </ul>
    )}
  </section>
);

export default ProfileSaved;
