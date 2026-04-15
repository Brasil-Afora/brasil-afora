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
    return `Faltam ${daysRemaining} dias`;
  }
  if (daysRemaining === 0) {
    return "Termina hoje";
  }
  return "Prazo encerrado";
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
