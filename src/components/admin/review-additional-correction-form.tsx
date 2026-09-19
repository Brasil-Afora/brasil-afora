"use client";

import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface AdditionalCorrectionField {
  fieldName: string;
  label: string;
  value: unknown;
}

interface ReviewAdditionalCorrectionFormProps {
  editionId: string;
  evidenceText: string;
  fields: AdditionalCorrectionField[];
  previousPublicationVersionId: string;
  sourceDocumentId: string;
}

const ARRAY_FIELDS = new Set(["categories", "education_levels", "eligibility"]);
const NULLABLE_FIELDS = new Set([
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

const displayValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.join("\n");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

const normalizedValue = (
  input: string,
  fieldName: string,
  original: unknown
): unknown => {
  if (NULLABLE_FIELDS.has(fieldName) && input.trim().length === 0) {
    return null;
  }
  if (ARRAY_FIELDS.has(fieldName)) {
    return input
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (fieldName === "is_free" || typeof original === "boolean") {
    return input.trim().toLowerCase() === "true";
  }
  return input.trim();
};

const ReviewAdditionalCorrectionForm = ({
  editionId,
  evidenceText,
  fields,
  previousPublicationVersionId,
  sourceDocumentId,
}: ReviewAdditionalCorrectionFormProps) => {
  const router = useRouter();
  const firstField = fields[0];
  const [fieldName, setFieldName] = useState(firstField?.fieldName ?? "");
  const selectedField = useMemo(
    () => fields.find((field) => field.fieldName === fieldName) ?? firstField,
    [fieldName, fields, firstField]
  );
  const [value, setValue] = useState(displayValue(firstField?.value));
  const [evidence, setEvidence] = useState(evidenceText);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectField = (nextFieldName: string) => {
    const nextField = fields.find((field) => field.fieldName === nextFieldName);
    setFieldName(nextFieldName);
    setValue(displayValue(nextField?.value));
    setFeedback(null);
  };

  const submit = async () => {
    if (
      !selectedField ||
      (value.trim().length === 0 &&
        !NULLABLE_FIELDS.has(selectedField.fieldName)) ||
      evidence.trim().length < 3 ||
      reason.trim().length < 3
    ) {
      setFeedback(
        "Selecione o campo e informe valor, trecho da fonte e justificativa."
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
            review_task_id: null,
            edition_id: editionId,
            field_name: selectedField.fieldName,
            corrected_value: normalizedValue(
              value,
              selectedField.fieldName,
              selectedField.value
            ),
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
      setFeedback("Correção salva em uma nova versão para aprovação.");
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

  if (!firstField) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <label>
        <span className="mb-1 block font-medium text-blue-200 text-xs">
          Campo
        </span>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm outline-none focus:border-blue-400"
          onChange={(event) => selectField(event.target.value)}
          value={fieldName}
        >
          {fields.map((field) => (
            <option key={field.fieldName} value={field.fieldName}>
              {field.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block font-medium text-blue-200 text-xs">
          Valor correto
        </span>
        <textarea
          className="min-h-20 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm outline-none focus:border-blue-400"
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
        {selectedField && NULLABLE_FIELDS.has(selectedField.fieldName) ? (
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
          Justificativa
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
        Salvar outra correção
      </button>
      {feedback ? (
        <p aria-live="polite" className="text-slate-300 text-xs">
          {feedback}
        </p>
      ) : null}
    </div>
  );
};

export default ReviewAdditionalCorrectionForm;
