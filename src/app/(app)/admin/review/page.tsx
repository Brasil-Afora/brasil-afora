import {
  ArrowLeftIcon,
  CalendarClockIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import ReviewActions from "@/components/admin/review-actions";
import ReviewAdditionalCorrectionForm, {
  type AdditionalCorrectionField,
} from "@/components/admin/review-additional-correction-form";
import ReviewCorrectionForm from "@/components/admin/review-correction-form";
import ReviewSemanticStateForm from "@/components/admin/review-semantic-state-form";
import { db } from "@/db/client";
import { getReviewQueue } from "@/server/review/review-queue";
import { requireAdminSession } from "@/server/session";

const displayDate = (value: string | null): string => {
  if (!value) {
    return "Prazo ainda em verificação";
  }
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const semanticFieldLabel = (fieldName: string): string => {
  const labels: Record<string, string> = {
    age: "Idade",
    application_deadline: "Prazo de inscrição",
    application_fee: "Taxa de inscrição",
    application_url: "Link de inscrição",
    brazilian_eligibility: "Elegibilidade de brasileiros",
    citizenship: "Nacionalidade",
    city: "Cidade",
    country: "País",
    description: "Descrição",
    education_level: "Nível de ensino",
    image: "Imagem",
    is_free: "Gratuidade",
    modality: "Modalidade",
    organizer: "Organizador",
    program_cost: "Custo do programa",
    residence: "Residência",
    title: "Título",
  };
  return (
    labels[fieldName] ??
    fieldName
      .split("_")
      .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
      .join(" ")
  );
};

const gateImpactClass = (impact: string): string => {
  if (impact === "block") {
    return "bg-red-500/15 text-red-300";
  }
  if (impact === "review") {
    return "bg-amber-500/15 text-amber-300";
  }
  return "bg-emerald-500/15 text-emerald-300";
};

const additionalCorrectionFields = (
  item: Awaited<ReturnType<typeof getReviewQueue>>[number]
): AdditionalCorrectionField[] => {
  const projection = item.publication.public_projection;
  if (!projection) {
    return [];
  }
  return [
    { fieldName: "title", label: "Título", value: projection.title },
    {
      fieldName: "description",
      label: "Descrição",
      value: projection.description,
    },
    {
      fieldName: "organizer",
      label: "Organizador",
      value: projection.organizer,
    },
    {
      fieldName: "categories",
      label: "Categorias (uma por linha)",
      value: projection.opportunity_types,
    },
    {
      fieldName: "education_levels",
      label: "Níveis educacionais (um por linha)",
      value: projection.education_levels,
    },
    {
      fieldName: "location",
      label: "Local",
      value: projection.location,
    },
    {
      fieldName: "modality",
      label: "Modalidade",
      value: projection.modality,
    },
    {
      fieldName: "start_date",
      label: "Data de início",
      value: projection.start_date,
    },
    {
      fieldName: "end_date",
      label: "Data de término",
      value: projection.end_date,
    },
    {
      fieldName: "application_deadline",
      label: "Prazo de inscrição",
      value: projection.application_deadline_date,
    },
    {
      fieldName: "application_url",
      label: "Link de inscrição",
      value: projection.application_url,
    },
    {
      fieldName: "application_link_status",
      label: "Estado do link de inscrição",
      value: projection.application_link_status,
    },
    {
      fieldName: "image_url",
      label: "Imagem",
      value: projection.image_url,
    },
    {
      fieldName: "cost",
      label: "Custo",
      value: projection.cost_amount,
    },
    {
      fieldName: "currency",
      label: "Moeda",
      value: projection.currency,
    },
    {
      fieldName: "is_free",
      label: "Gratuito (true/false)",
      value: projection.is_free,
    },
    {
      fieldName: "lifecycle_status",
      label: "Estado",
      value: projection.lifecycle,
    },
    {
      fieldName: "site_taxonomy",
      label: "Coleção",
      value: projection.collection,
    },
  ];
};

const AdditionalCorrectionSection = ({
  item,
}: {
  item: Awaited<ReturnType<typeof getReviewQueue>>[number];
}) => {
  const snapshot = item.snapshots[0];
  if (!snapshot) {
    return null;
  }
  return (
    <div className="border-slate-800 border-t p-5 sm:p-6">
      <h3 className="mb-2 font-semibold text-lg">Corrigir outro campo</h3>
      <p className="mb-4 text-slate-400 text-sm">
        Use quando a prévia estiver incorreta mesmo sem uma tarefa automática
        aberta.
      </p>
      <ReviewAdditionalCorrectionForm
        editionId={item.edition.id}
        evidenceText={snapshot.preview_text}
        fields={additionalCorrectionFields(item)}
        key={item.publication.id}
        previousPublicationVersionId={item.publication.id}
        sourceDocumentId={snapshot.source_document_id}
      />
    </div>
  );
};

export default async function AdminReviewPage() {
  await requireAdminSession("/perfil");
  const items = await getReviewQueue(db);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-slate-400 text-sm hover:text-white"
          href="/admin"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Painel administrativo
        </Link>
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-400">
              <ShieldCheckIcon className="h-6 w-6" />
              <span className="font-semibold text-sm uppercase tracking-wider">
                Evidência antes da publicação
              </span>
            </div>
            <h1 className="font-bold text-3xl">Fila de revisão</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Compare valores, fontes e bloqueios. A aprovação cria um evento
              transacional; ela não ignora o gate nem publica direto.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
            <span className="block text-slate-400 text-xs uppercase">
              Pendentes
            </span>
            <strong className="text-2xl text-amber-400">{items.length}</strong>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center text-slate-400">
            Nenhuma edição aguardando revisão.
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item) => (
              <article
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20"
                key={item.publication.id}
              >
                <div className="border-slate-800 border-b p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-300">
                          {item.current_gate?.outcome ?? "gate ausente"}
                        </span>
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
                          {item.program.name} · {item.edition.label}
                        </span>
                        {item.current_gate?.source_cohort_measured === false ? (
                          <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-violet-300">
                            coorte ainda não medida
                          </span>
                        ) : null}
                      </div>
                      <h2 className="font-bold text-2xl">{item.title}</h2>
                      <p className="mt-1 text-slate-400 text-sm">
                        Verificado em{" "}
                        {item.edition.last_verified_at
                          ? new Date(
                              item.edition.last_verified_at
                            ).toLocaleString("pt-BR")
                          : "data desconhecida"}
                      </p>
                    </div>
                    <div className="text-slate-400 text-sm">
                      Versão {item.publication.version}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
                  <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <CalendarClockIcon className="h-4 w-4 text-amber-400" />
                      Inscrição atual
                    </h3>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="text-slate-500">Prazo</dt>
                      <dd>
                        {displayDate(
                          item.application_round?.deadline_date ?? null
                        )}{" "}
                        <span className="text-slate-500">
                          ({item.application_round?.deadline_precision})
                        </span>
                      </dd>
                      <dt className="text-slate-500">Estado</dt>
                      <dd>
                        {item.application_round?.status ?? "desconhecido"}
                      </dd>
                      <dt className="text-slate-500">Link</dt>
                      <dd>
                        {item.application_link?.status ?? "não verificado"}
                      </dd>
                    </dl>
                    {item.application_round?.application_url ? (
                      <a
                        className="mt-3 inline-flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300"
                        href={item.application_round.application_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Abrir formulário oficial
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <h3 className="mb-3 font-semibold">
                      Elegibilidade brasileira
                    </h3>
                    <p className="font-semibold text-emerald-300">
                      {item.brazil_eligibility?.status ?? "desconhecida"}
                    </p>
                    <ul className="mt-2 space-y-1 text-slate-400 text-sm">
                      {item.brazil_eligibility?.explanations.map(
                        (explanation) => (
                          <li key={explanation}>{explanation}</li>
                        )
                      )}
                      {item.brazil_eligibility?.unknowns.map((unknown) => (
                        <li className="text-amber-300" key={unknown}>
                          Pendente: {unknown}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <div className="border-slate-800 border-t p-5 sm:p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg">
                      Estados dos campos
                    </h3>
                    <p className="mt-1 text-slate-400 text-sm">
                      O valor e a ausência de valor são decisões separadas.
                      Confira aplicabilidade, cobertura e impacto antes de
                      aprovar.
                    </p>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {item.semantic_fields.map((field) => (
                      <section
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                        key={field.field_name}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">
                              {semanticFieldLabel(field.field_name)}
                            </h4>
                            <p className="mt-1 text-slate-200 text-sm">
                              {field.display_text}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 font-medium text-xs ${gateImpactClass(field.gate_impact)}`}
                          >
                            {field.gate_impact}
                          </span>
                        </div>
                        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                          <dt className="text-slate-500">Estado</dt>
                          <dd>{field.state}</dd>
                          <dt className="text-slate-500">Aplicabilidade</dt>
                          <dd>{field.applicability}</dd>
                          <dt className="text-slate-500">Criticidade</dt>
                          <dd>{field.criticality}</dd>
                          <dt className="text-slate-500">Cobertura</dt>
                          <dd>{field.source_coverage}</dd>
                          <dt className="text-slate-500">Motivo</dt>
                          <dd>{field.reason_code}</dd>
                        </dl>
                        <p className="mt-3 text-slate-400 text-xs">
                          {field.explanation}
                        </p>
                        <div className="mt-3 text-xs">
                          <p className="text-slate-500">Fontes verificadas</p>
                          <p className="text-slate-300">
                            {field.checked_source_roles.join(", ") ||
                              "Nenhuma fonte oficial concluída"}
                          </p>
                          {field.unchecked_source_roles.length > 0 ? (
                            <>
                              <p className="mt-2 text-slate-500">
                                Fontes ainda pendentes
                              </p>
                              <p className="text-amber-300">
                                {field.unchecked_source_roles.join(", ")}
                              </p>
                            </>
                          ) : null}
                          {field.extraction_failures.length > 0 ? (
                            <p className="mt-2 text-red-300">
                              Falhas: {field.extraction_failures.join(", ")}
                            </p>
                          ) : null}
                        </div>
                        {field.assertions.length > 0 ? (
                          <details className="mt-3 rounded-lg bg-black/30 p-3">
                            <summary className="cursor-pointer text-blue-300 text-xs">
                              Evidências e alternativas (
                              {field.assertions.length})
                            </summary>
                            <div className="mt-2 space-y-2">
                              {field.assertions.map((assertion) => (
                                <div
                                  className="border-slate-800 border-l-2 pl-2 text-xs"
                                  key={assertion.id}
                                >
                                  <p>
                                    {assertion.evidence_text ??
                                      assertion.raw_value}
                                  </p>
                                  <p className="mt-1 text-slate-500">
                                    {assertion.document_role} · autoridade{" "}
                                    {assertion.source_authority}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}
                        {item.snapshots[0] ? (
                          <ReviewSemanticStateForm
                            applicability={field.applicability}
                            editionId={item.edition.id}
                            evidenceText={
                              field.assertions[0]?.evidence_text ??
                              field.assertions[0]?.raw_value ??
                              item.snapshots[0].preview_text
                            }
                            fieldName={field.field_name}
                            previousPublicationVersionId={item.publication.id}
                            sourceDocumentId={
                              field.assertions[0]?.source_document_id ??
                              item.snapshots[0].source_document_id
                            }
                            state={field.state}
                            value={field.value}
                          />
                        ) : null}
                      </section>
                    ))}
                  </div>
                </div>

                {item.snapshots.length > 0 ? (
                  <div className="border-slate-800 border-t p-5 sm:p-6">
                    <h3 className="mb-4 font-semibold text-lg">
                      Fonte capturada
                    </h3>
                    <div className="space-y-3">
                      {item.snapshots.map((snapshot) => (
                        <details
                          className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                          key={snapshot.id}
                        >
                          <summary className="cursor-pointer font-medium text-slate-200 text-sm">
                            HTTP {snapshot.status_code} ·{" "}
                            {new Date(snapshot.fetched_at).toLocaleString(
                              "pt-BR"
                            )}
                          </summary>
                          <a
                            className="mt-3 inline-flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300"
                            href={snapshot.source_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Abrir fonte original
                            <ExternalLinkIcon className="h-3.5 w-3.5" />
                          </a>
                          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-slate-300 text-xs leading-relaxed">
                            {snapshot.preview_text ||
                              "A captura não possui texto legível para pré-visualização."}
                          </pre>
                        </details>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="border-slate-800 border-t p-5 sm:p-6">
                  <h3 className="mb-4 font-semibold text-lg">
                    Questões que exigem revisão
                  </h3>
                  {item.tasks.length === 0 ? (
                    <p className="rounded-xl bg-slate-950/60 p-4 text-slate-400 text-sm">
                      Nenhuma incerteza de campo aberta. Esta edição permanece
                      manual apenas porque a coorte da fonte ainda não atingiu
                      os limiares medidos para automação.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {item.tasks.map((task) => (
                        <section
                          className="rounded-xl border border-slate-800 p-4"
                          key={task.id}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>{task.field_name}</strong>
                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-300 text-xs">
                              {task.severity}
                            </span>
                            <span className="text-slate-500 text-xs">
                              {task.reason}
                            </span>
                          </div>
                          <p className="mt-2 text-slate-300 text-sm">
                            {task.explanation}
                          </p>
                          <div className="mt-3 space-y-2">
                            {task.assertions.map((assertion) => (
                              <div
                                className="rounded-lg bg-slate-950 p-3 text-sm"
                                key={assertion.id}
                              >
                                <p className="text-slate-200">
                                  {assertion.evidence_text ??
                                    assertion.raw_value}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-slate-500 text-xs">
                                  <span>
                                    autoridade {assertion.source_authority}
                                  </span>
                                  <span>{assertion.extractor}</span>
                                  <span>
                                    seletor{" "}
                                    {assertion.evidence_locator ??
                                      "não informado"}
                                  </span>
                                  {assertion.source_url ? (
                                    <a
                                      className="text-blue-400"
                                      href={assertion.source_url}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      fonte
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                          {task.assertions[0] || item.snapshots[0] ? (
                            <ReviewCorrectionForm
                              editionId={item.edition.id}
                              evidenceText={
                                task.assertions[0]?.evidence_text ??
                                task.assertions[0]?.raw_value ??
                                item.snapshots[0]?.preview_text ??
                                ""
                              }
                              fieldName={task.field_name}
                              previousPublicationVersionId={item.publication.id}
                              reviewTaskId={task.id}
                              sourceDocumentId={
                                task.assertions[0]?.source_document_id ??
                                item.snapshots[0]?.source_document_id ??
                                ""
                              }
                              suggestedValue={task.suggested_value}
                            />
                          ) : null}
                        </section>
                      ))}
                    </div>
                  )}
                </div>

                <AdditionalCorrectionSection item={item} />

                <div className="border-slate-800 border-t p-5 sm:p-6">
                  <ReviewActions
                    editionId={item.edition.id}
                    key={item.publication.id}
                    publicationVersion={item.publication.version}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
