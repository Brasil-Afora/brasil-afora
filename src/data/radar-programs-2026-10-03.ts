import type { Program } from "@/components/programs/types";
import { radarPresentation } from "./radar-presentation";

// Official-source review: 03/10/2026. Unsupported master-import program types.
const reviewedPrograms = [
  {
    id: "caf-oij-pnud-itinerario-desafios-das-juventudes-na-america-latina-e-caribe",
    nome: "CAF/OIJ/PNUD — Itinerário Desafios das Juventudes na América Latina e Caribe",
    instituicaoResponsavel: "CAF / OIJ / PNUD",
    tipo: "Outro",
    niveis: [
      "Ensino fundamental",
      "Ensino médio",
      "Ano sabático",
      "Graduação",
      "Pós-graduação",
    ],
    destino: ["No exterior"],
    beneficios: [],
    beneficiosDetalhe: [
      "Não é bolsa em dinheiro ou ajuda de viagem. Certificado depende de aprovação e atividades.",
    ],
    descricao:
      "Itinerário gratuito de três cursos sobre políticas públicas, inclusão e participação juvenil na América Latina e no Caribe. Oferece certificado após aprovação.\n\nFerramentas para atuar em projetos juvenis e participação social, com formação regional gratuita.\n\nCustos: Curso e certificado gratuitos; equipamento e conexão por conta do participante.\n\nTaxa de candidatura: Zero: curso gratuito e Termos de Uso confirmam acesso sem cargo adicional.\n\nFinanciamento: Não é bolsa em dinheiro ou ajuda de viagem. Certificado depende de aprovação e atividades.\n\nDatas: Três NOOC autogeridos sobre inclusão, governabilidade e meio ambiente. Curso de inclusão anuncia 2 horas; demais cargas devem ser vistas em cada curso.",
    resumo:
      "Itinerário gratuito de três cursos sobre políticas públicas, inclusão e participação juvenil na América Latina e no Caribe. Oferece certificado após aprovação.",
    publico:
      "Técnicos de juventude e qualquer pessoa interessada; inclui estudantes, pesquisadores e sociedade civil. Sem diploma ou emprego obrigatório.",
    requisitos: [
      "Técnicos de juventude e qualquer pessoa interessada; inclui estudantes, pesquisadores e sociedade civil. Sem diploma ou emprego obrigatório.",
      "Sem restrição nacional publicada; programa regional público com cadastro internacional. Brasileiros podem se cadastrar.",
      "Técnicos de juventude e qualquer pessoa interessada; inclui estudantes, pesquisadores e sociedade civil. Sem diploma ou emprego obrigatório.",
      "Faixa etária numérica não publicada; o cadastro solicita data de nascimento.",
      "Espanhol.",
    ],
    etapasSelecao: [
      "Consultar as etapas e os documentos na página oficial da candidatura.",
    ],
    local: "Online",
    linkOficial:
      "https://www.caf.com/es/capacitaciones/serie-nooc-desafios-de-las-juventudes-en-america-latina-y-el-caribe/",
    fontes: [
      "https://www.caf.com/es/capacitaciones/serie-nooc-desafios-de-las-juventudes-en-america-latina-y-el-caribe/",
      "https://capacitaciones.caf.com/info/nooc-inclusion-y-juventudes-en-america-latina-y-el-caribe-03195252",
      "https://capacitaciones.caf.com/signup",
      "https://s3.eu-west-1.amazonaws.com/publico.odilotk.es/terms_of_use/DO_ES_Terminos_Condiciones_DL_BANCO_CAF.pdf",
      "https://www.caf.com/es/capacitaciones/inclusion-y-juventudes-en-america-latina-y-el-caribe/",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      abertura: "17/08/2026",
      prazoInscricao: "31/12/2027",
    },
    atualizadoEm: "03/10/2026",
    pais: "América Latina e Caribe / Online",
    modalidade: "Online",
    verified: true,
  },
  {
    id: "caf-formacao-de-iniciativas-de-educacao-financeira",
    nome: "CAF — Formação de iniciativas de educação financeira",
    instituicaoResponsavel:
      "CAF — Banco de Desenvolvimento da América Latina e Caribe",
    tipo: "Outro",
    niveis: [
      "Ensino fundamental",
      "Ensino médio",
      "Ano sabático",
      "Graduação",
      "Pós-graduação",
    ],
    destino: ["No exterior"],
    beneficios: [],
    beneficiosDetalhe: [
      "Não é bolsa em dinheiro ou ajuda de viagem. Certificado depende de aprovação e atividades.",
    ],
    descricao:
      "Curso gratuito para criar um plano de educação financeira voltado à comunidade, com certificado gratuito após aprovação.\n\nAjuda a planejar iniciativas de educação financeira para a própria comunidade, com certificado gratuito após aprovação.\n\nCustos: Curso e certificado gratuitos; equipamento e conexão por conta do participante.\n\nTaxa de candidatura: Zero: curso gratuito e Termos de Uso confirmam acesso sem cargo adicional.\n\nFinanciamento: Não é bolsa em dinheiro ou ajuda de viagem. Certificado depende de aprovação e atividades.\n\nDatas: Em ritmo próprio, seis módulos e exercícios, com carga estimada de 40 a 50 horas.",
    resumo:
      "Curso gratuito para criar um plano de educação financeira voltado à comunidade, com certificado gratuito após aprovação.",
    publico:
      "Pessoas interessadas em desenvolver iniciativas de educação financeira para suas comunidades. Nível básico, sem diploma, profissão ou experiência mínima publicados.",
    requisitos: [
      "Pessoas interessadas em desenvolver iniciativas de educação financeira para suas comunidades. Nível básico, sem diploma, profissão ou experiência mínima publicados.",
      "Sem restrição nacional publicada; programa regional público com cadastro internacional. Brasileiros podem se cadastrar.",
      "Pessoas interessadas em desenvolver iniciativas de educação financeira para suas comunidades. Nível básico, sem diploma, profissão ou experiência mínima publicados.",
      "Faixa etária numérica não publicada; o cadastro solicita data de nascimento.",
      "Espanhol.",
    ],
    etapasSelecao: [
      "Consultar as etapas e os documentos na página oficial da candidatura.",
    ],
    local: "Online",
    linkOficial:
      "https://www.caf.com/es/capacitaciones/programa-de-capacitacion-y-acompanamiento-de-iniciativas-de-educacion-financiera/",
    fontes: [
      "https://www.caf.com/es/capacitaciones/programa-de-capacitacion-y-acompanamiento-de-iniciativas-de-educacion-financiera/",
      "https://capacitaciones.caf.com/info/programa-de-capacitacion-y-acompanamiento-de-iniciativas-de-educacion-financiera-02781445",
      "https://capacitaciones.caf.com/signup",
      "https://s3.eu-west-1.amazonaws.com/publico.odilotk.es/terms_of_use/DO_ES_Terminos_Condiciones_DL_BANCO_CAF.pdf",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      abertura: "01/11/2024",
      prazoInscricao: "31/12/2026",
    },
    atualizadoEm: "03/10/2026",
    pais: "América Latina e Caribe / Online",
    modalidade: "Online",
    verified: true,
  },
  {
    id: "caf-desenvolvimento-logistico-e-integracao-territorial",
    nome: "CAF — Desenvolvimento logístico e integração territorial",
    instituicaoResponsavel:
      "CAF — Banco de Desenvolvimento da América Latina e Caribe",
    tipo: "Outro",
    niveis: [
      "Ensino fundamental",
      "Ensino médio",
      "Ano sabático",
      "Graduação",
      "Pós-graduação",
    ],
    destino: ["No exterior"],
    beneficios: [],
    beneficiosDetalhe: [
      "Não é bolsa em dinheiro ou ajuda de viagem. Certificado depende de aprovação e atividades.",
    ],
    descricao:
      "Formação gratuita de 10 horas sobre corredores logísticos, cadeias de valor e projetos regionais, com certificado gratuito após aprovação.\n\nApresenta ferramentas regionais de logística e infraestrutura para estudantes e profissionais de comércio exterior.\n\nCustos: Curso e certificado gratuitos; equipamento e conexão por conta do participante.\n\nTaxa de candidatura: Zero: curso gratuito e Termos de Uso confirmam acesso sem cargo adicional.\n\nFinanciamento: Não é bolsa em dinheiro ou ajuda de viagem. Certificado depende de aprovação e atividades.\n\nDatas: NOOC autogerido de 10 horas, três módulos; participação ativa nos fóruns exigida para avaliação.",
    resumo:
      "Formação gratuita de 10 horas sobre corredores logísticos, cadeias de valor e projetos regionais, com certificado gratuito após aprovação.",
    publico:
      "Voltado a equipes técnicas, agentes públicos, profissionais e consultores de logística e comércio exterior. Sem diploma mínimo; familiaridade com integração e infraestrutura é recomendada.",
    requisitos: [
      "Voltado a equipes técnicas, agentes públicos, profissionais e consultores de logística e comércio exterior. Sem diploma mínimo; familiaridade com integração e infraestrutura é recomendada.",
      "Sem restrição nacional publicada; programa regional público com cadastro internacional. Brasileiros podem se cadastrar.",
      "Sem diploma mínimo exigido. Familiaridade básica com integração e infraestrutura é recomendada.",
      "Faixa etária numérica não publicada; o cadastro solicita data de nascimento.",
      "Espanhol.",
    ],
    etapasSelecao: [
      "Consultar as etapas e os documentos na página oficial da candidatura.",
    ],
    local: "Online",
    linkOficial:
      "https://www.caf.com/es/capacitaciones/desarrollo-logistico-y-facilitacion-para-la-integracion-territorial-productiva-y-funcional-de-america-latina-y-el-caribe/",
    fontes: [
      "https://www.caf.com/es/capacitaciones/desarrollo-logistico-y-facilitacion-para-la-integracion-territorial-productiva-y-funcional-de-america-latina-y-el-caribe/",
      "https://capacitaciones.caf.com/info/desarrollo-logistico-y-facilitacion-para-la-integracion-territorial-02782004",
      "https://capacitaciones.caf.com/signup",
      "https://s3.eu-west-1.amazonaws.com/publico.odilotk.es/terms_of_use/DO_ES_Terminos_Condiciones_DL_BANCO_CAF.pdf",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      abertura: "11/08/2026",
      prazoInscricao: "31/12/2028",
    },
    atualizadoEm: "03/10/2026",
    pais: "América Latina e Caribe / Online",
    modalidade: "Online",
    verified: true,
  },
  {
    id: "caf-facilitacao-de-comercio-na-america-latina-e-caribe",
    nome: "CAF — Facilitação de comércio na América Latina e Caribe",
    instituicaoResponsavel:
      "CAF — Banco de Desenvolvimento da América Latina e Caribe",
    tipo: "Outro",
    niveis: [
      "Ensino fundamental",
      "Ensino médio",
      "Ano sabático",
      "Graduação",
      "Pós-graduação",
    ],
    destino: ["No exterior"],
    beneficios: [],
    beneficiosDetalhe: [
      "Não é bolsa em dinheiro ou ajuda de viagem. Certificado depende de aprovação e atividades.",
    ],
    descricao:
      "Curso gratuito de 10 horas sobre acordos, custos de comércio e a ferramenta CAF de facilitação, com avaliação e certificado gratuito.\n\nFormação prática sobre facilitação do comércio regional, com certificado gratuito após aprovação.\n\nCustos: Curso e certificado gratuitos; equipamento e conexão por conta do participante.\n\nTaxa de candidatura: Zero: curso gratuito e Termos de Uso confirmam acesso sem cargo adicional.\n\nFinanciamento: Não é bolsa em dinheiro ou ajuda de viagem. Certificado depende de aprovação e atividades.\n\nDatas: Curso de 10 horas, com três módulos, fóruns e atividades avaliativas, em ritmo próprio.",
    resumo:
      "Curso gratuito de 10 horas sobre acordos, custos de comércio e a ferramenta CAF de facilitação, com avaliação e certificado gratuito.",
    publico:
      "Voltado a equipes técnicas, profissionais, agentes públicos, operadores e consultores de comércio exterior. Sem diploma ou conhecimento prévio obrigatório.",
    requisitos: [
      "Voltado a equipes técnicas, profissionais, agentes públicos, operadores e consultores de comércio exterior. Sem diploma ou conhecimento prévio obrigatório.",
      "Sem restrição nacional publicada; programa regional público com cadastro internacional. Brasileiros podem se cadastrar.",
      "Sem diploma ou conhecimento prévio obrigatório.",
      "Faixa etária numérica não publicada; o cadastro solicita data de nascimento.",
      "Espanhol.",
    ],
    etapasSelecao: [
      "Consultar as etapas e os documentos na página oficial da candidatura.",
    ],
    local: "Online",
    linkOficial:
      "https://www.caf.com/es/capacitaciones/facilitacion-de-comercio-en-america-latina-y-el-caribe-oportunidades-para-impulsar-la-competitividad-regional/",
    fontes: [
      "https://www.caf.com/es/capacitaciones/facilitacion-de-comercio-en-america-latina-y-el-caribe-oportunidades-para-impulsar-la-competitividad-regional/",
      "https://capacitaciones.caf.com/info/facilitacion-de-comercio-en-america-latina-oportunidades-para-impulsar-la-competitividad-regional-02782005",
      "https://capacitaciones.caf.com/signup",
      "https://s3.eu-west-1.amazonaws.com/publico.odilotk.es/terms_of_use/DO_ES_Terminos_Condiciones_DL_BANCO_CAF.pdf",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      abertura: "11/06/2026",
      prazoInscricao: "31/12/2028",
    },
    atualizadoEm: "03/10/2026",
    pais: "América Latina e Caribe / Online",
    modalidade: "Online",
    verified: true,
  },
  {
    id: "caf-inovacao-empresarial-na-pequena-empresa",
    nome: "CAF — Inovação empresarial na pequena empresa",
    instituicaoResponsavel:
      "CAF — Banco de Desenvolvimento da América Latina e Caribe",
    tipo: "Outro",
    niveis: [
      "Ensino fundamental",
      "Ensino médio",
      "Ano sabático",
      "Graduação",
      "Pós-graduação",
    ],
    destino: ["No exterior"],
    beneficios: [],
    beneficiosDetalhe: [
      "Certificado de Superação após aprovação dos quatro exercícios; sem bolsa em dinheiro.",
    ],
    descricao:
      "Curso gratuito de 24 horas para elaborar uma rota de inovação e transformação da própria pequena empresa, com certificado gratuito após aprovação.\n\nAjuda a construir um plano de inovação e transformação para uma pequena empresa.\n\nCustos: Curso e certificado gratuitos; equipamento/conexão próprios.\n\nTaxa de candidatura: Zero: acesso gratuito, sem cargo adicional nos termos CAF.\n\nFinanciamento: Certificado de Superação após aprovação dos quatro exercícios; sem bolsa em dinheiro.\n\nDatas: Autogerido, 24 horas em quatro módulos, estimativa de quatro semanas. Conteúdo 24/7 até fechamento da oferta.",
    resumo:
      "Curso gratuito de 24 horas para elaborar uma rota de inovação e transformação da própria pequena empresa, com certificado gratuito após aprovação.",
    publico:
      "Pessoas que desejam construir um plano de inovação para sua pequena empresa. Nível intermediário, sem diploma universitário ou seleção empresarial; os exercícios pressupõem uma iniciativa empresarial.",
    requisitos: [
      "Pessoas que desejam construir um plano de inovação para sua pequena empresa. Nível intermediário, sem diploma universitário ou seleção empresarial; os exercícios pressupõem uma iniciativa empresarial.",
      "Cadastro internacional da CAF; não há restrição nacional publicada nesta oferta. Brasileiros podem acessar mediante conta.",
      "Sem diploma mínimo exigido. Curso intermediário voltado à aplicação em uma pequena empresa; os exercícios pressupõem uma iniciativa empresarial.",
      "Faixa etária numérica não publicada; o cadastro solicita data de nascimento.",
      "Espanhol.",
    ],
    etapasSelecao: [
      "Consultar as etapas e os documentos na página oficial da candidatura.",
    ],
    local: "Online",
    linkOficial:
      "https://www.caf.com/es/capacitaciones/innovacion-empresarial-como-impulsarla-en-mi-pyme/",
    fontes: [
      "https://www.caf.com/es/capacitaciones/innovacion-empresarial-como-impulsarla-en-mi-pyme/",
      "https://capacitaciones.caf.com/info/innovacion-empresarial-como-impulsarla-en-mi-pyme-02698136",
      "https://capacitaciones.caf.com/signup",
      "https://s3.eu-west-1.amazonaws.com/publico.odilotk.es/terms_of_use/DO_ES_Terminos_Condiciones_DL_BANCO_CAF.pdf",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      abertura: "16/09/2024",
      prazoInscricao: "31/12/2026",
    },
    atualizadoEm: "03/10/2026",
    pais: "América Latina e Caribe / Online",
    modalidade: "Online",
    verified: true,
  },
  {
    id: "tv5monde-premiere-classe-frances-e-interculturalidade-a1",
    nome: "TV5MONDE — Première classe, francês e interculturalidade A1",
    instituicaoResponsavel: "TV5MONDE EDU",
    tipo: "Outro",
    niveis: [
      "Ensino fundamental",
      "Ensino médio",
      "Ano sabático",
      "Graduação",
      "Pós-graduação",
    ],
    destino: ["No exterior"],
    beneficios: [],
    beneficiosDetalhe: [
      "Exercícios com correção e acompanhamento de progresso. Conta opcional permite salvar o histórico; não há certificado de conclusão anunciado.",
    ],
    descricao:
      "Percurso gratuito de francês A1 com vídeos, exercícios e situações de viagem, trabalho e vida cotidiana, incluindo competências interculturais.\n\nPreparação linguística e cultural acessível a jovens do Brasil para mobilidade e comunicação em países francófonos.\n\nCustos: Integralmente gratuito e sem anúncios, segundo FAQ; internet/equipamento próprios.\n\nTaxa de candidatura: Zero; acesso público sem candidatura seletiva. Conta opcional gratuita.\n\nFinanciamento: Exercícios com correção e acompanhamento de progresso. Conta opcional permite salvar o histórico; não há certificado de conclusão anunciado.\n\nDatas: Em ritmo próprio, com sete temas e exercícios de nívelA1. Recomenda 20 minutos diários de estudo.",
    resumo:
      "Percurso gratuito de francês A1 com vídeos, exercícios e situações de viagem, trabalho e vida cotidiana, incluindo competências interculturais.",
    publico:
      "Percurso público para iniciantes sem conhecimento de francês, sem seleção acadêmica ou cadastro obrigatório para acessar exercícios. Público de aprendizagem; nenhuma faixa etária numérica publicada. Conta opcional salva progresso.",
    requisitos: [
      "Percurso público para iniciantes sem conhecimento de francês, sem seleção acadêmica ou cadastro obrigatório para acessar exercícios. Público de aprendizagem; nenhuma faixa etária numérica publicada. Conta opcional salva progresso.",
      "Acesso público para aprendizagem do francês, inclusive a partir do Brasil. Interface e apoio em português disponíveis.",
      "Iniciantes A1, sem diploma, matrícula universitária ou teste de seleção. Percurso começa com apresentação pessoal e alfabeto.",
      "Sem faixa etária numérica publicada para o acesso aos exercícios públicos.",
      "Francês iniciante; interface/apoio em português, espanhol e outras línguas.",
    ],
    etapasSelecao: [
      "Consultar as etapas e os documentos na página oficial da candidatura.",
    ],
    local: "Online",
    linkOficial: "https://apprendre.tv5monde.com/fr/exercices/premiere-classe",
    fontes: [
      "https://apprendre.tv5monde.com/fr/exercices/premiere-classe",
      "https://support-apprendre.tv5monde.com/en/support/solutions/articles/61000298831-why-learn-french-with-tv5monde-",
      "https://support-apprendre.tv5monde.com/en/support/solutions/articles/61000298835-how-and-why-should-i-create-an-account-",
      "https://www.tv5monde.com/la-chaine/conditions-generales-d-utilisation",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
    },
    atualizadoEm: "03/10/2026",
    pais: "Global / Online",
    modalidade: "Online",
    verified: true,
  },
  {
    id: "quebec-francisation-en-ligne-para-titulares-de-csq-ou-caq",
    nome: "Québec — Francisation en ligne para titulares de CSQ ou CAQ",
    instituicaoResponsavel:
      "Ministério da Imigração, Francização e Integração do Québec",
    tipo: "Outro",
    niveis: [
      "Ensino fundamental",
      "Ensino médio",
      "Ano sabático",
      "Graduação",
      "Pós-graduação",
    ],
    destino: ["No exterior"],
    beneficios: [],
    beneficiosDetalhe: [
      "Curso gratuito, sem ajuda financeira de manutenção, viagem ou imigração.",
    ],
    descricao:
      "Francês gratuito em linha para pessoas de 16 anos ou mais no exterior já titulares de CSQ/CAQ válido, com tutor ou autoformação.\n\nPreparação linguística e cultural antes da chegada ao Québec para jovens elegíveis, inclusive quem tem CAQ de estudo.\n\nCustos: Cursos em linha gratuitos; computador/tablet, câmera, microfone, internet e email pessoal necessários. Celular não atende.\n\nTaxa de candidatura: Sem cobrança anunciada na matrícula do curso gratuito; CSQ/CAQ é requisito anterior e seus custos/processos não são cobertos por esta oferta.\n\nFinanciamento: Curso gratuito, sem ajuda financeira de manutenção, viagem ou imigração.\n\nDatas: Com tutor ou em ritmo próprio, cerca de seis horas semanais, em horário flexível. Inclui francês para administração, engenharia, saúde e turismo.",
    resumo:
      "Francês gratuito em linha para pessoas de 16 anos ou mais no exterior já titulares de CSQ/CAQ válido, com tutor ou autoformação.",
    publico:
      "16 anos ou mais, residente fora do Canadá, com Certificat de sélection du Québec (CSQ) ou Certificat d’acceptation du Québec (CAQ) válido. Brasileiros que atendam essas condições podem solicitar. Não basta pretender imigrar: certificado válido é obrigatório.",
    requisitos: [
      "16 anos ou mais, residente fora do Canadá, com Certificat de sélection du Québec (CSQ) ou Certificat d’acceptation du Québec (CAQ) válido. Brasileiros que atendam essas condições podem solicitar. Não basta pretender imigrar: certificado válido é obrigatório.",
      "Pessoas de qualquer nacionalidade residentes fora do Canadá que já tenham CSQ ou CAQ válido.",
      "CSQ ou CAQ válido, residência fora do Canadá e francês intermediário ou avançado. Pode haver teste de classificação; não exige diploma mínimo para o curso.",
      "16 anos ou mais no momento da inscrição.",
      "Francês intermediário/avançado; níveis 5–8 com tutor/autoformação, avançado com tutor ou módulos profissionais próprios. Pode haver teste de classificação.",
    ],
    etapasSelecao: [
      "Consultar as etapas e os documentos na página oficial da candidatura.",
    ],
    local: "Online",
    linkOficial:
      "https://www.quebec.ca/education/apprendre-le-francais/personnes-selectionnees",
    fontes: [
      "https://www.quebec.ca/education/apprendre-le-francais/personnes-selectionnees",
      "https://www.quebec.ca/education/apprendre-le-francais/personnes-selectionnees/conditions-admission",
      "https://www.quebec.ca/education/apprendre-le-francais/personnes-selectionnees/description",
      "https://www.quebec.ca/education/apprendre-le-francais/personnes-selectionnees/inscription",
      "https://www.quebec.ca/education/apprendre-le-francais",
      "https://www.fel.gouv.qc.ca/moodlefel/login/signup.php",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
    },
    atualizadoEm: "03/10/2026",
    pais: "Canadá / Online desde o exterior",
    modalidade: "Online",
    verified: true,
  },
  {
    id: "cavilam-alliance-francaise-ensinar-frances-percurso-de-descoberta2026",
    nome: "CAVILAM–Alliance Française — Ensinar francês, percurso de descoberta2026",
    instituicaoResponsavel: "CAVILAM–Alliance Française",
    tipo: "Formação",
    niveis: ["Ensino médio", "Ano sabático", "Graduação", "Pós-graduação"],
    destino: ["No exterior"],
    beneficios: ["Gratuito"],
    etapasSelecao: [
      "Criar conta na plataforma oficial e seguir as instruções de matrícula do curso.",
    ],
    local: "Online",
    modalidade: "Online",
    pais: "França",
    resumo:
      "Curso online gratuito de 12 a 20 horas sobre didática, planejamento de aulas e interculturalidade no ensino de francês. Aberto também a futuros professores; inscrição até 14/12/2026. Certificado opcional de €35.",
    publico:
      "Professores, futuros professores e qualquer pessoa interessada no ensino de francês. Sem diploma, experiência docente, nacionalidade ou residência específicos; curso em francês e conta na plataforma necessários.",
    linkOficial: "https://mooc.cavilam.com/courses/course-v1:EFLEA%2BDec%2B35/",
    fontes: [
      "https://mooc.cavilam.com/courses/course-v1:EFLEA%2BDec%2B35/",
      "https://authn.mooc.cavilam.com/register?next=%2Fcourses%2Fcourse-v1%3AEFLEA%2BDec%2B35%2F",
    ],
    atualizadoEm: "03/10/2026",
    verified: true,
    descricao:
      "Curso online gratuito de 12 a 20 horas sobre didática, planejamento de aulas e interculturalidade no ensino de francês. Aberto também a futuros professores; inscrição até 14/12/2026. Certificado opcional de €35.\n\nPermite explorar a formação e a prática docente em francês sem diploma obrigatório e sem pagar pelo conteúdo.\n\nCustos: Inscrição e conteúdo gratuitos, sem obrigação de compra. Certificado de acompanhamento opcional custa €35. Equipamento e conexão próprios.\n\nTaxa de candidatura: Gratuita.\n\nFinanciamento: Sem bolsa em dinheiro. O percurso avançado depende da aprovação e da compra do certificado de €35; não está incluído no acesso gratuito divulgado aqui.\n\nDatas: 18/11 a 28/12/2026;12 a 20 horas, em ritmo próprio.",
    requisitos: [
      "Professores, futuros professores e qualquer pessoa interessada no ensino de francês. Sem diploma, experiência docente, nacionalidade ou residência específicos; curso em francês e conta na plataforma necessários.",
      "Aberto a todos; cadastro oferece Brasil como país/região.",
      "Não exige diploma ou experiência docente. É necessário compreender o francês usado no curso.",
      "Nenhuma idade mínima numérica publicada na apresentação ou no cadastro consultado.",
      "Curso em francês; não exige certificado de proficiência.",
    ],
    beneficiosDetalhe: [
      "Sem bolsa em dinheiro. O percurso avançado depende da aprovação e da compra do certificado de €35; não está incluído no acesso gratuito divulgado aqui.",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      prazoInscricao: "14/12/2026",
    },
  },
  {
    id: "prep-pos-graduacao-online",
    nome: "Prep Pós-graduação Online",
    instituicaoResponsavel: "Fundação Estudar e Fundação Lemann",
    tipo: "Preparatório",
    niveis: ["Graduação", "Pós-graduação"],
    destino: ["No exterior"],
    beneficios: ["Gratuito", "Preparação"],
    beneficiosDetalhe: [
      "Preparatório gratuito para candidaturas de pós-graduação no exterior, com aulas gravadas, exercícios e workshops. Gratuito. Não inclui bolsa universitária.",
    ],
    descricao:
      "Preparatório gratuito para candidaturas de pós-graduação no exterior, com aulas gravadas, exercícios e workshops.\n\nPreparatório gratuito para candidaturas de pós-graduação no exterior, com aulas gravadas, exercícios e workshops.\n\nCustos: Gratuito. Não inclui bolsa universitária.\n\nTaxa de candidatura: Gratuita\n\nFinanciamento: Preparatório gratuito para candidaturas de pós-graduação no exterior, com aulas gravadas, exercícios e workshops. Gratuito. Não inclui bolsa universitária.\n\nDatas: Não informado",
    resumo:
      "Preparatório gratuito para candidaturas de pós-graduação no exterior, com aulas gravadas, exercícios e workshops.",
    publico:
      "Brasileiros interessados em candidatar-se a uma pós-graduação no exterior; sem pré-requisitos publicados.",
    requisitos: [
      "Brasileiros interessados em candidatar-se a uma pós-graduação no exterior; sem pré-requisitos publicados.",
      "Sem restrição; orientação voltada a brasileiros.",
      "Interesse em candidaturas de pós-graduação no exterior.",
      "Não informado",
      "Inglês fluente não exigido para o preparatório.",
    ],
    etapasSelecao: ["Cadastro na plataforma EAD"],
    inscricoes: {
      situacaoNaFonte: "rolling",
      continuo: true,
    },
    linkOficial: "https://www.estudarfora.org.br/curso-prep-pos-graduacao/",
    fontes: [
      "https://www.estudarfora.org.br/curso-prep-pos-graduacao/",
      "https://ead.estudar.org.br/join?invitation_token=f048a2a0648620aeb332584e8a027aa060e62848-62d5506a-3fbf-4f59-978b-b6c4aa5e54bc",
    ],
    local: "Online",
    modalidade: "Online",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Fundação",
    verified: true,
  },
  {
    id: "prep-graduacao-online",
    nome: "Prep Graduação Online",
    instituicaoResponsavel: "Fundação Estudar",
    tipo: "Preparatório",
    niveis: ["Ensino fundamental", "Ensino médio", "Ano sabático"],
    destino: ["No exterior"],
    beneficios: ["Gratuito", "Preparação"],
    beneficiosDetalhe: [
      "Preparatório gratuito para candidaturas de graduação nos Estados Unidos, com 12 horas de aulas, exercícios e certificado. Gratuito. Não concede bolsa universitária nem garante aprovação.",
    ],
    descricao:
      "Preparatório gratuito para candidaturas de graduação nos Estados Unidos, com 12 horas de aulas, exercícios e certificado.\n\nPreparatório gratuito para candidaturas de graduação nos Estados Unidos, com 12 horas de aulas, exercícios e certificado.\n\nCustos: Gratuito. Não concede bolsa universitária nem garante aprovação.\n\nTaxa de candidatura: Gratuita\n\nFinanciamento: Preparatório gratuito para candidaturas de graduação nos Estados Unidos, com 12 horas de aulas, exercícios e certificado. Gratuito. Não concede bolsa universitária nem garante aprovação.\n\nDatas: 12 horas, no ritmo do aluno.",
    resumo:
      "Preparatório gratuito para candidaturas de graduação nos Estados Unidos, com 12 horas de aulas, exercícios e certificado.",
    publico:
      "Jovens brasileiros no fim do ensino fundamental, no ensino médio ou em ano sabático.",
    requisitos: [
      "Jovens brasileiros no fim do ensino fundamental, no ensino médio ou em ano sabático.",
      "Iniciativa brasileira; não informa exclusão por nacionalidade.",
      "Estar no fim do ensino fundamental, no ensino médio ou em ano sabático.",
      "Não informado",
      "Não informado",
    ],
    etapasSelecao: ["Cadastro na plataforma EAD"],
    inscricoes: {
      situacaoNaFonte: "rolling",
      continuo: true,
    },
    linkOficial: "https://www.estudarfora.org.br/curso-prep-graduacao-online/",
    fontes: [
      "https://www.estudarfora.org.br/curso-prep-graduacao-online/",
      "https://ead.estudar.org.br/join?invitation_token=21da8a0aec099dea13dfb2a218e3e69caf5b9327-6ccc86c7-b2b8-4561-a90a-b55c755e242a",
    ],
    local: "Online",
    modalidade: "Online",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Fundação",
    verified: true,
  },
  {
    id: "sesi-sp-ensino-medio-gratuito-2027",
    nome: "SESI-SP — Ensino Médio gratuito 2027",
    instituicaoResponsavel: "SESI-SP",
    tipo: "Programa de acesso",
    niveis: ["Ensino médio"],
    destino: ["No Brasil"],
    beneficios: ["Mensalidade"],
    beneficiosDetalhe: [
      "Isenção das mensalidades de 2027 para os selecionados com vaga no primeiro ou segundo ano do ensino médio. A seleção considera vagas, prioridade e desempenho na prova. Despesas adicionais não divulgadas.",
    ],
    descricao:
      "Ingresso no ensino médio do SESI-SP em 2027 com isenção das mensalidades para os candidatos selecionados no 1º ou 2º ano.\n\nIngresso no ensino médio do SESI-SP em 2027 com isenção das mensalidades para os candidatos selecionados no 1º ou 2º ano.\n\nCustos: Mensalidades escolares de 2027 gratuitas para os selecionados no 1º e 2º ano. Despesas adicionais não divulgadas.\n\nTaxa de candidatura: Taxa de inscrição não informada.\n\nFinanciamento: Isenção das mensalidades de 2027 para os selecionados com vaga no primeiro ou segundo ano do ensino médio. A seleção considera vagas, prioridade e desempenho na prova. Despesas adicionais não divulgadas.\n\nDatas: Prioritários: 06/10 às 8 h a 15/10 às 16 h. Público geral: 19/10 às 8 h a 21/10 às 16 h, condicionado a vagas remanescentes. Provas 06–12/11; lista 27/11; entrevista e matrícula 28/11–18/12; comprovação de aprovação escolar até 13/01/2027.",
    resumo:
      "Ingresso no ensino médio do SESI-SP em 2027 com isenção das mensalidades para os candidatos selecionados no 1º ou 2º ano.",
    publico:
      "Dependentes das categorias prioritárias do SESI-SP; candidatos de outras categorias somente se houver vagas remanescentes.",
    requisitos: [
      "Dependentes das categorias prioritárias do SESI-SP; candidatos de outras categorias somente se houver vagas remanescentes.",
      "Escolas no estado de São Paulo; chamada aceita dependentes legais das categorias e demais candidatos. Não há exclusão de brasileiros.",
      "Ingresso no 1º ou 2º ano do ensino médio. Prioridade para dependentes legais de funcionários ou proprietários de empresas contribuintes do SESI e de funcionários SESI-SP, SENAI-SP, FIESP, CIESP e IRS. Outras categorias dependem de vagas remanescentes.",
      "Idade numérica para ensino médio não informada.",
      "Não informado",
    ],
    etapasSelecao: [
      "Inscrição na janela da categoria",
      "Prova na unidade escolhida",
      "Classificação conforme vagas",
      "Entrevista e documentação",
      "Matrícula",
    ],
    inscricoes: {
      situacaoNaFonte: "upcoming",
      abertura: "06/10/2026",
      prazoInscricao: "15/10/2026",
    },
    linkOficial: "https://hotsite.sesisp.org.br/processoseletivo/",
    fontes: [
      "https://hotsite.sesisp.org.br/processoseletivo/",
      "https://inscricaosesi.sesisp.org.br/WebForms/Home.aspx",
    ],
    local: "Unidades com vagas no estado de São Paulo",
    modalidade: "Presencial",
    atualizadoEm: "03/10/2026",
    pais: "Brasil",
    tipoOrganizacao: "Instituição de ensino",
    verified: true,
  },
  {
    id: "afs-global-you-adventurer",
    nome: "AFS Global You Adventurer — turma novembro 2026",
    instituicaoResponsavel: "AFS Intercultural Programs",
    tipo: "Intercâmbio",
    niveis: ["Ensino fundamental", "Ensino médio"],
    destino: ["No exterior"],
    beneficios: ["Preparação"],
    beneficiosDetalhe: [
      "Intercâmbio virtual de cinco semanas para desenvolver comunicação intercultural e cidadania global com jovens de vários países. Programa pago: faixa usual de USD 120 a USD 315, conforme o país. O valor exato é informado pela AFS antes de finalizar a matrícula. Bolsas estão fechadas.",
    ],
    descricao:
      "Intercâmbio virtual de cinco semanas para desenvolver comunicação intercultural e cidadania global com jovens de vários países.\n\nIntercâmbio virtual de cinco semanas para desenvolver comunicação intercultural e cidadania global com jovens de vários países.\n\nCustos: Programa pago: faixa usual de USD 120 a USD 315, conforme o país. O valor exato é informado pela AFS antes de finalizar a matrícula. Bolsas estão fechadas.\n\nTaxa de candidatura: Nenhuma taxa separada publicada no programa regular.\n\nFinanciamento: Intercâmbio virtual de cinco semanas para desenvolver comunicação intercultural e cidadania global com jovens de vários países. Programa pago: faixa usual de USD 120 a USD 315, conforme o país. O valor exato é informado pela AFS antes de finalizar a matrícula. Bolsas estão fechadas.\n\nDatas: 10/11–18/12/2026",
    resumo:
      "Intercâmbio virtual de cinco semanas para desenvolver comunicação intercultural e cidadania global com jovens de vários países.",
    publico:
      "Jovens de 14 a 17 anos, incluindo brasileiros, interessados em uma turma internacional online.",
    requisitos: [
      "Jovens de 14 a 17 anos, incluindo brasileiros, interessados em uma turma internacional online.",
      "Aberto mundialmente; Vietnã excluído para inscrição individual.",
      "Ter entre 14 e 17 anos. Dispositivo com câmera, microfone e internet para encontros ao vivo. Vídeos com legendas em inglês e espanhol; idioma dos encontros conforme a turma.",
      "14–17 anos.",
      "Vídeos legendados em inglês e espanhol; sessões conforme idioma da turma. Sem nota mínima publicada no programa regular.",
    ],
    etapasSelecao: [
      "Formulário e escolha da turma",
      "Contato oficial e confirmação de preço",
      "Pagamento e matrícula",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
    },
    linkOficial: "https://afs.org/adventurer/",
    fontes: [
      "https://afs.org/adventurer/",
      "https://afs.org/adventurer-scholarship/",
      "https://afs.org/adventurer-full-scholarship/",
    ],
    local: "Online",
    modalidade: "Online",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Organização internacional",
    duracao: "5 semanas",
    verified: true,
  },
  {
    id: "khan-academy-sat-prep",
    nome: "Khan Academy — Official SAT Prep",
    instituicaoResponsavel: "Khan Academy / College Board",
    tipo: "Preparatório",
    niveis: ["Ensino médio", "Ano sabático"],
    destino: ["No exterior"],
    beneficios: ["Gratuito", "Preparação"],
    beneficiosDetalhe: [
      "Preparatório oficial gratuito para o SAT, desenvolvido pela Khan Academy com o College Board, com matemática, leitura e escrita. Preparatório gratuito. A taxa da prova SAT não está incluída.",
    ],
    descricao:
      "Preparatório oficial gratuito para o SAT, desenvolvido pela Khan Academy com o College Board, com matemática, leitura e escrita.\n\nPreparatório oficial gratuito para o SAT, desenvolvido pela Khan Academy com o College Board, com matemática, leitura e escrita.\n\nCustos: Preparatório gratuito. A taxa da prova SAT não está incluída.\n\nTaxa de candidatura: Gratuita.\n\nFinanciamento: Preparatório oficial gratuito para o SAT, desenvolvido pela Khan Academy com o College Board, com matemática, leitura e escrita. Preparatório gratuito. A taxa da prova SAT não está incluída.\n\nDatas: Acesso contínuo, assíncrono e sem prazo final publicado.",
    resumo:
      "Preparatório oficial gratuito para o SAT, desenvolvido pela Khan Academy com o College Board, com matemática, leitura e escrita.",
    publico:
      "Estudantes de qualquer país, incluindo Brasil, que se preparam para o SAT.",
    requisitos: [
      "Estudantes de qualquer país, incluindo Brasil, que se preparam para o SAT.",
      "Sem restrição geográfica; brasileiros elegíveis pelas regras de acesso mundial.",
      "Conta para acompanhamento do estudo. Menores de 13 anos precisam de consentimento do responsável ou instituição para criar conta.",
      "Sem idade mínima para consultar; contas de menores de 13 anos com consentimento de pais ou escola.",
      "Preparatório do SAT em inglês; sem certificado obrigatório de proficiência para acesso.",
    ],
    etapasSelecao: [
      "Acesso aos cursos oficiais",
      "Conta gratuita para registrar progresso, se desejado",
      "Diagnóstico e estudo autônomo",
    ],
    inscricoes: {
      situacaoNaFonte: "rolling",
      continuo: true,
    },
    linkOficial: "https://www.khanacademy.org/sat",
    fontes: [
      "https://www.khanacademy.org/sat",
      "https://www.khanacademy.org/test-prep/digital-sat",
      "https://satsuite.collegeboard.org/practice/khan-academy",
      "https://www.khanacademy.org/about/privacy-policy",
    ],
    local: "Online",
    modalidade: "Online",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Organização sem fins lucrativos",
    verified: true,
  },
  {
    id: "openlearn-english-skills-for-learning",
    nome: "OpenLearn — English: skills for learning",
    instituicaoResponsavel: "The Open University",
    tipo: "Preparatório",
    niveis: ["Ensino médio", "Ano sabático", "Graduação"],
    destino: ["No exterior"],
    beneficios: ["Gratuito", "Preparação"],
    beneficiosDetalhe: [
      "Curso gratuito de inglês acadêmico da Open University, com 24 horas de leitura, anotações e escrita de textos universitários. Gratuito, com declaração de participação e badge digital; não concede créditos de graduação.",
    ],
    descricao:
      "Curso gratuito de inglês acadêmico da Open University, com 24 horas de leitura, anotações e escrita de textos universitários.\n\nCurso gratuito de inglês acadêmico da Open University, com 24 horas de leitura, anotações e escrita de textos universitários.\n\nCustos: Gratuito, com declaração de participação e badge digital; não concede créditos de graduação.\n\nTaxa de candidatura: Gratuita.\n\nFinanciamento: Curso gratuito de inglês acadêmico da Open University, com 24 horas de leitura, anotações e escrita de textos universitários. Gratuito, com declaração de participação e badge digital; não concede créditos de graduação.\n\nDatas: Estudo autônomo: 8 semanas sugeridas, aproximadamente 3 horas por semana; início imediato e ritmo livre.",
    resumo:
      "Curso gratuito de inglês acadêmico da Open University, com 24 horas de leitura, anotações e escrita de textos universitários.",
    publico:
      "Pessoas interessadas em desenvolver inglês para estudos universitários, incluindo brasileiros.",
    requisitos: [
      "Pessoas interessadas em desenvolver inglês para estudos universitários, incluindo brasileiros.",
      "Acesso aberto a qualquer pessoa; nenhuma restrição de nacionalidade publicada.",
      "Conta a partir de 13 anos para quizzes, acompanhamento e reconhecimento de conclusão. Conteúdo pode ser consultado sem cadastro.",
      "Sem idade mínima para consultar conteúdo; conta gratuita exige 13 anos ou mais.",
      "Conteúdo em inglês; curso para desenvolver leitura e escrita acadêmica, sem certificado de proficiência obrigatório.",
    ],
    etapasSelecao: [
      "Consulta imediata sem cadastro",
      "Conta gratuita a partir de 13 anos para inscrição e quizzes",
      "Leitura do conteúdo e quizzes obrigatórios para badge",
    ],
    inscricoes: {
      situacaoNaFonte: "rolling",
      continuo: true,
    },
    linkOficial:
      "https://www.open.edu/openlearn/education-development/english-skills-learning",
    fontes: [
      "https://www.open.edu/openlearn/education-development/english-skills-learning",
      "https://www.open.edu/openlearn/about-openlearn/frequently-asked-questions-on-openlearn",
      "https://www.open.edu/openlearn/education-development/english-skills-learning/content-section-overview",
    ],
    local: "Online",
    modalidade: "Online",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Universidade",
    duracao: "24 horas; 8 semanas sugeridas",
    verified: true,
  },
  {
    id: "teachingenglish-classroom-research-2026",
    nome: "TeachingEnglish — Classroom research, ciclo outubro 2026",
    instituicaoResponsavel: "British Council",
    tipo: "Formação",
    niveis: ["Graduação", "Pós-graduação"],
    destino: ["No exterior"],
    beneficios: ["Gratuito", "Preparação"],
    beneficiosDetalhe: [
      "Curso gratuito do British Council sobre pesquisa em sala de aula para professores de inglês, com 9–12 horas de estudo, workbook e certificado. Gratuito, incluindo material e certificado após conclusão integral.",
    ],
    descricao:
      "Curso gratuito do British Council sobre pesquisa em sala de aula para professores de inglês, com 9–12 horas de estudo, workbook e certificado.\n\nCurso gratuito do British Council sobre pesquisa em sala de aula para professores de inglês, com 9–12 horas de estudo, workbook e certificado.\n\nCustos: Gratuito, incluindo material e certificado após conclusão integral.\n\nTaxa de candidatura: Gratuita.\n\nFinanciamento: Curso gratuito do British Council sobre pesquisa em sala de aula para professores de inglês, com 9–12 horas de estudo, workbook e certificado. Gratuito, incluindo material e certificado após conclusão integral.\n\nDatas: Curso disponível de 01/10 a 31/12/2026. O acesso termina em 31/12.",
    resumo:
      "Curso gratuito do British Council sobre pesquisa em sala de aula para professores de inglês, com 9–12 horas de estudo, workbook e certificado.",
    publico:
      "Professores e formadores de professores de inglês, incluindo brasileiros, com compreensão a partir de B1.",
    requisitos: [
      "Professores e formadores de professores de inglês, incluindo brasileiros, com compreensão a partir de B1.",
      "Comunidade global; Brasil explicitamente aceito no dropdown de localização do registro.",
      "Conta de acesso para maiores de 18 anos. Compreensão de inglês a partir de B1.",
      "18 anos ou mais para conta de acesso aos cursos.",
      "Compreensão de inglês B1 ou superior; conteúdos em inglês.",
    ],
    etapasSelecao: [
      "Conta TeachingEnglish gratuita, 18+",
      "Inscrição na rota específica do curso",
      "Estudo autônomo e acesso aos recursos",
      "Conclusão integral para certificado",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      abertura: "01/10/2026",
    },
    linkOficial:
      "https://www.teachingenglish.org.uk/training/courses/teachingenglish-classroom-research",
    fontes: [
      "https://www.teachingenglish.org.uk/training/courses/teachingenglish-classroom-research",
      "https://www.teachingenglish.org.uk/training/courses/training-courses-faqs",
      "https://www.teachingenglish.org.uk/user/register",
      "https://www.teachingenglish.org.uk/professional-development-for-teachers/training-courses",
      "https://open.teachingenglish.org.uk/Home/EnrollProgramme/192_805-344",
    ],
    local: "Online",
    modalidade: "Online",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Organização internacional",
    duracao: "9–12 horas",
    verified: true,
  },
  {
    id: "teachingenglish-webinar-speakers-2027",
    nome: "TeachingEnglish — seleção de palestrantes 2027–2028",
    instituicaoResponsavel: "British Council",
    tipo: "Formação",
    niveis: ["Graduação", "Pós-graduação"],
    destino: ["No exterior"],
    beneficios: ["Preparação"],
    beneficiosDetalhe: [
      "Seleção mundial de profissionais de ensino de inglês para apresentar webinars ao British Council em 2027–2028, com feedback e certificado. Taxa de candidatura e remuneração não divulgadas. Mentoria pode ser oferecida a propostas fortes de candidatos com pouca experiência em palestras.",
    ],
    descricao:
      "Seleção mundial de profissionais de ensino de inglês para apresentar webinars ao British Council em 2027–2028, com feedback e certificado.\n\nSeleção mundial de profissionais de ensino de inglês para apresentar webinars ao British Council em 2027–2028, com feedback e certificado.\n\nCustos: Taxa de candidatura e remuneração não divulgadas. Mentoria pode ser oferecida a propostas fortes de candidatos com pouca experiência em palestras.\n\nTaxa de candidatura: Taxa de candidatura não divulgada.\n\nFinanciamento: Seleção mundial de profissionais de ensino de inglês para apresentar webinars ao British Council em 2027–2028, com feedback e certificado. Taxa de candidatura e remuneração não divulgadas. Mentoria pode ser oferecida a propostas fortes de candidatos com pouca experiência em palestras.\n\nDatas: Webinars entre abril de 2027 e março de 2028. Resultado até 26/02/2027.",
    resumo:
      "Seleção mundial de profissionais de ensino de inglês para apresentar webinars ao British Council em 2027–2028, com feedback e certificado.",
    publico:
      "Professores de inglês e profissionais envolvidos na formação docente, de qualquer país, incluindo Brasil.",
    requisitos: [
      "Professores de inglês e profissionais envolvidos na formação docente, de qualquer país, incluindo Brasil.",
      "All over the world; brasileiros elegíveis.",
      "Experiência prática e proposta relevante para ensino de inglês ou formação docente. Proposta e vídeo em inglês. Vídeo de 40–70 segundos, biografia de até 100 palavras por palestrante e resumo de até 200 palavras. Candidatura individual ou em dupla, conforme as orientações oficiais.",
      "Público profissional; idade mínima não publicada nesta chamada.",
      "Proposta, vídeo e webinar em inglês; não há teste ou nível CEFR publicado.",
    ],
    etapasSelecao: [
      "Proposta individual ou dupla, uma submissão por webinar",
      "Vídeo de apresentação de 40–70 segundos e link compartilhável",
      "Biodata de até 100 palavras por palestrante e abstract de até 200 palavras",
      "Envio no formulário oficial até 15/11/2026",
      "Seleção; resposta até 26/02/2027; possível mentoria para selecionados",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      prazoInscricao: "15/11/2026",
    },
    linkOficial:
      "https://www.teachingenglish.org.uk/teachers/webinars/call-webinar-speakers-2027",
    fontes: [
      "https://www.teachingenglish.org.uk/teachers/webinars/call-webinar-speakers-2027",
      "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=wXVirt3MRkCyoWJFosyj7ELV6PxoJOlBm9M7RSkc4jhURjRPVlM1M01ITU5XVE9UU1lYVUlYTkZLSi4u",
      "https://www.teachingenglish.org.uk/sites/teacheng/files/media/documents/Video_guide_for_webinar_proposals.pdf",
    ],
    local: "Online",
    modalidade: "Online",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Organização internacional",
    verified: true,
  },
  {
    id: "open-english-language-teaching-methods-2026",
    nome: "OPEN — English Language Teaching Methods, Fall 2026",
    instituicaoResponsavel:
      "U.S. Department of State / FHI360 / University of Delaware",
    tipo: "Formação",
    niveis: ["Graduação", "Pós-graduação"],
    destino: ["No exterior"],
    beneficios: ["Gratuito", "Preparação"],
    beneficiosDetalhe: [
      "Formação online gratuita do OPEN com a University of Delaware sobre métodos de ensino de inglês e manejo de sala, com cinco semanas e certificado. Gratuito, com certificado mediante conclusão.",
    ],
    descricao:
      "Formação online gratuita do OPEN com a University of Delaware sobre métodos de ensino de inglês e manejo de sala, com cinco semanas e certificado.\n\nFormação online gratuita do OPEN com a University of Delaware sobre métodos de ensino de inglês e manejo de sala, com cinco semanas e certificado.\n\nCustos: Gratuito, com certificado mediante conclusão.\n\nTaxa de candidatura: Gratuita; inscrição direta, sem seleção por nomeação.\n\nFinanciamento: Formação online gratuita do OPEN com a University of Delaware sobre métodos de ensino de inglês e manejo de sala, com cinco semanas e certificado. Gratuito, com certificado mediante conclusão.\n\nDatas: Orientação a partir de 19/10/2026; curso de 26/10 a 30/11/2026.",
    resumo:
      "Formação online gratuita do OPEN com a University of Delaware sobre métodos de ensino de inglês e manejo de sala, com cinco semanas e certificado.",
    publico:
      "Professores e interessados em ensino de inglês, incluindo brasileiros; inscrição direta sem nomeação de embaixada.",
    requisitos: [
      "Professores e interessados em ensino de inglês, incluindo brasileiros; inscrição direta sem nomeação de embaixada.",
      "Anyone can enroll. MOOC não tem gate de nomeação ou cidadania do Global Online Course (GOC).",
      "Disponibilidade para estudo e atividades em inglês. Inscrição no formulário da turma de outubro de 2026.",
      "Formação destinada a professores e profissionais de ensino de inglês. Idade mínima não publicada.",
      "Conteúdo e atividades em inglês. A chamada do MOOC não publica teste ou nível mínimo obrigatório.",
    ],
    etapasSelecao: [
      "Cadastro de e-mail e consentimentos no formulário oficial Fall 2026",
      "Matrícula no MOOC, sem nomeação por embaixada",
      "Orientação opcional a partir 19/10",
      "Curso facilitado 26/10–30/11 e conclusão para certificado",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      abertura: "21/09/2026",
      prazoInscricao: "23/11/2026",
    },
    linkOficial:
      "https://openenglishcommunity.org/page/massive-open-online-courses-moocs",
    fontes: [
      "https://openenglishcommunity.org/page/massive-open-online-courses-moocs",
      "https://nomination.openenglishprograms.org/ParticipantProfile/WelcomeSurvey/d2357ab8e7204ff758df08df15927ed7",
      "https://s3.us-east-1.amazonaws.com/resources.aeeteacher.org/MOOC%202026%20Printable%20Calendar.pdf",
      "https://exchanges.state.gov/non-us/program/OPEN-Program",
    ],
    local: "Online",
    modalidade: "Online",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Governo / universidade",
    duracao: "Cinco semanas",
    verified: true,
  },
  {
    id: "british-council-ielts-ready",
    nome: "British Council — IELTS Ready, preparação gratuita",
    instituicaoResponsavel: "British Council",
    tipo: "Preparatório",
    niveis: ["Ensino médio", "Ano sabático", "Graduação", "Pós-graduação"],
    destino: ["No exterior"],
    beneficios: ["Gratuito", "Preparação"],
    beneficiosDetalhe: [
      "Preparação gratuita oficial do British Council para o IELTS, com simulados, estudo guiado, podcasts e webinars. IELTS Ready gratuito. O exame é pago separadamente; IELTS Ready Premium depende da reserva do exame com o British Council.",
    ],
    descricao:
      "Preparação gratuita oficial do British Council para o IELTS, com simulados, estudo guiado, podcasts e webinars.\n\nPreparação gratuita oficial do British Council para o IELTS, com simulados, estudo guiado, podcasts e webinars.\n\nCustos: IELTS Ready gratuito. O exame é pago separadamente; IELTS Ready Premium depende da reserva do exame com o British Council.\n\nTaxa de candidatura: Cadastro gratuito da preparação.\n\nFinanciamento: Preparação gratuita oficial do British Council para o IELTS, com simulados, estudo guiado, podcasts e webinars. IELTS Ready gratuito. O exame é pago separadamente; IELTS Ready Premium depende da reserva do exame com o British Council.\n\nDatas: Preparação no próprio ritmo, com acesso contínuo.",
    resumo:
      "Preparação gratuita oficial do British Council para o IELTS, com simulados, estudo guiado, podcasts e webinars.",
    publico: "Interessados em preparar-se para IELTS, incluindo brasileiros.",
    requisitos: [
      "Interessados em preparar-se para IELTS, incluindo brasileiros.",
      "Rota oficial brasileira ativa; sem restrição de nacionalidade ou residência publicada.",
      "Conta própria a partir de 16 anos. Abaixo de 16 anos, conta criada e administrada pelo responsável.",
      "Cadastro próprio a partir de 16 anos; menores de 16 devem pedir ao responsável que crie e administre a conta.",
      "Recursos para IELTS em inglês; sem prova ou nível de entrada publicado.",
    ],
    etapasSelecao: [
      "Criar conta ou entrar; menores de 16 por responsável",
      "Estudar recursos gratuitos e acompanhar progresso",
    ],
    inscricoes: {
      situacaoNaFonte: "rolling",
      continuo: true,
    },
    linkOficial:
      "https://www.britishcouncil.org.br/exame/ielts/preparatorio/ready",
    fontes: [
      "https://www.britishcouncil.org.br/exame/ielts/preparatorio/ready",
      "https://ieltsregistration.britishcouncil.org/ielts-ready-registration",
      "https://www.britishcouncil.ph/sites/default/files/brochure_aug2025.pdf",
    ],
    local: "Online",
    modalidade: "Online",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Organização cultural e educacional",
    verified: true,
  },
  {
    id: "uq-ielts-academic-audit",
    nome: "University of Queensland — IELTS Academic, auditoria gratuita",
    instituicaoResponsavel: "The University of Queensland / edX",
    tipo: "Preparatório",
    niveis: ["Ensino médio", "Ano sabático", "Graduação", "Pós-graduação"],
    destino: ["No exterior"],
    beneficios: ["Gratuito", "Preparação"],
    beneficiosDetalhe: [
      "Preparação de leitura, escrita, escuta e fala, com estudo autônomo e atividades de prática. Carga sugerida de oito semanas, cinco a dez horas semanais. Auditoria não concede certificado. Auditoria gratuita com acesso temporário a conteúdo selecionado. Certificado, avaliações e conteúdo adicional exigem modalidade paga, exibida a USD 219. Exame IELTS não incluído.",
    ],
    descricao:
      "Preparatório de IELTS Academic da University of Queensland, com auditoria gratuita, estudo autônomo e prática das quatro habilidades. Acesso gratuito limitado e sem certificado.\n\nPreparatório de IELTS Academic da University of Queensland, com auditoria gratuita, estudo autônomo e prática das quatro habilidades. Acesso gratuito limitado e sem certificado.\n\nCustos: Auditoria gratuita com acesso temporário a conteúdo selecionado. Certificado, avaliações e conteúdo adicional exigem modalidade paga, exibida a USD 219. Exame IELTS não incluído.\n\nTaxa de candidatura: Sem taxa para opção Audit course.\n\nFinanciamento: Preparação de leitura, escrita, escuta e fala, com estudo autônomo e atividades de prática. Carga sugerida de oito semanas, cinco a dez horas semanais. Auditoria não concede certificado. Auditoria gratuita com acesso temporário a conteúdo selecionado. Certificado, avaliações e conteúdo adicional exigem modalidade paga, exibida a USD 219. Exame IELTS não incluído.\n\nDatas: Estudo autônomo. A matrícula consultada em 03/10/2026 indicava acesso de auditoria até 28/11/2026; o período disponível é informado antes da inscrição.",
    resumo:
      "Preparatório de IELTS Academic da University of Queensland, com auditoria gratuita, estudo autônomo e prática das quatro habilidades. Acesso gratuito limitado e sem certificado.",
    publico:
      "Interessados em preparar-se para IELTS Academic, incluindo brasileiros, a partir de 13 anos; sem pré-requisitos acadêmicos.",
    requisitos: [
      "Interessados em preparar-se para IELTS Academic, incluindo brasileiros, a partir de 13 anos; sem pré-requisitos acadêmicos.",
      "Oferta mundial; Brazil aparece no registro oficial. Restrições territoriais gerais dos termos não excluem Brasil.",
      "Ter pelo menos 13 anos. Estudar conteúdo em inglês. Criar conta edX e escolher a opção Audit course.",
      "Pelo menos 13 anos, conforme termos edX.",
      "Aulas, materiais e transcrições em inglês; sem prova de entrada publicada.",
    ],
    etapasSelecao: [
      "Cadastro na edX",
      "Escolha de auditoria gratuita",
      "Estudo no próprio ritmo",
    ],
    inscricoes: {
      situacaoNaFonte: "rolling",
      continuo: true,
    },
    linkOficial:
      "https://www.edx.org/learn/test-prep/the-university-of-queensland-ielts-academic-test-preparation",
    fontes: [
      "https://www.edx.org/learn/test-prep/the-university-of-queensland-ielts-academic-test-preparation",
      "https://authn.edx.org/register?course_id=course-v1%3AUQx%2BIELTSx%2B1T2022&enrollment_action=enroll&email_opt_in=false",
      "https://www.edx.org/edx-terms-service",
      "https://www.edx.org/resources/how-to-audit-an-edx-class",
      "https://www.youtube.com/watch?v=W6nyvbBknQM",
    ],
    local: "Online",
    modalidade: "Online",
    duracao: "8 semanas, 5–10 horas por semana",
    atualizadoEm: "03/10/2026",
    tipoOrganizacao: "Universidade",
    verified: true,
  },
  {
    id: "kectil-program-formacao-online-de-lideranca2027",
    nome: "Kectil Program — formação online de liderança2027",
    instituicaoResponsavel: "Malmar Knowles Family Foundation / Kectil",
    tipo: "Formação",
    niveis: ["Ensino médio", "Ano sabático", "Graduação"],
    destino: ["No exterior"],
    beneficios: ["Gratuito"],
    beneficiosDetalhe: [
      "Currículo e colaboração internacional online por um ano; certificados dependem do desempenho/participação. Sem promessa de viagem financiada ou bolsa de graduação.",
    ],
    descricao:
      "Formação gratuita online de liderança e projetos comunitários para jovens, com colaboração internacional ao longo de2027.\n\nAmplia repertório, prática de inglês e rede internacional sem viagem ou exigência de graduação prévia.\n\nCustos: Gratuito\n\nTaxa de candidatura: Gratuito\n\nFinanciamento: Currículo e colaboração internacional online por um ano; certificados dependem do desempenho/participação. Sem promessa de viagem financiada ou bolsa de graduação.\n\nDatas: Ano2027, duração de um ano; média indicada de2–3horas/semana.\n\nObservações: Candidatura 2027 até 15/11/2026. Formação online gratuita para jovens de 17 a 26 anos em países em desenvolvimento, incluindo Brasil. Exige participação nas tarefas e no código do programa. Eventuais conferências e viagens têm seleção e condições próprias.",
    resumo:
      "Formação gratuita online de liderança e projetos comunitários para jovens, com colaboração internacional ao longo de2027.",
    publico:
      "Jovens17–26 residentes em países em desenvolvimento, com inglês e acesso à internet; Brasil aparece na lista oficial de países de candidatos2027.",
    requisitos: [
      "Jovens17–26 residentes em países em desenvolvimento, com inglês e acesso à internet; Brasil aparece na lista oficial de países de candidatos2027.",
      "Residentes em países em desenvolvimento; Brasil consta entre países de candidatos2027.",
      "Sem diploma mínimo publicado; liderança, inovação ou serviço comunitário demonstrados. Formulário permite escolaridade abaixo do médio.",
      "17–26 no público oficial; faixas externas dependem de avaliação e não foram generalizadas.",
      "Leitura/escrita e participação em inglês; nenhuma nota de teste numérica publicada.",
    ],
    etapasSelecao: [
      "Consultar as etapas e os documentos na página oficial da candidatura.",
    ],
    local: "Online / comunidade local do participante",
    linkOficial: "https://kectil.com/program/who-can-apply",
    fontes: [
      "https://kectil.com/program/who-can-apply",
      "https://kectil.com/apply",
      "https://kectil.com/program/year",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      prazoInscricao: "15/11/2026",
      nota: "Candidatura 2027 até 15/11/2026. Formação online gratuita para jovens de 17 a 26 anos em países em desenvolvimento, incluindo Brasil. Exige participação nas tarefas e no código do programa. Eventuais conferências e viagens têm seleção e condições próprias.",
    },
    atualizadoEm: "03/10/2026",
    pais: "Online",
    modalidade: "Online",
    verified: true,
  },
  {
    id: "responsible-ai-in-a-global-context-certificado-unu",
    nome: "Responsible AI in a Global Context — certificado UNU",
    instituicaoResponsavel:
      "United Nations University / Microsoft / LinkedIn Learning",
    tipo: "Formação",
    niveis: ["Ensino médio", "Ano sabático", "Graduação"],
    destino: ["No exterior"],
    beneficios: [],
    beneficiosDetalhe: [
      "Acesso à trilha e badge ou certificado conforme conclusão. Não há benefício financeiro.",
    ],
    descricao:
      "Trilha gratuita da Universidade das Nações Unidas sobre impacto global, riscos, governança e casos reais de IA.\n\nFormação internacional online sem diploma prévio, útil para estudantes16+ interessados em tecnologia, políticas públicas e cooperação.\n\nCustos: Gratuito; nenhuma assinatura paga exigida na descrição oficial específica.\n\nTaxa de candidatura: Gratuito segundo a organizadora UNU; certificado exige login e conclusão.\n\nFinanciamento: Acesso à trilha e badge ou certificado conforme conclusão. Não há benefício financeiro.\n\nDatas: Disponível desdeabril2026; contínuo, sem data de fechamento publicada.\n\nObservações: Trilha gratuita em inglês com três cursos e cerca de quatro horas. Certificado ou badge exige conta e conclusão. Idade mínima da plataforma: 16 anos. Não é diploma acadêmico.",
    resumo:
      "Trilha gratuita da Universidade das Nações Unidas sobre impacto global, riscos, governança e casos reais de IA.",
    publico:
      "Curso online sem restrição de nacionalidade/residência declarada; usuário LinkedIn deve ter16+ e cumprir elegibilidade da conta. Contrato prevê usuários foraEU/EEA/Suíça, inclusiveBrasil.",
    requisitos: [
      "Curso online sem restrição de nacionalidade/residência declarada; usuário LinkedIn deve ter16+ e cumprir elegibilidade da conta. Contrato prevê usuários foraEU/EEA/Suíça, inclusiveBrasil.",
      "Nenhuma restrição geográfica/de nacionalidade nas regras da trilha; contrato prevê membros foraDesignatedCountries.",
      "Sem requisito de diploma ou matrícula; conteúdo não técnico nívelgeneral.",
      "16+ conforme LinkedIn; cumprir elegibilidade legal da conta.",
      "Inglês nesta rota; anúncio menciona versão japonesa, não prometida tradução portuguesa.",
    ],
    etapasSelecao: [
      "Consultar as etapas e os documentos na página oficial da candidatura.",
    ],
    local: "Online",
    linkOficial:
      "https://unu.edu/egov/news/unu-egov-researcher-contributes-global-responsible-ai-certificate",
    fontes: [
      "https://unu.edu/egov/news/unu-egov-researcher-contributes-global-responsible-ai-certificate",
      "https://www.linkedin.com/legal/user-agreement",
      "https://www.linkedin.com/learning/paths/responsible-ai-in-a-global-context-professional-certificate-by-the-united-nations-university",
      "https://www.linkedin.com/learning/understanding-ai-s-global-impact-governance-equity-and-responsibility",
    ],
    inscricoes: {
      situacaoNaFonte: "rolling",
      continuo: true,
      nota: "Trilha gratuita em inglês com três cursos e cerca de quatro horas. Certificado ou badge exige conta e conclusão. Idade mínima da plataforma: 16 anos. Não é diploma acadêmico.",
    },
    atualizadoEm: "03/10/2026",
    pais: "Online",
    modalidade: "Online",
    verified: true,
  },
  {
    id: "assist-scholars",
    nome: "ASSIST Scholars — Intercâmbio com bolsas 2027–2028",
    instituicaoResponsavel: "ASSIST Scholars",
    tipo: "Intercâmbio",
    tipoOrganizacao: "Organização sem fins lucrativos",
    resumo:
      "Seleção de estudantes internacionais para um ano em escolas particulares norte-americanas com bolsas e taxa de programa.",
    descricao:
      "Seleção de estudantes internacionais para um ano em escolas particulares norte-americanas com bolsas e taxa de programa.\n\nOferece intercâmbio escolar com apoio significativo; contribuição familiar precisa ser avaliada.\n\nCustos: Na rota All Other Countries, taxa Sanderson de US$ 15.000 e custo Lindfors de US$ 37.500. Reduções conforme necessidade, de até 80%, dependem de avaliação. Viagem, visto, seguro e despesas pessoais ficam com a família.\n\nTaxa de candidatura: US$ 35, sem isenção.\n\nFinanciamento: Sanderson cobre a mensalidade escolar e moradia/refeições ou família anfitriã. Lindfors cobre aproximadamente metade. Redução da taxa de programa conforme necessidade, sem garantia.\n\nDatas: Ano acadêmico 2027–2028, com dez meses. Entrevistas em janeiro e decisões em fevereiro.\n\nObservações: Horário de inscrição: Consulte o horário no edital ou regulamento oficial.",
    destino: ["No exterior"],
    niveis: ["Ensino médio", "Ano sabático"],
    beneficios: ["Bolsa parcial", "Mensalidade", "Moradia"],
    beneficiosDetalhe: [
      "Sanderson cobre a mensalidade escolar e moradia/refeições ou família anfitriã. Lindfors cobre aproximadamente metade. Redução da taxa de programa conforme necessidade, sem garantia.",
    ],
    local: "Escolas parceiras nos Estados Unidos",
    pais: "Estados Unidos",
    modalidade: "Presencial",
    duracao: "10 meses",
    publico:
      "Estudantes internacionais de 14–18 anos que vivem fora dos EUA. Normalmente entram nas séries 10 ou 11; existem vagas limitadas na série 12 e no ano após o ensino médio. O Brasil segue a rota All Other Countries.",
    requisitos: [
      "Estudantes internacionais de 14–18 anos que vivem fora dos EUA. Normalmente entram nas séries 10 ou 11; existem vagas limitadas na série 12 e no ano após o ensino médio. O Brasil segue a rota All Other Countries.",
      "Candidatos de qualquer país fora dos EUA. Residentes nos EUA não são elegíveis. O Brasil não aparece nas exclusões de países citadas pelo organizador.",
      "Boas notas, equivalentes a A/B, compromisso de permanecer dez meses e de retornar ao país de origem.",
      "14–18 anos.",
      "Inglês avançado exigido; teste Duolingo pode ser solicitado até 15 de dezembro.",
    ],
    etapasSelecao: [
      "Candidatura e documentos até 01/12/2026",
      "Duolingo, se solicitado, até 15/12",
      "Entrevista em janeiro",
      "Decisão em fevereiro",
    ],
    inscricoes: {
      situacaoNaFonte: "open",
      prazoInscricao: "01/12/2026",
      nota: "Horário de inscrição: Consulte o horário no edital ou regulamento oficial.",
    },
    atualizadoEm: "03/10/2026",
    linkOficial: "https://www.assistscholars.org/en/location/other-countries/",
    fontes: [
      "https://www.assistscholars.org/en/location/other-countries/",
      "https://www.assistscholars.org/en/scholarship/faqs/",
      "https://assistscholars.fsenrollment.com/",
    ],
    verified: true,
  },
] satisfies Program[];

export const RADAR_PROGRAMS: Program[] = reviewedPrograms.map((program) => {
  const display = radarPresentation(program.nome);
  return display
    ? {
        ...program,
        nome: display.name,
        resumo: display.summary,
        publico: display.audience,
        imagem: display.image,
      }
    : program;
});
