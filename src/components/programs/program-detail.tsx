"use client";

import { ArrowRightIcon, CheckIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import CatalogCover from "@/components/opportunities/catalog-cover";
import type { DetailFact } from "@/components/opportunities/detail-model";
import {
  DefinitionPairs,
  DetailHero,
  DetailSection,
  type DetailSectionLink,
  FactsGrid,
  HeroActions,
  Prose,
  RuleList,
  SectionNav,
  SideCard,
  SourceGap,
  StepsChecklist,
} from "@/components/opportunities/detail-parts";
import { shareDetail } from "@/components/opportunities/opportunity-detail";
import useIsClient from "@/hooks/use-is-client";
import { formatDaysLeft } from "@/lib/date-utils";
import { ProgramStatusLine } from "./program-items";
import {
  PROGRAMS_PATH,
  type ProgramStatus,
  programCover,
  programStatus,
  relatedPrograms,
} from "./program-model";
import type { Program } from "./types";

// The program page follows the opportunity page (opportunity-detail.tsx): the
// same hero, facts card, sticky section tabs, checklist and sidebar. Where an
// opportunity has one deadline, a program has a round: the sidebar shows
// where enrollment stands and the round's dates. Programs are not on the map.

const REPORT_EMAIL = "passaporteglobalbr@gmail.com";
const PARAGRAPH_SPLIT_REGEX = /\n\s*\n/;
const LEADING_WWW_REGEX = /^www\./;

const SECTIONS: DetailSectionLink[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "para-quem", label: "Para quem é" },
  { id: "oferece", label: "O que oferece" },
  { id: "como-participar", label: "Como participar" },
];

const domainOf = (link: string): string | null => {
  try {
    return new URL(link).hostname.replace(LEADING_WWW_REGEX, "");
  } catch {
    return null;
  }
};

const factsOf = (program: Program): DetailFact[] => [
  { icon: "type", label: "Tipo", value: program.tipo },
  { icon: "level", label: "Nível", value: program.niveis.join(" · ") },
  { icon: "age", label: "Para quem", value: program.publico },
  {
    icon: "funding",
    label: "O que oferece",
    value: program.beneficios.join(" · "),
  },
  { icon: "modality", label: "Modalidade", value: program.modalidade ?? null },
  { icon: "clock", label: "Duração", value: program.duracao ?? null },
  { icon: "place", label: "Onde acontece", value: program.local },
  {
    icon: "fee",
    label: "Custo para participar",
    value: program.beneficios.includes("Gratuito") ? "Gratuito" : null,
  },
];

// ---------------------------------------------------------------------------
// Hero

const HeroBadge = ({ status }: { status: ProgramStatus | null }) => {
  if (!status) {
    return null;
  }
  if (status.urgent) {
    return (
      <span className="rounded-full bg-signal px-2.5 py-1 font-semibold text-[12px] text-navy-950">
        Prazo próximo
      </span>
    );
  }
  return (
    <span className="rounded-full bg-navy-800 px-2.5 py-1 font-semibold text-[12px] text-slate-200 ring-1 ring-navy-700 ring-inset">
      {status.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Sidebar

interface RoundDate {
  data: string;
  label: string;
}

const roundDates = (program: Program, status: ProgramStatus): RoundDate[] => {
  const { abertura, prazoInscricao, previsao } = program.inscricoes;
  return [
    ...(abertura ? [{ label: "Abertura das inscrições", data: abertura }] : []),
    // While open, the deadline is already the card's headline.
    ...(prazoInscricao && status.kind !== "aberto"
      ? [{ label: "Fim das inscrições", data: prazoInscricao }]
      : []),
    ...(program.datas ?? []),
    // For a closed round the forecast is already the status line.
    ...(previsao && status.kind !== "encerrado" && status.kind !== "em-breve"
      ? [{ label: "Próxima turma", data: previsao }]
      : []),
  ];
};

const EnrollmentHeadline = ({
  deadline,
  status,
}: {
  deadline: string | undefined;
  status: ProgramStatus;
}) => {
  if (status.kind === "aberto" && status.daysLeft !== null && deadline) {
    return (
      <>
        <p className="font-bold text-[2rem] text-white tabular-nums leading-none">
          {deadline}
        </p>
        <p
          className={`mt-2 inline-flex items-center gap-1.5 font-semibold text-[14px] ${status.urgent ? "text-signal" : "text-slate-200"}`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${status.urgent ? "bg-signal" : "bg-mist"}`}
          />
          Inscrições abertas · {formatDaysLeft(status.daysLeft)}
        </p>
      </>
    );
  }
  return <ProgramStatusLine status={status} />;
};

const EnrollmentCard = ({
  program,
  status,
}: {
  program: Program;
  status: ProgramStatus | null;
}) => {
  const dates = status ? roundDates(program, status) : [];
  return (
    <SideCard title="Inscrições">
      {status ? (
        <EnrollmentHeadline
          deadline={program.inscricoes.prazoInscricao}
          status={status}
        />
      ) : (
        <div className="h-8 w-40 animate-pulse rounded bg-navy-800" />
      )}
      {dates.length > 0 && (
        <dl className="mt-5 space-y-3 border-navy-700/70 border-t pt-4">
          {dates.map((date) => (
            <div
              className="flex items-baseline justify-between gap-4 text-[14px]"
              key={date.label}
            >
              <dt className="text-mist">{date.label}</dt>
              <dd className="text-right text-slate-100 tabular-nums">
                {date.data}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <a
        className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-signal font-semibold text-[15px] text-navy-950 transition-colors hover:bg-signal-strong"
        href={program.linkOficial}
        rel="noopener noreferrer"
        target="_blank"
      >
        Acessar site oficial
        <span className="sr-only">(abre em nova aba)</span>
        <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
      </a>
    </SideCard>
  );
};

const OrganizationCard = ({ program }: { program: Program }) => {
  const domain = domainOf(program.linkOficial);
  return (
    <SideCard title="Quem oferece">
      <p className="font-semibold text-[15px] text-white">
        {program.instituicaoResponsavel}
      </p>
      {program.tipoOrganizacao && (
        <p className="mt-0.5 text-[14px] text-mist">
          {program.tipoOrganizacao}
        </p>
      )}
      <p className="mt-4 text-[14px] text-mist leading-relaxed">
        Informação do catálogo, atualizada em{" "}
        <span className="text-slate-200 tabular-nums">
          {program.atualizadoEm}
        </span>
        . Confirme datas e regras no site oficial antes de se inscrever.
      </p>
      {domain && (
        <a
          className="mt-4 inline-flex max-w-full items-center gap-1.5 text-[14px] text-atlantic underline-offset-4 hover:underline"
          href={program.linkOficial}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="truncate">{domain}</span>
          <span className="sr-only">(abre em nova aba)</span>
          <ChevronRightIcon
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0"
          />
        </a>
      )}
    </SideCard>
  );
};

const RelatedCard = ({ program }: { program: Program }) => {
  const isClient = useIsClient();
  if (!isClient) {
    return null;
  }
  const items = relatedPrograms(program, new Date());
  if (items.length === 0) {
    return null;
  }
  return (
    <SideCard title="Programas parecidos">
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
              <p className="mt-0.5 truncate text-[12px] text-mist">
                {item.type} · {item.status.label}
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
        href={PROGRAMS_PATH}
      >
        Ver todos
        <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
      </Link>
    </SideCard>
  );
};

const MobileActionBar = ({
  program,
  status,
}: {
  program: Program;
  status: ProgramStatus | null;
}) => (
  <div className="fixed inset-x-0 bottom-0 z-30 border-navy-700 border-t bg-navy-900 px-5 py-3 lg:hidden">
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 text-[13px]">
        {status && <ProgramStatusLine compact status={status} />}
      </div>
      <a
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-signal px-5 font-semibold text-[15px] text-navy-950"
        href={program.linkOficial}
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

// ---------------------------------------------------------------------------
// Sections

const Benefits = ({ program }: { program: Program }) => {
  // Duration is in the facts card; the weekly commitment is not.
  const pairs = program.dedicacao
    ? [{ label: "Dedicação", value: program.dedicacao }]
    : [];
  if (program.beneficiosDetalhe.length === 0 && pairs.length === 0) {
    return (
      <SourceGap>
        A fonte não detalha os benefícios. Confira no site oficial.
      </SourceGap>
    );
  }
  return (
    <div className="space-y-7">
      {program.beneficiosDetalhe.length > 0 && (
        <ul className="grid max-w-[68ch] gap-3">
          {program.beneficiosDetalhe.map((benefit) => (
            <li
              className="flex gap-3 text-[15px] text-slate-200 leading-relaxed"
              key={benefit}
            >
              <CheckIcon
                aria-hidden="true"
                className="mt-1 h-4 w-4 shrink-0 text-mist"
                strokeWidth={2.5}
              />
              {benefit}
            </li>
          ))}
        </ul>
      )}
      {pairs.length > 0 && <DefinitionPairs items={pairs} />}
    </div>
  );
};

// Level and audience lead the facts card; this section is the fine print.
const Eligibility = ({ program }: { program: Program }) =>
  program.requisitos.length > 0 ? (
    <RuleList items={program.requisitos} />
  ) : (
    <SourceGap>
      A fonte não lista requisitos além do público ({program.publico}). Confira
      as regras completas no site oficial antes de se inscrever.
    </SourceGap>
  );

const HowToJoin = ({ program }: { program: Program }) => {
  const steps = program.etapasSelecao;
  if (steps.length >= 2) {
    return (
      <StepsChecklist
        key={program.id}
        progressKey={`program:${program.id}`}
        steps={steps.map((text) => ({ key: text.toLowerCase(), text }))}
      />
    );
  }
  if (steps.length === 1) {
    return <Prose paragraphs={steps} />;
  }
  return (
    <SourceGap>
      A fonte não descreve as etapas. O passo a passo está no site oficial.
    </SourceGap>
  );
};

// ---------------------------------------------------------------------------
// Page

const ProgramDetail = ({ program }: { program: Program }) => {
  const isClient = useIsClient();
  const status = isClient ? programStatus(program, new Date()) : null;
  const paragraphs = program.descricao
    .split(PARAGRAPH_SPLIT_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-navy-950 pb-24 font-reading text-slate-100 lg:pb-0">
      <DetailHero
        actions={
          <HeroActions
            canSave={false}
            isSaved={false}
            officialLink={program.linkOficial}
            onSave={() => undefined}
            onShare={() => {
              shareDetail({ name: program.nome }).catch(() => undefined);
            }}
          />
        }
        backHref={PROGRAMS_PATH}
        backLabel="Programas e Bolsas"
        badges={<HeroBadge status={status} />}
        detail={{
          cover: programCover(program),
          institution: program.instituicaoResponsavel,
          name: program.nome,
          summary: program.resumo,
        }}
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
            <FactsGrid facts={factsOf(program)} />
          </section>

          <div className="mt-8">
            <SectionNav sections={SECTIONS} />
            <DetailSection id="visao-geral" title="Visão geral">
              <Prose paragraphs={paragraphs} />
            </DetailSection>
            <DetailSection id="para-quem" title="Para quem é">
              <Eligibility program={program} />
            </DetailSection>
            <DetailSection id="oferece" title="O que oferece">
              <Benefits program={program} />
            </DetailSection>
            <DetailSection id="como-participar" title="Como participar">
              <HowToJoin program={program} />
            </DetailSection>
          </div>

          <p className="mt-6 max-w-[68ch] text-[13px] text-mist-dim leading-relaxed">
            Viu algo desatualizado ou errado nesta página? Escreva para{" "}
            <a
              className="text-mist underline decoration-navy-600 underline-offset-2 hover:text-white"
              href={`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`Correção: ${program.nome}`)}`}
            >
              {REPORT_EMAIL}
            </a>
            .
          </p>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <EnrollmentCard program={program} status={status} />
          <OrganizationCard program={program} />
          <RelatedCard program={program} />
        </aside>
      </div>

      <MobileActionBar program={program} status={status} />
    </div>
  );
};

export default ProgramDetail;
