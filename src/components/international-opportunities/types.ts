export interface Opportunity {
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
  linkOficial: string;
  nivelEnsino: string;
  nome: string;
  pais: string;
  prazoInscricao: string;
  processoInscricao: string;
  requisitosEspecificos: string;
  requisitosIdioma: string;
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
