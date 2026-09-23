"use client";

import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SemanticState =
  | "conflicting"
  | "explicit_value"
  | "explicitly_unrestricted"
  | "extraction_failed"
  | "not_applicable"
  | "not_stated"
  | "pending_verification"
  | "unresolved";

type Applicability =
  | "conditionally_required"
  | "not_applicable"
  | "optional"
  | "required"
  | "unknown_applicability";

interface ReviewSemanticStateFormProps {
  applicability: string;
  editionId: string;
  evidenceText: string;
  fieldName: string;
  previousPublicationVersionId: string;
  sourceDocumentId: string;
  state: string;
  value: unknown;
}

const STATES: Array<{ label: string; value: SemanticState }> = [
  { label: "Valor explícito", value: "explicit_value" },
  {
    label: "Explicitamente sem restrição",
    value: "explicitly_unrestricted",
  },
  { label: "Não se aplica", value: "not_applicable" },
  { label: "Não informado pelo organizador", value: "not_stated" },
  { label: "Interpretação pendente", value: "unresolved" },
  { label: "Fontes conflitantes", value: "conflicting" },
  { label: "Falha de extração", value: "extraction_failed" },
  { label: "Verificação pendente", value: "pending_verification" },
];

const APPLICABILITIES: Array<{ label: string; value: Applicability }> = [
  { label: "Obrigatório", value: "required" },
  { label: "Obrigatório em alguns casos", value: "conditionally_required" },
  { label: "Opcional", value: "optional" },
  { label: "Não se aplica", value: "not_applicable" },
  { label: "Aplicabilidade em verificação", value: "unknown_applicability" },
];

const stateValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const parsedValue = (value: string): unknown => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  if (
    (normalized.startsWith("{") && normalized.endsWith("}")) ||
    (normalized.startsWith("[") && normalized.endsWith("]"))
  ) {
    try {
      return JSON.parse(normalized) as unknown;
    } catch {
      return normalized;
    }
  }
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return normalized;
};

const isSemanticState = (value: string): value is SemanticState =>
  STATES.some((state) => state.value === value);

const isApplicability = (value: string): value is Applicability =>
  APPLICABILITIES.some((item) => item.value === value);

const ReviewSemanticStateForm = ({
  applicability,
  editionId,
  evidenceText,
  fieldName,
  previousPublicationVersionId,
  sourceDocumentId,
  state,
  value,
}: ReviewSemanticStateFormProps) => {
  const router = useRouter();
  const [selectedState, setSelectedState] = useState<SemanticState>(
    isSemanticState(state) ? state : "pending_verification"
  );
  const [selectedApplicability, setSelectedApplicability] =
    useState<Applicability>(
      isApplicability(applicability) ? applicability : "unknown_applicability"
    );
  const [correctedValue, setCorrectedValue] = useState(stateValue(value));
  const [evidence, setEvidence] = useState(evidenceText);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async () => {
    if (evidence.trim().length < 3 || reason.trim().length < 3) {
      setFeedback("Informe a evidência e a justificativa desta decisão.");
      return;
    }
    setPending(true);
    setFeedback(null);
    try {
      const carriesValue = selectedState === "explicit_value";
      const response = await fetch(
        `/api/v1/editions/${editionId}/corrections`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contract_version: "1.0",
            idempotency_key: crypto.randomUUID(),
            review_task_id: null,
            edition_id: editionId,
            field_name: fieldName,
            corrected_value: carriesValue ? parsedValue(correctedValue) : null,
            correction_reason: reason.trim(),
            evidence_text: evidence.trim(),
            evidence_locator: null,
            source_document_id: sourceDocumentId,
            previous_publication_version_id: previousPublicationVersionId,
            semantic_state: selectedState,
            applicability: selectedApplicability,
            semantic_reason_code: `human_confirmed_${selectedState}`,
            display_key: `${fieldName}.${selectedState}`,
            display_parameters: {},
          }),
        }
      );
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? "Não foi possível salvar o estado."
        );
      }
      setFeedback(
        "Estado semântico salvo como nova asserção e nova versão para aprovação."
      );
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o estado."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <summary className="cursor-pointer font-medium text-blue-300 text-xs">
        Alterar estado com evidência
      </summary>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-slate-400 text-xs">Estado</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
              onChange={(event) => {
                const nextState = event.target.value;
                if (isSemanticState(nextState)) {
                  setSelectedState(nextState);
                  if (nextState === "not_applicable") {
                    setSelectedApplicability("not_applicable");
                  }
                }
              }}
              value={selectedState}
            >
              {STATES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-slate-400 text-xs">
              Aplicabilidade
            </span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
              onChange={(event) => {
                const nextApplicability = event.target.value;
                if (isApplicability(nextApplicability)) {
                  setSelectedApplicability(nextApplicability);
                }
              }}
              value={selectedApplicability}
            >
              {APPLICABILITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedState === "explicit_value" ? (
          <label>
            <span className="mb-1 block text-slate-400 text-xs">
              Valor confirmado
            </span>
            <textarea
              className="min-h-20 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
              onChange={(event) => setCorrectedValue(event.target.value)}
              value={correctedValue}
            />
          </label>
        ) : null}
        <label>
          <span className="mb-1 block text-slate-400 text-xs">
            Evidência oficial
          </span>
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
            onChange={(event) => setEvidence(event.target.value)}
            value={evidence}
          />
        </label>
        <label>
          <span className="mb-1 block text-slate-400 text-xs">
            Motivo da decisão
          </span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
        </label>
        <button
          className="inline-flex w-fit items-center gap-2 rounded-md bg-blue-500 px-3 py-2 font-semibold text-sm disabled:opacity-50"
          disabled={pending}
          onClick={submit}
          type="button"
        >
          <SaveIcon className="h-4 w-4" />
          Salvar estado
        </button>
        {feedback ? (
          <p aria-live="polite" className="text-slate-300 text-xs">
            {feedback}
          </p>
        ) : null}
      </div>
    </details>
  );
};

export default ReviewSemanticStateForm;
