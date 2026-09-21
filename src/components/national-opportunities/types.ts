export interface Opportunity {
  beneficios: string;
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
  linkOficial: string;
  modalidade: "Online" | "Presencial" | "Híbrido";
  nivelEnsino: string;
  nome: string;
  pais: string;
  prazoInscricao: string;
  requisitos: string;
  requisitosEspecificos: string[];
  sobre: string;
  taxaAplicacao: string;
  tipo: string;
}

export interface OpportunitiesFiltros {
  apenasVerificadas: boolean;
  idade: string;
  modalidade: string[];
  nivelEnsino: string[];
  prazo: string;
  taxaAplicacao: string[];
  tipo: string[];
}
