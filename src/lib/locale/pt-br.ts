/**
 * Canonical pt-BR locale primitives.
 *
 * Single source of truth for locale, time zone and pt-BR formatting. Countdown
 * math elsewhere (e.g. `getBrasiliaDaysUntil`) must derive "today" from
 * {@link PT_BR_TIME_ZONE} so server and browser agree regardless of where the
 * code runs. UI copy lives in `@/lib/copy/pt-br`, never here.
 */

export const PT_BR_LOCALE = "pt-BR" as const;

/** Official Brasília time: every deadline is read in this zone. */
export const PT_BR_TIME_ZONE = "America/Sao_Paulo" as const;

/** 01/09/2026 — the all-over date shape. */
export const formatDateShortBr = (date: Date): string =>
  new Intl.DateTimeFormat(PT_BR_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    timeZone: PT_BR_TIME_ZONE,
    year: "numeric",
  }).format(date);

/** 1 de setembro de 2026 — for sentences and distant deadlines. */
export const formatDateLongBr = (date: Date): string =>
  new Intl.DateTimeFormat(PT_BR_LOCALE, {
    day: "numeric",
    month: "long",
    timeZone: PT_BR_TIME_ZONE,
    year: "numeric",
  }).format(date);

export const formatNumberBr = (value: number): string =>
  new Intl.NumberFormat(PT_BR_LOCALE).format(value);
