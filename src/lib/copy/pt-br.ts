/**
 * Centralized pt-BR UI copy (audit foundation).
 *
 * The app ships pt-BR only. Instead of scattering literals across components,
 * high-traffic surfaces (header, hero, footer, countdowns, metadata) read from
 * here so a future `en` dictionary can slot in without hunting call sites.
 *
 * Migration status: header nav, hero, homepage footer, countdowns and site
 * metadata are wired. Auth, catalog filters, detail sections, profile and mail
 * templates still hold local literals — migrate them to new keys here when
 * touched, following the same `XxxCopy` grouping.
 */

export const siteCopy = {
  brand: "Brasil Afora",
  description:
    "Conecte-se às melhores oportunidades, bolsas e feiras, no Brasil e no mundo. Tudo em um só lugar para impulsionar seu futuro!",
  locale: "pt-BR",
  title: "Brasil Afora: encontre oportunidades acadêmicas",
} as const;

export const navCopy = {
  admin: "Admin",
  home: "Início",
  international: "Internacional",
  map: "Mapa",
  myAccount: "Minha Conta",
  national: "Nacional",
  navigation: "Navegação",
  profile: "Perfil",
  programs: "Programas e Bolsas",
  /** Where the full label doesn't fit (tablet header). */
  programsShort: "Programas",
  signIn: "Entrar",
  signOut: "Sair",
  signUp: "Cadastrar",
} as const;

export const heroCopy = {
  handNote: ["Mais conhecimento", "para um futuro", "maior."],
  photoBy: "Foto:",
  photosPause: "Pausar as fotos",
  photosPlay: "Continuar as fotos",
  lede: "Bolsas de estudo, summer programs, intercâmbios, olimpíadas e feiras para estudantes brasileiros de todos os níveis, no Brasil e no mundo.",
  title: "Sua jornada acadêmica não tem fronteiras",
  verified: "Seleção verificada em fontes oficiais",
  verifiedCheckedOn: (date: string): string => `Conferida em ${date}`,
} as const;

export const footerCopy = {
  mapLocations: "Localizações do mapa:",
  tagline: "Brasil Afora · oportunidades acadêmicas no Brasil e no mundo.",
  topPhotos:
    "Fotos do topo: Wikimedia Commons; o autor e a licença de cada uma aparecem junto da foto.",
} as const;

export const countdownCopy = {
  closed: "Prazo encerrado",
  daysToGo: (days: number): string => `Faltam ${days} dias`,
  endsToday: "Termina hoje",
  lastDay: "último dia",
  manyDaysLeft: (days: number): string => `faltam ${days} dias`,
  oneDayLeft: "falta 1 dia",
} as const;

export const commonCopy = {
  officialSource: "Fonte oficial",
  viewDetails: "Ver detalhes",
} as const;
