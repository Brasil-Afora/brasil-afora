import type { StructuredSemanticField } from "@/lib/opportunities-api";

export interface Opportunity {
  applicationLinkStatus?: string | null;
  applicationUrl?: string | null;
  canApply?: boolean | null;
  cidade: string;
  coberturaBolsa: string;
  contato: string;
  custosExtras: string;
  descricao: string;
  duracao: string;
  etapasSelecao: string;
  faixaEtaria: string;
  id: string;
  imagem: string;
  instituicaoResponsavel: string;
  lastVerifiedAt?: string | null;
  lifecycleStatus?: string | null;
  linkOficial: string;
  nivelEnsino: string;
  nome: string;
  pais: string;
  prazoInscricao: string;
  processoInscricao: string;
  requisitosEspecificos: string;
  requisitosIdioma: string;
  semanticFields?: Record<string, StructuredSemanticField>;
  taxaAplicacao: string;
  tipo: string;
  tipoBolsa: string;
}

export interface OpportunitiesFiltros {
  idade: string;
  nivelEnsino: string[];
  pais: string[];
  requisitosIdioma: string[];
  taxaAplicacao: string[];
  tipo: string[];
  tipoBolsa: string[];
}
