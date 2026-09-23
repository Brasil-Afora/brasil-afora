import type { Program } from "@/components/programs/types";

// Programas e Bolsas: the starter set, entered by hand until the scraper and
// the admin take over. TODO(data): move to a table (or a `categoria` on the
// shared catalog) once the data model is decided; the page reads this list
// only through `src/components/programs/program-model.ts`.
//
// Every record is a real program and links to its official page. Facts were
// taken from the official page or its announcements on `atualizadoEm`; a
// field the source does not state is left out and the page says "Não
// informado". Dates of past rounds stay (they show as "Encerradas" with the
// next edition) because a program outlives its deadline.
//
// Checked 22/09/2026. Re-check dates before publishing: rounds reopen every
// year and the sources move them.

export const PROGRAMS_CHECKED_AT = "22/09/2026";

export const PROGRAMS: Program[] = [
  {
    id: "prep-program-fundacao-estudar",
    nome: "Prep Program",
    instituicaoResponsavel: "Fundação Estudar",
    tipoOrganizacao: "Fundação sem fins lucrativos",
    tipo: "Preparatório",
    resumo:
      "Doze meses de preparação gratuita, com mentores e especialistas, para quem quer fazer graduação fora do Brasil.",
    descricao:
      "O Prep Program é o curso preparatório gratuito da Fundação Estudar para estudantes do ensino médio que querem fazer graduação no exterior. Durante 12 meses, cada participante recebe mais de 200 horas de orientação personalizada em todas as etapas da aplicação: das provas padronizadas às redações e à lista de universidades.\n\nNo ciclo 2024/2025, 97% dos participantes foram aprovados em pelo menos uma instituição. Estudantes do 1º ano do ensino médio podem se inscrever como treineiros.",
    niveis: ["Ensino médio"],
    publico: "Penúltimo ou último ano do ensino médio em 2026",
    beneficios: ["Gratuito", "Preparação", "Mentoria", "Auxílio financeiro"],
    beneficiosDetalhe: [
      "Mais de 200 horas de orientação personalizada ao longo de 12 meses",
      "Revisão de redações e montagem da lista de universidades",
      "Preparação semanal para o SAT e para provas de inglês",
      "Cartas de recomendação personalizadas",
      "Apoio psicológico",
      "Ajuda com taxas de aplicação e atividades extracurriculares, para quem comprovar necessidade",
      "Contato com a rede de bolsistas e ex-participantes da Fundação Estudar",
    ],
    dedicacao:
      "Pelo menos 3 horas por semana de atividades, mais 5 horas de estudo individual",
    duracao: "12 meses",
    modalidade: "Online",
    local: "Online, de qualquer lugar do Brasil",
    destino: ["No exterior"],
    requisitos: [
      "Ser brasileiro",
      "Estar no penúltimo ou no último ano do ensino médio em 2026",
      "Ter inglês excelente",
      "Ter bom desempenho acadêmico ao longo do ensino médio",
      "Ter atividades extracurriculares relevantes",
      "Não ter ingressado em nenhuma universidade",
      "Não participar de outro programa gratuito de preparação para aplicações no exterior",
    ],
    etapasSelecao: [
      "Inscrição online até 01/10/2026: dados pessoais e acadêmicos, atividades extracurriculares, três redações curtas, um vídeo de até 2 minutos em inglês e testes de lógica e de inglês (cerca de 90 minutos)",
      "Entrevista de proficiência em inglês",
      "Entrevista comportamental",
    ],
    inscricoes: { prazoInscricao: "01/10/2026" },
    linkOficial: "https://www.estudarfora.org.br/prep-program/",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "chevening",
    nome: "Bolsas Chevening",
    instituicaoResponsavel: "Governo do Reino Unido",
    tipoOrganizacao: "Programa de bolsas do governo britânico",
    tipo: "Bolsa",
    resumo:
      "Bolsa integral para um mestrado de um ano no Reino Unido, para profissionais com experiência que queiram voltar e atuar no Brasil.",
    descricao:
      "A Chevening é o programa de bolsas de estudo do governo britânico. Financia mestrados de um ano em qualquer universidade do Reino Unido para pessoas com potencial de liderança, de mais de 160 países, incluindo o Brasil.\n\nAs inscrições para as bolsas de 2027–2028 vão até 06/10/2026, às 11h no horário UTC (8h em Brasília).",
    niveis: ["Pós-graduação"],
    publico: "Graduados com experiência de trabalho",
    beneficios: [
      "Bolsa integral",
      "Mensalidade",
      "Viagem",
      "Auxílio financeiro",
    ],
    beneficiosDetalhe: [
      "Mensalidade do mestrado paga",
      "Auxílio mensal para viver no Reino Unido",
      "Passagens de ida e volta",
      "Custo do visto",
    ],
    duracao: "1 ano (mestrado)",
    modalidade: "Presencial",
    local: "Reino Unido",
    pais: "Reino Unido",
    destino: ["No exterior"],
    requisitos: [
      "Ter graduação concluída que permita cursar mestrado no Reino Unido",
      "Ter pelo menos dois anos (2.800 horas) de experiência de trabalho",
      "Candidatar-se a três cursos de mestrado no Reino Unido",
      "Voltar ao Brasil por pelo menos dois anos depois da bolsa",
    ],
    etapasSelecao: [
      "Inscrição online até 06/10/2026, às 8h de Brasília, com redações e a escolha de três cursos",
      "Pré-seleção e entrevista na representação britânica no Brasil",
      "Oferta incondicional de uma das universidades até 08/07/2027",
    ],
    inscricoes: { prazoInscricao: "06/10/2026" },
    datas: [
      { label: "Oferta incondicional da universidade", data: "08/07/2027" },
      { label: "Início do mestrado", data: "setembro/outubro de 2027" },
    ],
    linkOficial: "https://www.chevening.org/scholarship/brazil/",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "brasa-pre",
    nome: "BRASA Pré",
    instituicaoResponsavel: "BRASA",
    tipoOrganizacao: "Associação de estudantes brasileiros no exterior",
    tipo: "Mentoria",
    resumo:
      "Mentoria individual e gratuita com brasileiros que estudam fora, para quem quer fazer graduação ou pós no exterior.",
    descricao:
      "O BRASA Pré é o programa de mentoria da BRASA, a Associação de Estudantes Brasileiros no Exterior, criado em 2015. Cada estudante selecionado é acompanhado por um mentor brasileiro que estuda ou estudou em uma universidade no exterior, em reuniões individuais durante todo o processo de aplicação.\n\nHá cinco trilhas: Fundamentos Graduação (para quem estuda em escola pública ou tem bolsa integral), Graduação Américas, Graduação Europa, Pós-graduação Américas e Pós-graduação Europa.",
    niveis: ["Ensino médio", "Graduação", "Pós-graduação"],
    publico: "2º ou 3º ano do ensino médio, fim da graduação ou recém-formados",
    beneficios: ["Gratuito", "Mentoria", "Preparação", "Auxílio financeiro"],
    beneficiosDetalhe: [
      "Mentoria individual com um estudante brasileiro no exterior",
      "Currículo e cronograma para a aplicação",
      "Encontros em grupo com pós-graduandos, oficiais de admissão e professores",
      "Apoio psicoeducacional",
      "Ajuda de custo para alguns participantes: taxas de aplicação e provas de proficiência (TOEFL, IELTS, DELF)",
    ],
    modalidade: "Online",
    local: "Online",
    destino: ["No exterior"],
    requisitos: [
      "Graduação: estar no 2º ou 3º ano do ensino médio (ou no 3º ano do técnico integrado)",
      "Fundamentos Graduação: estudar em escola pública ou ter bolsa integral em escola particular",
      "Pós-graduação: estar no último ano da graduação ou já ter se formado",
    ],
    etapasSelecao: [
      "Formulário com redações de motivação, descrição de experiências e vídeos",
      "Entrevista online com a equipe da BRASA",
    ],
    inscricoes: { nota: "Turma 2027: datas no site da BRASA" },
    linkOficial: "https://gobrasa.org/mentorias",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "educationusa-oportunidades-academicas",
    nome: "Programa Oportunidades Acadêmicas",
    instituicaoResponsavel: "EducationUSA",
    tipoOrganizacao: "Rede de orientação do Departamento de Estado dos EUA",
    tipo: "Programa de acesso",
    resumo:
      "Orientação e custos do processo de admissão pagos para estudantes de baixa renda que querem estudar nos Estados Unidos.",
    descricao:
      "O Programa Oportunidades Acadêmicas apoia estudantes com excelência acadêmica e inglês fluente que não têm condições de pagar o processo de admissão em universidades americanas. O programa orienta cada participante e cobre os custos do processo seletivo.\n\nHá duas turmas: uma para a graduação e outra para mestrado e doutorado.",
    niveis: ["Ensino médio", "Graduação", "Pós-graduação"],
    publico: "Estudantes de baixa renda com inglês fluente",
    beneficios: ["Gratuito", "Mentoria", "Preparação", "Auxílio financeiro"],
    beneficiosDetalhe: [
      "Orientação acadêmica durante todo o processo de admissão",
      "Custos do processo seletivo das universidades americanas pagos pelo programa",
    ],
    local: "Centros EducationUSA no Brasil",
    pais: "Estados Unidos",
    destino: ["No exterior"],
    requisitos: [
      "Ter excelência acadêmica",
      "Ter inglês fluente",
      "Não ter condições financeiras de arcar com o processo de admissão",
    ],
    etapasSelecao: [],
    inscricoes: {
      nota: "A turma atual já foi selecionada; a próxima é anunciada no site da EducationUSA",
    },
    linkOficial:
      "https://educationusa.org.br/institucional/oportunidades-academicas/",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "ismart-bolsa-talento",
    nome: "Bolsa Talento",
    instituicaoResponsavel: "Ismart",
    tipoOrganizacao: "Instituto sem fins lucrativos",
    tipo: "Bolsa",
    resumo:
      "Bolsa integral para cursar o ensino médio em escolas particulares parceiras, com transporte, alimentação e material.",
    descricao:
      "O Ismart seleciona estudantes de baixa renda com alto desempenho escolar e oferece bolsa integral para o ensino médio em escolas particulares de excelência. Todo o processo seletivo é gratuito.",
    niveis: ["Ensino fundamental"],
    publico: "9º ano do ensino fundamental",
    beneficios: [
      "Bolsa integral",
      "Mensalidade",
      "Gratuito",
      "Auxílio financeiro",
    ],
    beneficiosDetalhe: [
      "Bolsa integral no ensino médio em escola particular parceira",
      "Ajuda para alimentação e transporte",
      "Material didático e uniforme",
      "Cursos de inglês e de tecnologia",
    ],
    modalidade: "Presencial",
    local:
      "Belo Horizonte, Cotia, Rio de Janeiro, São Paulo, São José dos Campos ou Sorocaba",
    destino: ["No Brasil"],
    requisitos: [
      "Estar no 9º ano do ensino fundamental",
      "Ter renda familiar de até dois salários mínimos por pessoa da casa",
      "Morar em uma das cidades atendidas",
    ],
    etapasSelecao: [
      "Inscrição",
      "Avaliações online: raciocínio lógico, questionários e desafio em vídeo",
      "Prova escrita",
      "Análise socioeconômica",
      "Entrevistas com a família e com o estudante",
      "Atividade em grupo (Ideathon ou dinâmica)",
    ],
    inscricoes: {
      nota: "Pré-inscrição aberta no site; o calendário sai a cada ano",
    },
    linkOficial: "https://www.ismart.org.br/processo-seletivo/",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "ismart-online",
    nome: "Ismart Online",
    instituicaoResponsavel: "Ismart",
    tipoOrganizacao: "Instituto sem fins lucrativos",
    tipo: "Formação",
    resumo:
      "Programa digital gratuito de redação, português e matemática para alunos do 7º ao 9º ano de todo o Brasil.",
    descricao:
      "O Ismart Online é a versão digital do programa do Ismart: aulas e atividades de redação, português e matemática para estudantes de baixa renda do 7º ao 9º ano, de qualquer cidade do Brasil.",
    niveis: ["Ensino fundamental"],
    publico: "7º, 8º ou 9º ano do ensino fundamental",
    beneficios: ["Gratuito", "Preparação"],
    beneficiosDetalhe: ["Formação online em redação, português e matemática"],
    modalidade: "Online",
    local: "Online, em todo o Brasil",
    destino: ["No Brasil"],
    requisitos: [
      "Estar no 7º, 8º ou 9º ano do ensino fundamental",
      "Ter renda familiar de até dois salários mínimos por pessoa da casa",
    ],
    etapasSelecao: [],
    inscricoes: {
      nota: "Pré-inscrição aberta no site; o calendário sai a cada ano",
    },
    linkOficial: "https://www.ismart.org.br/processo-seletivo/",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "instituto-ponte",
    nome: "Programa Instituto Ponte",
    instituicaoResponsavel: "Instituto Ponte",
    tipoOrganizacao: "Instituto sem fins lucrativos",
    tipo: "Programa de acesso",
    resumo:
      "Bolsa em escola particular e acompanhamento até o fim da faculdade para estudantes de baixa renda da rede pública.",
    descricao:
      "O Instituto Ponte seleciona estudantes de escola pública com renda baixa e os acompanha por muitos anos: bolsa de estudos em escola particular, curso de inglês, atividades no contraturno e acompanhamento educacional até a conclusão do ensino superior.\n\nEm 2026, a seleção abriu 130 vagas, com inscrições gratuitas até 22 de março.",
    niveis: ["Ensino fundamental", "Ensino médio"],
    publico:
      "Do 7º ano do fundamental à 2ª série do médio, em escola pública ou com bolsa integral",
    beneficios: [
      "Bolsa integral",
      "Gratuito",
      "Mentoria",
      "Auxílio financeiro",
    ],
    beneficiosDetalhe: [
      "Bolsa de estudos em escola particular",
      "Material, uniforme e vale-transporte",
      "Curso de inglês em instituições parceiras",
      "Atividades no contraturno, presenciais e online",
      "Acompanhamento educacional até a conclusão do ensino superior",
    ],
    modalidade: "Híbrido",
    local: "Cidades atendidas pelo instituto (ver edital)",
    destino: ["No Brasil"],
    requisitos: [
      "Estudar em escola pública ou ter bolsa integral em escola particular",
      "Estar entre o 7º ano do fundamental e a 2ª série do médio",
      "Ter renda familiar de até 1,5 salário mínimo por pessoa",
    ],
    etapasSelecao: [],
    inscricoes: {
      prazoInscricao: "22/03/2026",
      previsao: "início de 2027",
    },
    linkOficial: "https://www.institutoponte.org.br/",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "jovens-embaixadores",
    nome: "Jovens Embaixadores",
    instituicaoResponsavel: "Embaixada dos EUA no Brasil",
    tipoOrganizacao: "Programa da Embaixada dos EUA com parceiros",
    tipo: "Intercâmbio",
    resumo:
      "Três semanas nos Estados Unidos, com as despesas pagas, para alunos da rede pública que se destacam como líderes.",
    descricao:
      "O Jovens Embaixadores é uma iniciativa de responsabilidade social da Embaixada dos Estados Unidos no Brasil, em parceria com os setores público e privado dos dois países. Os selecionados passam três semanas nos EUA em atividades de liderança, educação e intercâmbio cultural.\n\nA seleção é feita por comitês estaduais, e as datas mudam de um estado para outro.",
    niveis: ["Ensino médio"],
    publico: "Alunos do ensino médio da rede pública",
    beneficios: ["Gratuito", "Viagem"],
    beneficiosDetalhe: [
      "Viagem de três semanas aos Estados Unidos",
      "Atividades de liderança, educação e intercâmbio cultural",
    ],
    duracao: "3 semanas",
    modalidade: "Presencial",
    local: "Estados Unidos",
    pais: "Estados Unidos",
    destino: ["No exterior"],
    requisitos: ["Estudar no ensino médio da rede pública"],
    etapasSelecao: [
      "Inscrição pelo site do programa",
      "Etapas de seleção do comitê do seu estado",
      "Entrevistas e dinâmicas",
    ],
    inscricoes: {
      nota: "As datas variam por estado; consulte o comitê do seu",
    },
    linkOficial: "https://br.usembassy.gov/youth-ambassador-program/",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "fulbright-doutorado-sanduiche",
    nome: "Doutorado sanduíche Fulbright/CAPES",
    instituicaoResponsavel: "Comissão Fulbright Brasil",
    tipoOrganizacao: "Comissão binacional Brasil–Estados Unidos",
    tipo: "Bolsa",
    resumo:
      "Nove meses de pesquisa nos Estados Unidos, com bolsa mensal, para quem faz doutorado no Brasil.",
    descricao:
      "O programa de doutorado sanduíche da Comissão Fulbright, em parceria com a CAPES, oferece 50 vagas para doutorandos brasileiros passarem nove meses pesquisando em uma instituição nos Estados Unidos.",
    niveis: ["Pós-graduação"],
    publico: "Doutorandos matriculados em programas no Brasil",
    beneficios: ["Auxílio financeiro", "Viagem"],
    beneficiosDetalhe: [
      "Bolsa mensal de até US$ 4.300",
      "Nove meses em uma instituição nos Estados Unidos",
    ],
    duracao: "9 meses",
    modalidade: "Presencial",
    local: "Estados Unidos",
    pais: "Estados Unidos",
    destino: ["No exterior"],
    requisitos: [
      "Ter nacionalidade brasileira",
      "Estar regularmente matriculado em um doutorado no Brasil",
    ],
    etapasSelecao: [
      "Inscrição online até 02/08/2026",
      "Entrevistas em outubro de 2026",
      "Divulgação dos selecionados em novembro de 2026",
    ],
    inscricoes: {
      prazoInscricao: "02/08/2026",
      previsao: "meados de 2027, para a turma de 2028",
    },
    datas: [
      { label: "Entrevistas", data: "outubro de 2026" },
      { label: "Resultado", data: "novembro de 2026" },
      { label: "Início nos EUA", data: "agosto/setembro de 2027" },
    ],
    linkOficial:
      "https://fulbright.org.br/bolsas-para-brasileiros/doutorado-sanduiche-nos-estados-unidos/",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "lideres-estudar",
    nome: "Líderes Estudar",
    instituicaoResponsavel: "Fundação Estudar",
    tipoOrganizacao: "Fundação sem fins lucrativos",
    tipo: "Bolsa",
    resumo:
      "Bolsa de estudos e rede de apoio da Fundação Estudar para universitários e graduados, no Brasil ou no exterior.",
    descricao:
      "O Líderes Estudar é o programa de bolsas da Fundação Estudar. Além do apoio financeiro para os estudos, os selecionados entram na rede de bolsistas da fundação.\n\nA turma de 2026 foi aprovada em agosto de 2026. A seleção costuma abrir no primeiro semestre: em 2025, as inscrições foram até 6 de abril.",
    niveis: ["Graduação", "Pós-graduação"],
    publico: "Universitários e graduados",
    beneficios: ["Auxílio financeiro", "Mentoria"],
    beneficiosDetalhe: [
      "Apoio financeiro para os estudos",
      "Entrada na rede de bolsistas da Fundação Estudar",
    ],
    local: "Brasil ou exterior",
    destino: ["No Brasil", "No exterior"],
    requisitos: [],
    etapasSelecao: [],
    inscricoes: { previsao: "primeiro semestre de 2027" },
    linkOficial: "https://www.estudar.org.br/lideres/",
    atualizadoEm: "22/09/2026",
  },
  {
    id: "prouni",
    nome: "Prouni",
    instituicaoResponsavel: "Ministério da Educação",
    tipoOrganizacao: "Governo federal",
    tipo: "Bolsa",
    resumo:
      "Bolsa integral ou parcial da mensalidade em faculdades particulares, pela nota do Enem.",
    descricao:
      "O Programa Universidade para Todos (Prouni) oferece bolsas integrais (100%) e parciais (50%) em cursos de graduação de faculdades particulares. A seleção usa a nota do Enem e acontece duas vezes por ano, uma para cada semestre.",
    niveis: ["Graduação"],
    publico: "Quem fez o Enem e estudou o ensino médio na rede pública",
    beneficios: ["Bolsa integral", "Bolsa parcial", "Mensalidade"],
    beneficiosDetalhe: [
      "Bolsa integral (100%) ou parcial (50%) da mensalidade",
      "Cursos de graduação em faculdades particulares de todo o Brasil",
    ],
    local: "Faculdades particulares em todo o Brasil",
    destino: ["No Brasil"],
    requisitos: [
      "Ter feito o Enem com média de pelo menos 450 pontos e nota acima de zero na redação",
      "Ter cursado o ensino médio na rede pública ou em escola particular com bolsa integral",
      "Bolsa integral: renda familiar de até 1,5 salário mínimo por pessoa",
      "Bolsa parcial: renda familiar de até 3 salários mínimos por pessoa",
    ],
    etapasSelecao: [
      "Fazer o Enem",
      "Inscrição no Prouni pelo Acesso Único do MEC, com até duas opções de curso",
      "Resultado em chamadas e comprovação das informações na faculdade",
    ],
    inscricoes: {
      previsao: "janeiro ou fevereiro de 2027, para o 1º semestre",
    },
    linkOficial: "https://acessounico.mec.gov.br/prouni",
    atualizadoEm: "22/09/2026",
  },
];
