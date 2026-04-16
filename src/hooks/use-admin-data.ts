"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useCreateInternationalOpportunityMutation,
  useCreateNationalOpportunityMutation,
  useDeleteInternationalOpportunityMutation,
  useDeleteNationalOpportunityMutation,
  useInternationalOpportunitiesQuery,
  useNationalOpportunitiesQuery,
  useUpdateInternationalOpportunityMutation,
  useUpdateNationalOpportunityMutation,
} from "@/hooks/queries/use-opportunity-queries";
import { useSession } from "@/lib/auth-client";
import type {
  InternationalOpportunity,
  InternationalOpportunityInput,
  NationalOpportunity,
  NationalOpportunityInput,
} from "@/lib/opportunities-api";

interface FeedbackState {
  message: string;
  type: "error" | "success";
}

interface NationalFormState
  extends Omit<NationalOpportunityInput, "requisitosEspecificos"> {
  requisitosEspecificos: string;
}

const initialInternationalForm: InternationalOpportunityInput = {
  cidade: "",
  coberturaBolsa: "",
  contato: "",
  custosExtras: "",
  descricao: "",
  duracao: "",
  etapasSelecao: "",
  faixaEtaria: "",
  imagem: "",
  instituicaoResponsavel: "",
  linkOficial: "",
  nivelEnsino: "",
  nome: "",
  pais: "",
  prazoInscricao: "",
  processoInscricao: "",
  requisitosEspecificos: "",
  requisitosIdioma: "",
  taxaAplicacao: "",
  tipo: "",
  tipoBolsa: "",
};

const initialNationalForm: NationalFormState = {
  beneficios: "",
  cidadeEstado: "",
  contato: "",
  custos: "",
  custosExtras: "",
  duracao: "",
  etapasSelecao: "",
  faixaEtaria: "",
  imagem: "",
  instituicaoResponsavel: "",
  linkOficial: "",
  modalidade: "Online",
  nivelEnsino: "",
  nome: "",
  pais: "Brasil",
  prazoInscricao: "",
  requisitos: "",
  requisitosEspecificos: "",
  sobre: "",
  taxaAplicacao: "",
  tipo: "",
};

const REQUIREMENTS_SPLIT_REGEX = /\r?\n|;|\|/;

const splitRequirements = (value: string): string[] =>
  value
    .split(REQUIREMENTS_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

function useAdminData() {
  const { data: session, isPending: isSessionPending } = useSession();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const internationalQuery = useInternationalOpportunitiesQuery();
  const nationalQuery = useNationalOpportunitiesQuery();

  const createInternationalMutation =
    useCreateInternationalOpportunityMutation();
  const updateInternationalMutation =
    useUpdateInternationalOpportunityMutation();
  const deleteInternationalMutation =
    useDeleteInternationalOpportunityMutation();

  const createNationalMutation = useCreateNationalOpportunityMutation();
  const updateNationalMutation = useUpdateNationalOpportunityMutation();
  const deleteNationalMutation = useDeleteNationalOpportunityMutation();

  const internationalList: InternationalOpportunity[] =
    internationalQuery.data ?? [];
  const nationalList: NationalOpportunity[] = nationalQuery.data ?? [];
  const isLoading = internationalQuery.isPending || nationalQuery.isPending;

  const [internationalForm, setInternationalForm] =
    useState<InternationalOpportunityInput>(initialInternationalForm);
  const [nationalForm, setNationalForm] =
    useState<NationalFormState>(initialNationalForm);

  const [editingInternationalId, setEditingInternationalId] = useState<
    string | null
  >(null);
  const [editingNationalId, setEditingNationalId] = useState<string | null>(
    null
  );

  const isAdmin = useMemo(() => {
    const role = (session?.user as { role?: string } | undefined)?.role;
    return role === "admin";
  }, [session?.user]);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        internationalQuery.refetch(),
        nationalQuery.refetch(),
      ]);
    } catch {
      setFeedback({
        type: "error",
        message: "Nao foi possivel carregar os dados administrativos.",
      });
    }
  }, [internationalQuery, nationalQuery]);

  const resetInternationalForm = useCallback(() => {
    setEditingInternationalId(null);
    setInternationalForm(initialInternationalForm);
  }, []);

  const resetNationalForm = useCallback(() => {
    setEditingNationalId(null);
    setNationalForm(initialNationalForm);
  }, []);

  const handleInternationalChange = useCallback(
    (field: keyof InternationalOpportunityInput, value: string) => {
      setInternationalForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleNationalChange = useCallback(
    (field: keyof NationalFormState, value: string) => {
      setNationalForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleEditInternational = useCallback(
    (item: InternationalOpportunity) => {
      setEditingInternationalId(item.id);
      setInternationalForm({
        cidade: item.cidade,
        coberturaBolsa: item.coberturaBolsa,
        contato: item.contato,
        custosExtras: item.custosExtras,
        descricao: item.descricao,
        duracao: item.duracao,
        etapasSelecao: item.etapasSelecao,
        faixaEtaria: item.faixaEtaria,
        imagem: item.imagem,
        instituicaoResponsavel: item.instituicaoResponsavel,
        linkOficial: item.linkOficial,
        nivelEnsino: item.nivelEnsino,
        nome: item.nome,
        pais: item.pais,
        prazoInscricao: item.prazoInscricao,
        processoInscricao: item.processoInscricao,
        requisitosEspecificos: item.requisitosEspecificos,
        requisitosIdioma: item.requisitosIdioma,
        taxaAplicacao: item.taxaAplicacao,
        tipo: item.tipo,
        tipoBolsa: item.tipoBolsa,
      });
    },
    []
  );

  const handleEditNational = useCallback((item: NationalOpportunity) => {
    setEditingNationalId(item.id);
    setNationalForm({
      beneficios: item.beneficios,
      cidadeEstado: item.cidadeEstado,
      contato: item.contato,
      custos: item.custos,
      custosExtras: item.custosExtras,
      duracao: item.duracao,
      etapasSelecao: item.etapasSelecao,
      faixaEtaria: item.faixaEtaria,
      imagem: item.imagem,
      instituicaoResponsavel: item.instituicaoResponsavel,
      linkOficial: item.linkOficial,
      modalidade: item.modalidade,
      nivelEnsino: item.nivelEnsino,
      nome: item.nome,
      pais: item.pais,
      prazoInscricao: item.prazoInscricao,
      requisitos: item.requisitos,
      requisitosEspecificos: item.requisitosEspecificos.join("\n"),
      sobre: item.sobre,
      taxaAplicacao: item.taxaAplicacao,
      tipo: item.tipo,
    });
  }, []);

  const handleSaveInternational = useCallback(
    async (
      payloadOverride?: InternationalOpportunityInput
    ): Promise<boolean> => {
      const payload = payloadOverride ?? internationalForm;

      try {
        setFeedback(null);
        if (editingInternationalId) {
          await updateInternationalMutation.mutateAsync({
            id: editingInternationalId,
            payload,
          });
          setFeedback({
            type: "success",
            message: "Oportunidade internacional editada com sucesso.",
          });
        } else {
          await createInternationalMutation.mutateAsync(payload);
          setFeedback({
            type: "success",
            message: "Oportunidade internacional adicionada com sucesso.",
          });
        }

        await loadData();
        resetInternationalForm();
        return true;
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel salvar a oportunidade internacional.",
        });
        return false;
      }
    },
    [
      createInternationalMutation,
      editingInternationalId,
      internationalForm,
      loadData,
      resetInternationalForm,
      updateInternationalMutation,
    ]
  );

  const handleSaveNational = useCallback(
    async (payloadOverride?: NationalOpportunityInput): Promise<boolean> => {
      const statePayload: NationalOpportunityInput = {
        ...nationalForm,
        requisitosEspecificos: splitRequirements(
          nationalForm.requisitosEspecificos
        ),
      };
      const payload = payloadOverride ?? statePayload;

      try {
        setFeedback(null);
        if (editingNationalId) {
          await updateNationalMutation.mutateAsync({
            id: editingNationalId,
            payload,
          });
          setFeedback({
            type: "success",
            message: "Oportunidade nacional editada com sucesso.",
          });
        } else {
          await createNationalMutation.mutateAsync(payload);
          setFeedback({
            type: "success",
            message: "Oportunidade nacional adicionada com sucesso.",
          });
        }

        await loadData();
        resetNationalForm();
        return true;
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel salvar a oportunidade nacional.",
        });
        return false;
      }
    },
    [
      createNationalMutation,
      editingNationalId,
      loadData,
      nationalForm,
      resetNationalForm,
      updateNationalMutation,
    ]
  );

  const handleDeleteInternational = useCallback(
    async (id: string) => {
      try {
        await deleteInternationalMutation.mutateAsync(id);
        setFeedback({
          type: "success",
          message: "Oportunidade internacional removida.",
        });
        await loadData();
        if (editingInternationalId === id) {
          resetInternationalForm();
        }
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel excluir a oportunidade internacional.",
        });
      }
    },
    [
      deleteInternationalMutation,
      editingInternationalId,
      loadData,
      resetInternationalForm,
    ]
  );

  const handleDeleteNational = useCallback(
    async (id: string) => {
      try {
        await deleteNationalMutation.mutateAsync(id);
        setFeedback({
          type: "success",
          message: "Oportunidade nacional removida.",
        });
        await loadData();
        if (editingNationalId === id) {
          resetNationalForm();
        }
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel excluir a oportunidade nacional.",
        });
      }
    },
    [deleteNationalMutation, editingNationalId, loadData, resetNationalForm]
  );

  return {
    session,
    isSessionPending,
    isLoading,
    isAdmin,
    feedback,
    setFeedback,
    internationalList,
    nationalList,
    internationalForm,
    nationalForm,
    editingInternationalId,
    editingNationalId,
    handleInternationalChange,
    handleNationalChange,
    handleEditInternational,
    handleEditNational,
    handleSaveInternational,
    handleSaveNational,
    handleDeleteInternational,
    handleDeleteNational,
    resetInternationalForm,
    resetNationalForm,
    loadData,
  };
}

export default useAdminData;
export type { FeedbackState, NationalFormState };
export { initialInternationalForm, initialNationalForm };
