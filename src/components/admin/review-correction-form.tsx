"use client";

import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReviewCorrectionFormProps {
  editionId: string;
  evidenceText: string;
  fieldName: string;
  previousPublicationVersionId: string;
  reviewTaskId: string;
  sourceDocumentId: string;
  suggestedValue: unknown;
}

const displayValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.join("\n");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

const ARRAY_CORRECTION_FIELDS = new Set([
  "categories",
  "education_levels",
  "eligibility",
]);
const NULLABLE_CORRECTION_FIELDS = new Set([
  "application_deadline",
  "application_url",
  "cost",
  "currency",
  "end_date",
  "image_url",
  "location",
  "organizer",
  "start_date",
]);

const correctionValue = (
  input: string,
  original: unknown,
  fieldName: string
): unknown => {
  if (NULLABLE_CORRECTION_FIELDS.has(fieldName) && input.trim().length === 0) {
    return null;
  }
  if (ARRAY_CORRECTION_FIELDS.has(fieldName)) {
    return input
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof original === "boolean") {
    return input.trim().toLowerCase() === "true";
  }
  return input.trim();
};

const ReviewCorrectionForm = ({
  editionId,
  evidenceText,
  fieldName,
  previousPublicationVersionId,
  reviewTaskId,
  sourceDocumentId,
  suggestedValue,
}: ReviewCorrectionFormProps) => {
  const router = useRouter();
  const [value, setValue] = useState(displayValue(suggestedValue));
  const [evidence, setEvidence] = useState(evidenceText);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async () => {
    if (
      (value.trim().length === 0 &&
        !NULLABLE_CORRECTION_FIELDS.has(fieldName)) ||
      evidence.trim().length < 3 ||
      reason.trim().length < 3
    ) {
      setFeedback(
        "Informe o valor corrigido, o trecho da fonte e a justificativa."
      );
      return;
    }
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/v1/editions/${editionId}/corrections`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contract_version: "1.0",
            idempotency_key: crypto.randomUUID(),
            review_task_id: reviewTaskId,
            edition_id: editionId,
            field_name: fieldName,
            corrected_value: correctionValue(value, suggestedValue, fieldName),
            correction_reason: reason.trim(),
            evidence_text: evidence.trim(),
            evidence_locator: null,
            source_document_id: sourceDocumentId,
            previous_publication_version_id: previousPublicationVersionId,
          }),
        }
      );
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? "Não foi possível salvar a correção."
        );
      }
      setFeedback(
        "Correção preservada como nova asserção. Uma nova versão aguarda aprovação."
      );
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a correção."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
      <label>
        <span className="mb-1 block font-medium text-blue-200 text-xs">
          Valor corrigido
        </span>
        <textarea
          className="min-h-16 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm outline-none focus:border-blue-400"
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
        {NULLABLE_CORRECTION_FIELDS.has(fieldName) ? (
          <span className="mt-1 block text-slate-400 text-xs">
            Deixe vazio para remover um valor incorreto.
          </span>
        ) : null}
      </label>
      <label>
        <span className="mb-1 block font-medium text-blue-200 text-xs">
          Trecho da fonte que comprova a correção
        </span>
        <textarea
          className="min-h-20 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm outline-none focus:border-blue-400"
          onChange={(event) => setEvidence(event.target.value)}
          value={evidence}
        />
      </label>
      <label>
        <span className="mb-1 block font-medium text-blue-200 text-xs">
          Por que a fonte anterior estava incorreta?
        </span>
        <input
          className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm outline-none focus:border-blue-400"
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </label>
      <button
        className="inline-flex w-fit items-center gap-2 rounded-md bg-blue-500 px-3 py-2 font-semibold text-sm text-white disabled:opacity-50"
        disabled={pending}
        onClick={submit}
        type="button"
      >
        <SaveIcon className="h-4 w-4" />
        Salvar correção com evidência
      </button>
      {feedback ? (
        <p aria-live="polite" className="text-slate-300 text-xs">
          {feedback}
        </p>
      ) : null}
    </div>
  );
};

export default ReviewCorrectionForm;
