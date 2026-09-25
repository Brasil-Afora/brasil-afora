import costProfiles from "@/data/cost-profiles.json";

// What an opportunity costs the student and what funding it offers, read from
// each record's own cost/funding text and stored in src/data/cost-profiles.json
// (keyed by record id). The research keeps these as free prose, so without this
// file the catalog can neither filter by funding nor show a price on the card.
// A price the organizer doesn't publish stays absent; it is never estimated.

/**
 * - full: everyone selected has the program (and its room and board) covered.
 * - full_possible: full coverage exists but depends on need or a limited pool.
 * - partial: aid exists but never covers everything.
 * - none: the organizer states there is no aid.
 * Unknown funding has no entry.
 */
export type FundingLevel = "full" | "full_possible" | "partial" | "none";

export type Price =
  | { kind: "free" }
  /** Free through a public school; private schools pay. */
  | { kind: "free_public_school" }
  /** Costs something, but the scholarship pays it for everyone selected. */
  | { kind: "covered" }
  /** The participant is paid a stipend. */
  | { kind: "stipend" }
  /** Paid, but the organizer publishes no amount. */
  | { kind: "paid" }
  | {
      amount: number;
      currency: string;
      /** The lowest of several published prices. */
      from?: boolean;
      kind: "amount";
    };

export type ApplicationFee = "free" | "free_public_school" | "paid";

export interface CostProfile {
  applicationFee?: ApplicationFee;
  funding?: FundingLevel;
  price?: Price;
}

interface CostProfilesFile {
  exchangeRates: {
    brlPerUnit: Record<string, number>;
    date: string;
    source: string;
  };
  profiles: Record<string, CostProfile & { name: string }>;
}

const data = costProfiles as CostProfilesFile;

export const EXCHANGE_RATES = data.exchangeRates;

export const getCostProfile = (id: string): CostProfile | undefined => {
  const entry = data.profiles[id];
  if (!entry) {
    return;
  }
  const { applicationFee, funding, price } = entry;
  return { applicationFee, funding, price };
};

/** The price in reais at the file's exchange rate, or null when there is no amount. */
export const priceInBrl = (price: Price | undefined): number | null => {
  if (price?.kind !== "amount") {
    return null;
  }
  if (price.currency === "BRL") {
    return price.amount;
  }
  const rate = data.exchangeRates.brlPerUnit[price.currency];
  return rate ? price.amount * rate : null;
};

const brlExact = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    style: "currency",
  }).format(value);

/** Keeps "R$" and its number on one line, as Intl does. */
const NBSP = "\u00a0";

/** Converted amounts are rounded so they read as the estimates they are. */
const brlApproximate = (value: number): string => {
  if (value >= 10_000) {
    return `R$${NBSP}${Math.round(value / 1000)}${NBSP}mil`;
  }
  if (value >= 1000) {
    const thousands = Math.round(value / 100) / 10;
    return `R$${NBSP}${thousands.toLocaleString("pt-BR")}${NBSP}mil`;
  }
  return `R$${NBSP}${Math.max(10, Math.round(value / 10) * 10)}`;
};

const originalAmount = (amount: number, currency: string): string =>
  new Intl.NumberFormat("pt-BR", {
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    style: "currency",
  }).format(amount);

const PRICE_LABELS = {
  covered: "Coberto pela bolsa",
  free: "Gratuito",
  free_public_school: "Grátis na escola pública",
  paid: "Pago · valor não divulgado",
  stipend: "Com auxílio mensal",
} as const;

export const PRICE_UNKNOWN_LABEL = "Preço não informado";

/** Short price for a card: "≈ R$ 39 mil", "R$ 159,90", "Gratuito". */
export const priceLabel = (price: Price | undefined): string | null => {
  if (!price) {
    return null;
  }
  if (price.kind !== "amount") {
    return PRICE_LABELS[price.kind];
  }
  const brl = priceInBrl(price);
  if (brl === null) {
    return originalAmount(price.amount, price.currency);
  }
  const value =
    price.currency === "BRL" ? brlExact(brl) : `≈ ${brlApproximate(brl)}`;
  return price.from ? `A partir de ${value}` : value;
};

/** Price with the published amount and the conversion it came from, for the detail page. */
export const priceDetail = (price: Price | undefined): string | null => {
  if (price?.kind !== "amount" || price.currency === "BRL") {
    return priceLabel(price);
  }
  const brl = priceInBrl(price);
  const published = originalAmount(price.amount, price.currency);
  const lead = price.from ? `A partir de ${published}` : published;
  if (brl === null) {
    return lead;
  }
  const [year, month, day] = data.exchangeRates.date.split("-");
  return `${lead} (cerca de ${brlApproximate(brl)} pelo câmbio de ${day}/${month}/${year})`;
};

export const PRICE_BANDS = [
  "Gratuito",
  "Até R$ 1 mil",
  "R$ 1 mil a 10 mil",
  "R$ 10 mil a 30 mil",
  "Acima de R$ 30 mil",
  "Valor não divulgado",
] as const;

export type PriceBand = (typeof PRICE_BANDS)[number];

/**
 * The band a student filters by: what taking part costs them. A scholarship
 * that pays for everyone selected, a stipend and a public-school exemption
 * all count as free; "a partir de" prices use their lowest amount.
 */
export const priceBand = (price: Price | undefined): PriceBand => {
  if (!price || price.kind === "paid") {
    return "Valor não divulgado";
  }
  if (price.kind !== "amount") {
    return "Gratuito";
  }
  const brl = priceInBrl(price);
  if (brl === null) {
    return "Valor não divulgado";
  }
  if (brl <= 1000) {
    return "Até R$ 1 mil";
  }
  if (brl <= 10_000) {
    return "R$ 1 mil a 10 mil";
  }
  if (brl <= 30_000) {
    return "R$ 10 mil a 30 mil";
  }
  return "Acima de R$ 30 mil";
};

/** Card and detail label for the funding a record offers. */
export const fundingLabel = (
  funding: FundingLevel | undefined
): string | null => {
  switch (funding) {
    case "full":
      return "Bolsa integral";
    case "full_possible":
      return "Bolsa de até 100%";
    case "partial":
      return "Bolsa parcial";
    default:
      return null;
  }
};

export const FUNDING_OPTIONS = ["Integral", "Parcial", "Sem bolsa"] as const;

/**
 * The funding filter option a record answers to. Need-based or limited full
 * scholarships count as "Integral": the student who can't pay is the one who
 * filters for it, and for them the program can be free.
 */
export const fundingOption = (
  funding: FundingLevel | undefined
): (typeof FUNDING_OPTIONS)[number] | null => {
  switch (funding) {
    case "full":
    case "full_possible":
      return "Integral";
    case "partial":
      return "Parcial";
    case "none":
      return "Sem bolsa";
    default:
      return null;
  }
};
