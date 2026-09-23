"use client";

import {
  ArrowLeftIcon,
  ChevronRightIcon,
  MailIcon,
  SearchXIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDaysLeft } from "@/lib/date-utils";
import type { OpportunityDetail } from "./detail-model";
import {
  DeadlineCard,
  DefinitionPairs,
  DetailHero,
  DetailSection,
  type DetailSectionLink,
  deadlineState,
  FactsGrid,
  HeroActions,
  PlaceCard,
  Prose,
  RuleList,
  SectionNav,
  SourceCard,
  SourceGap,
  StatusBadges,
  StepsChecklist,
} from "./detail-parts";
import DetailSimilar from "./detail-similar";
import type { MapWindow } from "./map-windows";

const REPORT_EMAIL = "passaporteglobalbr@gmail.com";

const SECTIONS: DetailSectionLink[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "quem-pode", label: "Quem pode participar" },
  { id: "custos", label: "Custos e benefícios" },
  { id: "inscricao", label: "Como se candidatar" },
];

export interface DetailFavorite {
  enabled: boolean;
  isSaved: boolean;
  onToggle: () => void;
}

interface OpportunityDetailPageProps {
  backHref: string;
  backLabel: string;
  detail: OpportunityDetail | null;
  error: string | null;
  favorite: DetailFavorite;
  loading: boolean;
  map: MapWindow;
}

/** Native share sheet where there is one; otherwise copies the link. */
export const shareDetail = async (detail: { name: string }) => {
  const url = window.location.href;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: detail.name, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copiado. É só colar onde quiser compartilhar.");
  } catch {
    toast("Não foi possível copiar o link. Copie o endereço da página.");
  }
};

const Eligibility = ({ detail }: { detail: OpportunityDetail }) => {
  const hasRules = detail.requirements.length > 0 || detail.eligibilityNote;
  return (
    <div className="space-y-6">
      {detail.verified && (
        <p className="flex max-w-[68ch] gap-2.5 rounded-lg bg-verified/10 px-4 py-3 text-[15px] text-slate-100 ring-1 ring-verified/30 ring-inset">
          <span
            aria-hidden="true"
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-verified"
          />
          Participação de estudantes do Brasil confirmada na fonte oficial em{" "}
          {detail.checkedAt}.
        </p>
      )}
      {detail.eligibilityNote && (
        <Prose paragraphs={[detail.eligibilityNote]} />
      )}
      {detail.requirements.length > 0 && (
        <RuleList items={detail.requirements} />
      )}
      {!hasRules && (
        <SourceGap>
          A fonte não detalha os requisitos. Confira as regras completas no site
          oficial antes de se inscrever.
        </SourceGap>
      )}
    </div>
  );
};

const HowToApply = ({ detail }: { detail: OpportunityDetail }) => {
  const nothing =
    detail.applySteps.length === 0 &&
    detail.applyParagraphs.length === 0 &&
    !detail.contact;
  return (
    <div className="space-y-7">
      {detail.applySteps.length > 0 && (
        <StepsChecklist
          key={`${detail.scope}:${detail.id}`}
          progressKey={`${detail.scope}:${detail.id}`}
          steps={detail.applySteps}
        />
      )}
      {detail.applyParagraphs.length > 0 && (
        <Prose paragraphs={detail.applyParagraphs} />
      )}
      {nothing && (
        <SourceGap>
          A fonte não descreve as etapas. O passo a passo está no site oficial.
        </SourceGap>
      )}
      {detail.contact && (
        <p className="flex max-w-[68ch] gap-2.5 text-[15px] text-slate-200">
          <MailIcon
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-mist"
          />
          <span>
            <span className="text-mist">Contato: </span>
            {detail.contact.href ? (
              <a
                className="text-atlantic underline-offset-4 hover:underline"
                href={detail.contact.href}
                rel="noopener noreferrer"
                target={
                  detail.contact.href.startsWith("mailto:")
                    ? undefined
                    : "_blank"
                }
              >
                {detail.contact.text}
              </a>
            ) : (
              detail.contact.text
            )}
          </span>
        </p>
      )}
    </div>
  );
};

const MobileActionBar = ({ detail }: { detail: OpportunityDetail }) => {
  if (!detail.officialLink) {
    return null;
  }
  const state = deadlineState(detail.daysLeft);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-navy-700 border-t bg-navy-900 px-5 py-3 lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 text-[13px] text-mist leading-tight">
          Prazo{" "}
          <span className="font-semibold text-[15px] text-white tabular-nums">
            {detail.deadline}
          </span>
          <br />
          {detail.lifecycleLabel ??
            (state === "closed"
              ? "Inscrições encerradas"
              : detail.daysLeft !== null && formatDaysLeft(detail.daysLeft))}
        </p>
        <a
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-signal px-5 font-semibold text-[15px] text-navy-950"
          href={detail.officialLink}
          rel="noopener noreferrer"
          target="_blank"
        >
          Site oficial
          <span className="sr-only">(abre em nova aba)</span>
          <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

const DetailSkeleton = () => (
  <div aria-busy="true" className="min-h-screen bg-navy-950">
    <p className="sr-only">Carregando oportunidade…</p>
    <div className="mx-auto w-full max-w-[84rem] px-5 py-12 sm:px-8">
      <div className="h-4 w-48 animate-pulse rounded bg-navy-800" />
      <div className="mt-8 h-11 w-11 animate-pulse rounded-xl bg-navy-800" />
      <div className="mt-5 h-10 w-3/4 max-w-[40rem] animate-pulse rounded bg-navy-800" />
      <div className="mt-3 h-10 w-1/2 max-w-[28rem] animate-pulse rounded bg-navy-800" />
      <div className="mt-6 h-5 w-2/3 max-w-[36rem] animate-pulse rounded bg-navy-800" />
      <div className="mt-8 flex gap-3">
        <div className="h-12 w-48 animate-pulse rounded-xl bg-navy-800" />
        <div className="h-12 w-32 animate-pulse rounded-xl bg-navy-800" />
      </div>
    </div>
  </div>
);

const DetailMissing = ({
  backHref,
  backLabel,
  error,
}: {
  backHref: string;
  backLabel: string;
  error: string | null;
}) => (
  <div className="flex min-h-[70vh] items-center justify-center bg-navy-950 px-5 font-reading">
    <div className="max-w-md text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-navy-600 text-mist">
        <SearchXIcon aria-hidden="true" className="h-6 w-6" />
      </span>
      <h1 className="mt-5 font-bold text-[1.375rem] text-white">
        {error
          ? "Não foi possível carregar esta oportunidade"
          : "Oportunidade não encontrada"}
      </h1>
      <p className="mt-2 text-[15px] text-mist leading-relaxed">
        {error
          ? "Tente de novo em instantes."
          : "Ela pode ter sido removida do catálogo ou o link está incompleto."}
      </p>
      <Link
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-navy-600 px-5 font-semibold text-[15px] text-white hover:border-signal/60"
        href={backHref}
      >
        <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
        Voltar para {backLabel.toLowerCase()}
      </Link>
    </div>
  </div>
);

const OpportunityDetailPage = ({
  backHref,
  backLabel,
  detail,
  error,
  favorite,
  loading,
  map,
}: OpportunityDetailPageProps) => {
  if (loading) {
    return <DetailSkeleton />;
  }
  if (!detail) {
    return (
      <DetailMissing backHref={backHref} backLabel={backLabel} error={error} />
    );
  }

  const overview =
    detail.paragraphs.length > 0 ? (
      <Prose paragraphs={detail.paragraphs} />
    ) : (
      <SourceGap>A fonte não traz uma descrição desta oportunidade.</SourceGap>
    );

  return (
    <div className="min-h-screen bg-navy-950 pb-24 font-reading text-slate-100 lg:pb-0">
      <DetailHero
        actions={
          <HeroActions
            canSave={favorite.enabled}
            isSaved={favorite.isSaved}
            officialLink={detail.officialLink}
            onSave={favorite.onToggle}
            onShare={() => {
              shareDetail(detail).catch(() => undefined);
            }}
          />
        }
        backHref={backHref}
        backLabel={backLabel}
        badges={<StatusBadges detail={detail} />}
        detail={detail}
      />

      <div className="mx-auto grid w-full max-w-[84rem] gap-10 px-5 pt-8 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          <section
            aria-labelledby="principais-titulo"
            className="rounded-xl border border-navy-700 bg-navy-900/60 p-5 sm:p-6"
          >
            <h2 className="sr-only" id="principais-titulo">
              Informações principais
            </h2>
            <FactsGrid facts={detail.facts} />
          </section>

          <div className="mt-8">
            <SectionNav sections={SECTIONS} />
            <DetailSection id="visao-geral" title="Visão geral">
              {overview}
            </DetailSection>
            <DetailSection id="quem-pode" title="Quem pode participar">
              <Eligibility detail={detail} />
            </DetailSection>
            <DetailSection id="custos" title="Custos e benefícios">
              {detail.costs.length > 0 ? (
                <DefinitionPairs items={detail.costs} />
              ) : (
                <SourceGap>
                  A fonte não informa custos nem benefícios. Confira no site
                  oficial.
                </SourceGap>
              )}
            </DetailSection>
            <DetailSection id="inscricao" title="Como se candidatar">
              <HowToApply detail={detail} />
            </DetailSection>
          </div>

          <p className="mt-6 max-w-[68ch] text-[13px] text-mist-dim leading-relaxed">
            Viu algo desatualizado ou errado nesta página? Escreva para{" "}
            <a
              className="text-mist underline decoration-navy-600 underline-offset-2 hover:text-white"
              href={`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`Correção: ${detail.name}`)}`}
            >
              {REPORT_EMAIL}
            </a>
            .
          </p>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <DeadlineCard detail={detail} />
          <SourceCard detail={detail} />
          <PlaceCard detail={detail} map={map} />
          <DetailSimilar
            currentId={detail.id}
            place={detail.similarPlace}
            scope={detail.scope}
            type={detail.type}
          />
        </aside>
      </div>

      <MobileActionBar detail={detail} />
    </div>
  );
};

export default OpportunityDetailPage;
