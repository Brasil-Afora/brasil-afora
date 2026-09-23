import { countdownCopy } from "@/lib/copy/pt-br";
import { PT_BR_TIME_ZONE } from "@/lib/locale/pt-br";

export function getDaysRemaining(deadlineString: string): number | null {
  if (typeof deadlineString !== "string" || deadlineString.length < 10) {
    return null;
  }

  const parts = deadlineString.split("/");
  if (parts.length !== 3) {
    return null;
  }

  const day = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10) - 1;
  const year = Number.parseInt(parts[2], 10);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return null;
  }

  const deadline = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const timeDiff = deadline.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

export function getTimeRemaining(deadlineString: string): string | null {
  const daysRemaining = getDaysRemaining(deadlineString);
  if (daysRemaining === null) {
    return null;
  }

  if (daysRemaining > 0) {
    return countdownCopy.daysToGo(daysRemaining);
  }
  if (daysRemaining === 0) {
    return countdownCopy.endsToday;
  }
  return countdownCopy.closed;
}

const MS_PER_DAY = 86_400_000;
const BR_DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

// "en-CA" renders YYYY-MM-DD on purpose (an ISO-shaped day bucket for math),
// not user-facing copy. Display formatting lives in `@/lib/locale/pt-br`.
const brasiliaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PT_BR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Whole days from today in Brasília to a dd/mm/yyyy deadline, independent of
 * the server's own time zone. 0 means the deadline is today.
 */
export function getBrasiliaDaysUntil(
  deadlineString: string,
  now: Date = new Date()
): number | null {
  const match = BR_DATE_REGEX.exec(deadlineString.trim());
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const deadlineUtc = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const parsed = new Date(deadlineUtc);
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  const [todayYear, todayMonth, todayDay] = brasiliaDateFormatter
    .format(now)
    .split("-")
    .map(Number);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);

  return Math.round((deadlineUtc - todayUtc) / MS_PER_DAY);
}

export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft <= 0) {
    return countdownCopy.lastDay;
  }
  if (daysLeft === 1) {
    return countdownCopy.oneDayLeft;
  }
  return countdownCopy.manyDaysLeft(daysLeft);
}

/** "2026-09-01" → "01/09/2026"; anything else is returned unchanged. */
export function formatIsoDateBr(isoDate: string): string {
  const match = ISO_DATE_REGEX.exec(isoDate);
  if (!match) {
    return isoDate;
  }
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function isOpportunityDeadlineOpen(deadlineString: string): boolean {
  const daysRemaining = getBrasiliaDaysUntil(deadlineString);
  return daysRemaining !== null && daysRemaining >= 0;
}

export function getTimeRemainingBadgeClass(deadlineString: string): string {
  const daysRemaining = getDaysRemaining(deadlineString);

  if (daysRemaining === null) {
    return "bg-slate-700 text-white";
  }

  if (daysRemaining <= 5) {
    return "bg-red-500 text-white";
  }

  if (daysRemaining <= 20) {
    return "bg-orange-500 text-black";
  }

  if (daysRemaining <= 30) {
    return "bg-yellow-400 text-black";
  }

  return "bg-emerald-500 text-black";
}
