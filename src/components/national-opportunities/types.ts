import type { StructuredSemanticField } from "@/lib/opportunities-api";

export interface Opportunity {
  applicationLinkStatus?: string | null;
  applicationUrl?: string | null;
  beneficios: string;
  canApply?: boolean | null;
  cidadeEstado: string;
  contato: string;
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
  requisitos: string;
  requisitosEspecificos: string[];
  semanticFields?: Record<string, StructuredSemanticField>;
  sobre: string;
  taxaAplicacao: string;
  tipo: string;
}

export interface OpportunitiesFiltros {
  idade: string;
  modalidade: string[];
  nivelEnsino: string[];
  taxaAplicacao: string[];
  tipo: string[];
}
