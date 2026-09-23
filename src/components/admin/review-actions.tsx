"use client";

import { ArchiveIcon, CheckIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReviewActionsProps {
  editionId: string;
  publicationVersion: number;
}

type DecisionAction = "approve" | "archive" | "reject";

const ACTION_LABELS: Record<DecisionAction, string> = {
  approve: "Aprovar",
  archive: "Arquivar",
  reject: "Rejeitar",
};

const ReviewActions = ({
  editionId,
  publicationVersion,
}: ReviewActionsProps) => {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pendingAction, setPendingAction] = useState<DecisionAction | null>(
    null
  );
  const [recrawlPending, setRecrawlPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const decide = async (action: DecisionAction) => {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) {
      setFeedback("Registre uma justificativa curta antes da decisão.");
      return;
    }
    setPendingAction(action);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/v1/editions/${editionId}/publication-decisions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contract_version: "1.0",
            idempotency_key: crypto.randomUUID(),
            action,
            reason: normalizedReason,
            expected_publication_version: publicationVersion,
          }),
        }
      );
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? "Não foi possível registrar a decisão."
        );
      }
      setFeedback(
        action === "approve"
          ? "Aprovação registrada e enviada para a fila de publicação."
          : `${ACTION_LABELS[action]} registrado.`
      );
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a decisão."
      );
    } finally {
      setPendingAction(null);
    }
  };

  const requestRecrawl = async () => {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) {
      setFeedback(
        "Explique brevemente por que esta edição deve ser recapturada."
      );
      return;
    }
    setRecrawlPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/v1/editions/${editionId}/recrawls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          reason: normalizedReason,
        }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? "Não foi possível solicitar a recaptura."
        );
      }
      setFeedback("Recaptura priorizada para a fonte e o link de inscrição.");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível solicitar a recaptura."
      );
    } finally {
      setRecrawlPending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <label className="block">
        <span className="mb-1 block font-medium text-slate-200 text-sm">
          Justificativa da decisão
        </span>
        <textarea
          className="min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-amber-500"
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ex.: edital, prazo e formulário oficial conferidos."
          value={reason}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 text-sm disabled:opacity-50"
          disabled={pendingAction !== null}
          onClick={() => decide("approve")}
          type="button"
        >
          <CheckIcon className="h-4 w-4" />
          Aprovar
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-4 py-2 font-semibold text-red-300 text-sm ring-1 ring-red-500/40 disabled:opacity-50"
          disabled={pendingAction !== null}
          onClick={() => decide("reject")}
          type="button"
        >
          <XIcon className="h-4 w-4" />
          Rejeitar
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-200 text-sm disabled:opacity-50"
          disabled={pendingAction !== null}
          onClick={() => decide("archive")}
          type="button"
        >
          <ArchiveIcon className="h-4 w-4" />
          Arquivar
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500/15 px-4 py-2 font-semibold text-blue-300 text-sm ring-1 ring-blue-500/40 disabled:opacity-50"
          disabled={pendingAction !== null || recrawlPending}
          onClick={requestRecrawl}
          type="button"
        >
          <RefreshCwIcon
            className={`h-4 w-4 ${recrawlPending ? "animate-spin" : ""}`}
          />
          Solicitar recaptura
        </button>
      </div>
      {feedback ? (
        <p aria-live="polite" className="text-slate-300 text-sm">
          {feedback}
        </p>
      ) : null}
    </div>
  );
};

export default ReviewActions;
