import type { MasterStatus } from "@/lib/curated-import/master";
import type { StructuredSemanticField } from "@/lib/opportunities-api";

export interface Opportunity {
  applicationLinkStatus?: string | null;
  applicationUrl?: string | null;
  beneficios: string;
  canApply?: boolean | null;
  cidadeEstado: string;
  contato: string;
  curatedStatus?: MasterStatus;
  curatedStatusLabel?: string;
  custos: string;
  custosExtras: string;
  duracao: string;
  etapasSelecao: string;
  faixaEtaria: string;
  id: string;
  imagem: string;
  instituicaoResponsavel: string;
  lastVerifiedAt?: string | null;
  lifecycleStatus?: string | null;
  linkOficial: string;
  modalidade: "Em verificação" | "Híbrido" | "Online" | "Presencial";
  nivelEnsino: string;
  nome: string;
  pais: string;
  prazoInscricao: string;
  program?: boolean;
  requisitos: string;
  requisitosEspecificos: string[];
  semanticFields?: Record<string, StructuredSemanticField>;
  sobre: string;
  taxaAplicacao: string;
  tipo: string;
  verified?: boolean;
}

export interface OpportunitiesFiltros {
  apenasVerificadas: boolean;
  faixaPreco: string[];
  idade: string;
  modalidade: string[];
  nivelEnsino: string[];
  prazo: string;
  taxaAplicacao: string[];
  tipo: string[];
  tipoBolsa: string[];
}
