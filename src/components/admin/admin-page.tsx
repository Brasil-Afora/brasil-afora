"use client";

import { ShieldUserIcon } from "lucide-react";
import { useState } from "react";
import useAdminData, {
  type NationalFormState,
} from "../../hooks/use-admin-data";
import type {
  InternationalOpportunityInput,
  NationalOpportunityInput,
} from "../../lib/opportunities-api";
import { FILTER_OPTIONS } from "../opportunities/filter-options";
import ConfirmationModal from "../ui/confirmation-modal";
import AdminFeedback from "./admin-feedback";
import AdminOpportunityForm from "./admin-opportunity-form";
import AdminRecordsList from "./admin-records-list";
import AdminTabs, { type AdminTab } from "./admin-tabs";

type FormMode = "campos" | "texto";
type ParsedTextInput = Record<string, string>;

interface PendingDelete {
  id: string;
  type: AdminTab;
}

const INTERNATIONAL_FIELDS = [
  { key: "nome", label: "Nome" },
  { key: "imagem", label: "Imagem (URL)" },
  { key: "pais", label: "Pais" },
  { key: "cidade", label: "Cidade" },
  { key: "instituicaoResponsavel", label: "Instituicao" },
  { key: "tipo", label: "Tipo" },
  { key: "nivelEnsino", label: "Nivel de ensino" },
  { key: "faixaEtaria", label: "Faixa etaria" },
  { key: "requisitosIdioma", label: "Requisitos de idioma" },
  { key: "taxaAplicacao", label: "Taxa de aplicacao" },
  { key: "tipoBolsa", label: "Tipo de bolsa" },
  { key: "coberturaBolsa", label: "Cobertura da bolsa" },
  { key: "custosExtras", label: "Custos extras" },
  { key: "duracao", label: "Duracao" },
  { key: "prazoInscricao", label: "Prazo (dd/mm/aaaa)" },
  { key: "etapasSelecao", label: "Etapas de selecao" },
  { key: "processoInscricao", label: "Processo de inscricao" },
  { key: "linkOficial", label: "Link oficial" },
  { key: "contato", label: "Contato" },
];

const INTERNATIONAL_TEXTAREA_FIELDS = [
  { key: "descricao", label: "Descricao" },
  { key: "requisitosEspecificos", label: "Requisitos especificos" },
];

const NATIONAL_FIELDS = [
  { key: "nome", label: "Nome" },
  { key: "imagem", label: "Imagem (URL)" },
  { key: "pais", label: "Pais" },
  { key: "tipo", label: "Tipo" },
  { key: "nivelEnsino", label: "Nivel de ensino" },
  { key: "modalidade", label: "Modalidade" },
  { key: "prazoInscricao", label: "Prazo (dd/mm/aaaa)" },
  { key: "duracao", label: "Duracao" },
  { key: "cidadeEstado", label: "Cidade/Estado" },
  { key: "faixaEtaria", label: "Faixa etaria" },
  { key: "instituicaoResponsavel", label: "Instituicao" },
  { key: "taxaAplicacao", label: "Taxa de aplicacao" },
  { key: "beneficios", label: "Beneficios" },
  { key: "custos", label: "Custos" },
  { key: "custosExtras", label: "Custos extras" },
  { key: "etapasSelecao", label: "Etapas de selecao" },
  { key: "linkOficial", label: "Link oficial" },
  { key: "contato", label: "Contato" },
];

const NATIONAL_TEXTAREA_FIELDS = [
  { key: "sobre", label: "Sobre" },
  { key: "requisitos", label: "Requisitos" },
  {
    key: "requisitosEspecificos",
    label: "Requisitos especificos (um por linha)",
  },
];

const REQUIREMENTS_SPLIT_REGEX = /\r?\n|;|\|/;
const MODALIDADE_HIBRIDO_REGEX = /h[ií]brido|misto/;
const MODALIDADE_PRESENCIAL_REGEX = /presencial/;
const MODALIDADE_ONLINE_REGEX = /online|remoto|ead/;

const TEXT_KEY_MAP: Record<string, string> = {
  nome: "nome",
  imagem: "imagem",
  pais: "pais",
  cidade: "cidade",
  cidadeestado: "cidadeEstado",
  instituicao: "instituicaoResponsavel",
  instituicaoresponsavel: "instituicaoResponsavel",
  tipo: "tipo",
  nivelensino: "nivelEnsino",
  nivel: "nivelEnsino",
  faixaetaria: "faixaEtaria",
  idade: "faixaEtaria",
  requisitosidioma: "requisitosIdioma",
  idioma: "requisitosIdioma",
  taxaaplicacao: "taxaAplicacao",
  taxa: "taxaAplicacao",
  tipobolsa: "tipoBolsa",
  bolsa: "tipoBolsa",
  coberturaabolsa: "coberturaBolsa",
  cobertura: "coberturaBolsa",
  custosextras: "custosExtras",
  custos: "custos",
  duracao: "duracao",
  prazoinscricao: "prazoInscricao",
  prazo: "prazoInscricao",
  etapasselecao: "etapasSelecao",
  etapas: "etapasSelecao",
  processoinscricao: "processoInscricao",
  processo: "processoInscricao",
  linkoficial: "linkOficial",
  link: "linkOficial",
  site: "linkOficial",
  contato: "contato",
  email: "contato",
  descricao: "descricao",
  sobre: "sobre",
  descricaobreve: "descricaoBreve",
  requisitos: "requisitos",
  requisitosespecificos: "requisitosEspecificos",
  modalidade: "modalidade",
  beneficios: "beneficios",
};

const normalizeTextKey = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
};

const parseTextInput = (text: string): ParsedTextInput => {
  const result: ParsedTextInput = {};
  const lines = text.split("\n");
  let currentKey = "";
  let currentValue = "";

  const flushCurrentValue = () => {
    if (currentKey && currentValue) {
      result[currentKey] = currentValue.trim();
    }
  };

  const appendToCurrentValue = (line: string) => {
    if (currentKey) {
      currentValue += `\n${line}`;
    }
  };

  for (const line of lines) {
    const colonIndex = line.indexOf(":");

    if (colonIndex <= 0) {
      if (line.trim()) {
        appendToCurrentValue(line);
      }
      continue;
    }

    const normalizedKey = normalizeTextKey(line.slice(0, colonIndex));
    const mappedKey = TEXT_KEY_MAP[normalizedKey];

    if (!mappedKey) {
      appendToCurrentValue(line);
      continue;
    }

    flushCurrentValue();
    currentKey = mappedKey;
    currentValue = line.slice(colonIndex + 1).trim();
  }

  flushCurrentValue();

  return result;
};

const toKeyValueText = (entries: Array<{ key: string; value: string }>) => {
  return entries
    .filter(({ value }) => value.trim().length > 0)
    .map(({ key, value }) => `${key}: ${value}`)
    .join("\n");
};

const buildInternationalTextInput = (data: InternationalOpportunityInput) =>
  toKeyValueText([
    { key: "nome", value: data.nome },
    { key: "imagem", value: data.imagem },
    { key: "pais", value: data.pais },
    { key: "cidade", value: data.cidade },
    { key: "instituicaoResponsavel", value: data.instituicaoResponsavel },
    { key: "tipo", value: data.tipo },
    { key: "nivelEnsino", value: data.nivelEnsino },
    { key: "faixaEtaria", value: data.faixaEtaria },
    { key: "requisitosIdioma", value: data.requisitosIdioma },
    { key: "taxaAplicacao", value: data.taxaAplicacao },
    { key: "tipoBolsa", value: data.tipoBolsa },
    { key: "coberturaBolsa", value: data.coberturaBolsa },
    { key: "custosExtras", value: data.custosExtras },
    { key: "duracao", value: data.duracao },
    { key: "prazoInscricao", value: data.prazoInscricao },
    { key: "etapasSelecao", value: data.etapasSelecao },
    { key: "processoInscricao", value: data.processoInscricao },
    { key: "linkOficial", value: data.linkOficial },
    { key: "contato", value: data.contato },
    { key: "descricao", value: data.descricao },
    { key: "requisitosEspecificos", value: data.requisitosEspecificos },
  ]);

const buildNationalTextInput = (
  data:
    | NationalOpportunityInput
    | (Omit<NationalOpportunityInput, "requisitosEspecificos"> & {
        requisitosEspecificos: string;
      })
) => {
  const requisitosEspecificos = Array.isArray(data.requisitosEspecificos)
    ? data.requisitosEspecificos.join("\n")
    : data.requisitosEspecificos;

  return toKeyValueText([
    { key: "nome", value: data.nome },
    { key: "imagem", value: data.imagem },
    { key: "pais", value: data.pais },
    { key: "tipo", value: data.tipo },
    { key: "nivelEnsino", value: data.nivelEnsino },
    { key: "modalidade", value: data.modalidade },
    { key: "prazoInscricao", value: data.prazoInscricao },
    { key: "duracao", value: data.duracao },
    { key: "cidadeEstado", value: data.cidadeEstado },
    { key: "faixaEtaria", value: data.faixaEtaria },
    { key: "instituicaoResponsavel", value: data.instituicaoResponsavel },
    { key: "taxaAplicacao", value: data.taxaAplicacao },
    { key: "beneficios", value: data.beneficios },
    { key: "custos", value: data.custos },
    { key: "custosExtras", value: data.custosExtras },
    { key: "etapasSelecao", value: data.etapasSelecao },
    { key: "linkOficial", value: data.linkOficial },
    { key: "contato", value: data.contato },
    { key: "sobre", value: data.sobre },
    { key: "requisitos", value: data.requisitos },
    { key: "requisitosEspecificos", value: requisitosEspecificos },
  ]);
};

const withParsedFallback = (value: string | undefined, fallback: string) => {
  return value ?? fallback;
};

const buildInternationalPayload = (
  parsed: ParsedTextInput,
  base: InternationalOpportunityInput
): InternationalOpportunityInput => ({
  nome: withParsedFallback(parsed.nome, base.nome),
  imagem: withParsedFallback(parsed.imagem, base.imagem),
  pais: withParsedFallback(parsed.pais, base.pais),
  cidade: withParsedFallback(parsed.cidade, base.cidade),
  instituicaoResponsavel: withParsedFallback(
    parsed.instituicaoResponsavel,
    base.instituicaoResponsavel
  ),
  tipo: withParsedFallback(parsed.tipo, base.tipo),
  nivelEnsino: withParsedFallback(parsed.nivelEnsino, base.nivelEnsino),
  faixaEtaria: withParsedFallback(parsed.faixaEtaria, base.faixaEtaria),
  requisitosIdioma: withParsedFallback(
    parsed.requisitosIdioma,
    base.requisitosIdioma
  ),
  taxaAplicacao: withParsedFallback(parsed.taxaAplicacao, base.taxaAplicacao),
  tipoBolsa: withParsedFallback(parsed.tipoBolsa, base.tipoBolsa),
  coberturaBolsa: withParsedFallback(
    parsed.coberturaBolsa,
    base.coberturaBolsa
  ),
  custosExtras: withParsedFallback(parsed.custosExtras, base.custosExtras),
  duracao: withParsedFallback(parsed.duracao, base.duracao),
  prazoInscricao: withParsedFallback(
    parsed.prazoInscricao,
    base.prazoInscricao
  ),
  etapasSelecao: withParsedFallback(parsed.etapasSelecao, base.etapasSelecao),
  processoInscricao: withParsedFallback(
    parsed.processoInscricao,
    base.processoInscricao
  ),
  linkOficial: withParsedFallback(parsed.linkOficial, base.linkOficial),
  contato: withParsedFallback(parsed.contato, base.contato),
  descricao: withParsedFallback(parsed.descricao, base.descricao),
  requisitosEspecificos: withParsedFallback(
    parsed.requisitosEspecificos,
    base.requisitosEspecificos
  ),
});

const normalizeNationalModality = (
  rawValue: string | undefined,
  fallback: NationalOpportunityInput["modalidade"]
): NationalOpportunityInput["modalidade"] => {
  if (!rawValue) {
    return fallback;
  }

  const modalidadeLower = rawValue.toLowerCase();

  if (MODALIDADE_HIBRIDO_REGEX.test(modalidadeLower)) {
    return "Híbrido";
  }

  if (MODALIDADE_PRESENCIAL_REGEX.test(modalidadeLower)) {
    return "Presencial";
  }

  if (MODALIDADE_ONLINE_REGEX.test(modalidadeLower)) {
    return "Online";
  }

  return fallback;
};

const buildNationalPayload = (
  parsed: ParsedTextInput,
  base: NationalFormState
): NationalOpportunityInput => {
  const modalidade = normalizeNationalModality(
    parsed.modalidade,
    base.modalidade
  );
  const rawRequisitosEspecificos =
    parsed.requisitosEspecificos ?? base.requisitosEspecificos;

  return {
    nome: parsed.nome ?? base.nome,
    imagem: parsed.imagem ?? base.imagem,
    pais: parsed.pais ?? base.pais,
    tipo: parsed.tipo ?? base.tipo,
    nivelEnsino: parsed.nivelEnsino ?? base.nivelEnsino,
    modalidade,
    prazoInscricao: parsed.prazoInscricao ?? base.prazoInscricao,
    duracao: parsed.duracao ?? base.duracao,
    cidadeEstado: parsed.cidadeEstado ?? parsed.cidade ?? base.cidadeEstado,
    faixaEtaria: parsed.faixaEtaria ?? base.faixaEtaria,
    instituicaoResponsavel:
      parsed.instituicaoResponsavel ?? base.instituicaoResponsavel,
    taxaAplicacao: parsed.taxaAplicacao ?? base.taxaAplicacao,
    beneficios: parsed.beneficios ?? base.beneficios,
    custos: parsed.custos ?? base.custos,
    custosExtras: parsed.custosExtras ?? base.custosExtras,
    etapasSelecao: parsed.etapasSelecao ?? base.etapasSelecao,
    linkOficial: parsed.linkOficial ?? base.linkOficial,
    contato: parsed.contato ?? base.contato,
    sobre: parsed.sobre ?? parsed.descricao ?? base.sobre,
    requisitos: parsed.requisitos ?? base.requisitos,
    requisitosEspecificos: rawRequisitosEspecificos
      .split(REQUIREMENTS_SPLIT_REGEX)
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  };
};

const AdminPage = () => {
  const {
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
  } = useAdminData();

  const [activeTab, setActiveTab] = useState<AdminTab>("internacional");
  const [formMode, setFormMode] = useState<FormMode>("campos");
  const [jsonInput, setJsonInput] = useState("");
  const [activeInternationalRecordId, setActiveInternationalRecordId] =
    useState<string | null>(null);
  const [activeNationalRecordId, setActiveNationalRecordId] = useState<
    string | null
  >(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );

  const editingInternationalName = editingInternationalId
    ? (internationalList.find((item) => item.id === editingInternationalId)
        ?.nome ?? null)
    : null;

  const editingNationalName = editingNationalId
    ? (nationalList.find((item) => item.id === editingNationalId)?.nome ?? null)
    : null;

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setJsonInput("");
  };

  const handleResetInternational = () => {
    resetInternationalForm();
    setFormMode("campos");
    setJsonInput("");
    setActiveInternationalRecordId(null);
  };

  const handleResetNational = () => {
    resetNationalForm();
    setFormMode("campos");
    setJsonInput("");
    setActiveNationalRecordId(null);
  };

  const handleSaveFieldsInternational = async (
    values?: Record<string, string>
  ) => {
    const payload = values
      ? buildInternationalPayload(values, internationalForm)
      : internationalForm;
    const didSave = await handleSaveInternational(payload);

    if (didSave) {
      setJsonInput("");
      setActiveInternationalRecordId(null);
    }
  };

  const handleSaveFieldsNational = async (values?: Record<string, string>) => {
    const payload = values
      ? buildNationalPayload(values, nationalForm)
      : buildNationalPayload({}, nationalForm);
    const didSave = await handleSaveNational(payload);

    if (didSave) {
      setJsonInput("");
      setActiveNationalRecordId(null);
    }
  };

  const handleSaveTextInternational = async () => {
    try {
      setFeedback(null);
      const parsed = parseTextInput(jsonInput);

      const formData = buildInternationalPayload(parsed, internationalForm);

      for (const [key, value] of Object.entries(formData)) {
        handleInternationalChange(
          key as keyof InternationalOpportunityInput,
          value
        );
      }

      const didSave = await handleSaveInternational(formData);

      if (didSave) {
        setJsonInput("");
        setActiveInternationalRecordId(null);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? `Erro ao processar texto: ${error.message}`
            : "Erro ao processar o texto. Verifique o formato.",
      });
    }
  };

  const handleSaveTextNational = async () => {
    try {
      setFeedback(null);
      const parsed = parseTextInput(jsonInput);

      const payload = buildNationalPayload(parsed, nationalForm);

      const didSave = await handleSaveNational(payload);

      if (didSave) {
        setJsonInput("");
        setActiveNationalRecordId(null);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? `Erro ao processar texto: ${error.message}`
            : "Erro ao processar o texto. Verifique o formato.",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    const { id, type } = pendingDelete;
    setPendingDelete(null);

    if (type === "internacional") {
      await handleDeleteInternational(id);
      return;
    }

    await handleDeleteNational(id);
  };

  if (isSessionPending || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
        Carregando painel administrativo...
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
        Sessao invalida. Faca login novamente.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 text-center text-white">
        <div className="max-w-xl rounded-xl border border-red-500/40 bg-red-950/30 p-6">
          <h1 className="mb-2 font-bold text-2xl text-red-300">
            Acesso negado
          </h1>
          <p>Somente usuarios administradores podem acessar esta pagina.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 font-inter text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-3">
          <ShieldUserIcon className="h-8 w-8 text-amber-500" />
          <h1 className="font-bold text-3xl text-amber-500">
            Painel Administrativo
          </h1>
        </div>

        <AdminTabs activeTab={activeTab} onTabChange={handleTabChange} />
        <AdminFeedback feedback={feedback} />

        {activeTab === "internacional" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AdminRecordsList
              accentColor="blue"
              activeId={activeInternationalRecordId}
              items={internationalList.map((item) => ({
                id: item.id,
                name: item.nome,
                subtitle: item.pais,
              }))}
              onDelete={(id) =>
                setPendingDelete({
                  id,
                  type: "internacional",
                })
              }
              onEdit={(id) => {
                const item = internationalList.find((i) => i.id === id);
                if (item) {
                  setActiveInternationalRecordId(id);
                  handleEditInternational(item);
                  setJsonInput(
                    buildInternationalTextInput({
                      nome: item.nome,
                      imagem: item.imagem,
                      pais: item.pais,
                      cidade: item.cidade,
                      instituicaoResponsavel: item.instituicaoResponsavel,
                      tipo: item.tipo,
                      nivelEnsino: item.nivelEnsino,
                      faixaEtaria: item.faixaEtaria,
                      requisitosIdioma: item.requisitosIdioma,
                      taxaAplicacao: item.taxaAplicacao,
                      tipoBolsa: item.tipoBolsa,
                      coberturaBolsa: item.coberturaBolsa,
                      custosExtras: item.custosExtras,
                      duracao: item.duracao,
                      prazoInscricao: item.prazoInscricao,
                      etapasSelecao: item.etapasSelecao,
                      processoInscricao: item.processoInscricao,
                      linkOficial: item.linkOficial,
                      contato: item.contato,
                      descricao: item.descricao,
                      requisitosEspecificos: item.requisitosEspecificos,
                    })
                  );
                }
              }}
              title="Registros"
            />

            <AdminOpportunityForm
              accentColor="blue"
              editingId={editingInternationalId}
              editingName={editingInternationalName}
              fields={INTERNATIONAL_FIELDS}
              filterOptions={{
                nivelEnsino: [...FILTER_OPTIONS.niveisEnsino],
                pais: [...FILTER_OPTIONS.paises],
                requisitosIdioma: [...FILTER_OPTIONS.requisitosIdioma],
                taxaAplicacao: [...FILTER_OPTIONS.taxaAplicacao],
                tipo: [...FILTER_OPTIONS.tiposProgramaInternacional],
                tipoBolsa: [...FILTER_OPTIONS.tipoBolsa],
              }}
              formData={internationalForm as unknown as Record<string, string>}
              formMode={formMode}
              jsonInput={jsonInput}
              onCopyTemplate={() => {
                setFeedback({
                  type: "success",
                  message: "Template copiado para a area de transferencia.",
                });
              }}
              onFormChange={(key, value) =>
                handleInternationalChange(
                  key as keyof InternationalOpportunityInput,
                  value
                )
              }
              onJsonInputChange={setJsonInput}
              onReset={handleResetInternational}
              onSave={handleSaveFieldsInternational}
              onSaveText={handleSaveTextInternational}
              setFormMode={setFormMode}
              textareaFields={INTERNATIONAL_TEXTAREA_FIELDS}
              title="Nova Oportunidade"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AdminRecordsList
              accentColor="amber"
              activeId={activeNationalRecordId}
              items={nationalList.map((item) => ({
                id: item.id,
                name: item.nome,
                subtitle: item.cidadeEstado,
              }))}
              onDelete={(id) =>
                setPendingDelete({
                  id,
                  type: "nacional",
                })
              }
              onEdit={(id) => {
                const item = nationalList.find((i) => i.id === id);
                if (item) {
                  setActiveNationalRecordId(id);
                  handleEditNational(item);
                  setJsonInput(buildNationalTextInput(item));
                }
              }}
              title="Registros"
            />

            <AdminOpportunityForm
              accentColor="amber"
              editingId={editingNationalId}
              editingName={editingNationalName}
              fields={NATIONAL_FIELDS}
              filterOptions={{
                modalidade: [...FILTER_OPTIONS.modalidade],
                nivelEnsino: [...FILTER_OPTIONS.niveisEnsino],
                taxaAplicacao: [...FILTER_OPTIONS.taxaAplicacao],
                tipo: [...FILTER_OPTIONS.tiposProgramaNacional],
              }}
              formData={nationalForm as unknown as Record<string, string>}
              formMode={formMode}
              jsonInput={jsonInput}
              onCopyTemplate={() => {
                setFeedback({
                  type: "success",
                  message: "Template copiado para a area de transferencia.",
                });
              }}
              onFormChange={(key, value) =>
                handleNationalChange(key as keyof typeof nationalForm, value)
              }
              onJsonInputChange={setJsonInput}
              onReset={handleResetNational}
              onSave={handleSaveFieldsNational}
              onSaveText={handleSaveTextNational}
              setFormMode={setFormMode}
              textareaFields={NATIONAL_TEXTAREA_FIELDS}
              title="Nova Oportunidade"
            />
          </div>
        )}
      </div>

      <ConfirmationModal
        accentColor={pendingDelete?.type === "internacional" ? "blue" : "amber"}
        confirmText="Sim, excluir"
        isOpen={Boolean(pendingDelete)}
        message={
          pendingDelete?.type === "internacional"
            ? "Deseja realmente excluir esta oportunidade internacional?"
            : "Deseja realmente excluir esta oportunidade nacional?"
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          handleConfirmDelete().catch(() => undefined);
        }}
      />
    </div>
  );
};

export default AdminPage;
