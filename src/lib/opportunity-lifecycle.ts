export interface OpportunityLifecycleFields {
  applicationLinkStatus?: string | null;
  applicationUrl?: string | null;
  canApply?: boolean | null;
  lastVerifiedAt?: string | null;
  lifecycleStatus?: string | null;
  linkOficial: string;
}

const ACTIVE_STATES = new Set(["closing_soon", "extended", "open"]);
const UPCOMING_STATES = new Set([
  "announced",
  "applications_not_open",
  "expected",
]);
const CLOSED_STATES = new Set(["archived", "cancelled", "closed", "completed"]);
const UNUSABLE_LINK_STATES = new Set([
  "broken",
  "generic_homepage",
  "login_only",
  "old_edition",
  "results_page",
]);

const effectiveApplyPermission = (
  opportunity: OpportunityLifecycleFields
): boolean =>
  opportunity.canApply === true ||
  (opportunity.canApply == null &&
    opportunity.applicationLinkStatus === "current_and_open");

export const shouldShowDeadlineCountdown = (
  opportunity: OpportunityLifecycleFields
): boolean =>
  !opportunity.lifecycleStatus ||
  ACTIVE_STATES.has(opportunity.lifecycleStatus) ||
  UPCOMING_STATES.has(opportunity.lifecycleStatus);

export const getOpportunityLifecycleLabel = (
  opportunity: OpportunityLifecycleFields
): string | null => {
  if (!opportunity.lifecycleStatus) {
    return null;
  }
  if (opportunity.lifecycleStatus === "cancelled") {
    return "Cancelada";
  }
  if (CLOSED_STATES.has(opportunity.lifecycleStatus)) {
    return "Inscrições encerradas";
  }
  if (UPCOMING_STATES.has(opportunity.lifecycleStatus)) {
    return "Inscrições ainda não abertas";
  }
  if (
    ACTIVE_STATES.has(opportunity.lifecycleStatus) &&
    effectiveApplyPermission(opportunity)
  ) {
    return "Inscrições abertas";
  }
  if (ACTIVE_STATES.has(opportunity.lifecycleStatus)) {
    if (opportunity.applicationLinkStatus === "closed") {
      return "Inscrições encerradas";
    }
    if (opportunity.applicationLinkStatus === "current_but_not_open") {
      return "Inscrições ainda não abertas";
    }
    if (
      opportunity.applicationLinkStatus &&
      UNUSABLE_LINK_STATES.has(opportunity.applicationLinkStatus)
    ) {
      return "Link de inscrição indisponível";
    }
    return "Confirme o link de inscrição";
  }
  return "Situação não confirmada";
};

export const getOpportunityLifecycleBadgeClass = (
  opportunity: OpportunityLifecycleFields
): string => {
  if (
    opportunity.lifecycleStatus &&
    CLOSED_STATES.has(opportunity.lifecycleStatus)
  ) {
    return "bg-slate-700 text-white";
  }
  if (
    opportunity.lifecycleStatus &&
    UPCOMING_STATES.has(opportunity.lifecycleStatus)
  ) {
    return "bg-amber-400 text-black";
  }
  if (
    opportunity.lifecycleStatus &&
    ACTIVE_STATES.has(opportunity.lifecycleStatus) &&
    effectiveApplyPermission(opportunity)
  ) {
    return "bg-green-500 text-black";
  }
  return "bg-slate-700 text-white";
};

export const getApplicationTarget = (
  opportunity: OpportunityLifecycleFields
): { available: boolean; href: string; label: string } => {
  const structured = Boolean(
    opportunity.lifecycleStatus ||
      opportunity.applicationLinkStatus ||
      opportunity.canApply != null
  );
  if (!structured) {
    const href = opportunity.applicationUrl;
    return {
      available: Boolean(href),
      href: href || "#",
      label: href ? "Aplicar agora" : "Inscrição não confirmada",
    };
  }
  const available =
    Boolean(opportunity.applicationUrl) &&
    Boolean(
      opportunity.lifecycleStatus &&
        ACTIVE_STATES.has(opportunity.lifecycleStatus)
    ) &&
    effectiveApplyPermission(opportunity);
  return {
    available,
    href: opportunity.applicationUrl || "#",
    label: available
      ? "Aplicar agora"
      : (getOpportunityLifecycleLabel(opportunity) ??
        "Inscrição não confirmada"),
  };
};

export const formatLastVerifiedAt = (
  value: string | null | undefined
): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
};
