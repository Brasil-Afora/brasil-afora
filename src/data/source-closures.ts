import type { MasterRecord } from "@/lib/curated-import/master";

interface SourceClosure {
  checkedOn: string;
  /** The published deadline this closure was checked against. */
  deadline: string;
  evidence: string;
}

/**
 * Rounds the official page closed before the deadline they were published
 * with. Keyed by edition id; a closure only holds while the record still
 * carries the deadline it was checked against, so a newly published cycle is
 * never hidden by an old one.
 */
const SOURCE_CLOSURES: Record<string, SourceClosure> = {
  // MPOWER Global Citizen Scholarship
  "c657bdc0-0569-4435-ae6c-fb7f60f47d9e": {
    deadline: "2026-12-31",
    checkedOn: "2026-10-19",
    evidence:
      "https://www.mpowerfinancing.com/scholarships/global-citizen: funding capacity for 2026 reached, not accepting new applications.",
  },
  // MPOWER Women in STEM Scholarship
  "81e79368-6bf0-41d4-a29d-fb5a94de1943": {
    deadline: "2026-12-31",
    checkedOn: "2026-10-19",
    evidence:
      "https://www.mpowerfinancing.com/scholarships/women-in-stem: funding capacity for 2026 reached, not accepting new applications.",
  },
  // Lester B. Pearson International Scholarship
  "85b49af1-08cc-4cb7-a933-c6b7275f22ec": {
    deadline: "2026-11-06",
    checkedOn: "2026-10-19",
    evidence:
      "https://future.utoronto.ca/pearson-scholarships: school nomination closed 2026-10-09 and OUAC admission 2026-10-16; 2026-11-06 is only for students already nominated.",
  },
};

export const isClosedAtSource = (
  id: string | undefined,
  source: Pick<MasterRecord, "deadline">
): boolean => {
  const closure = id ? SOURCE_CLOSURES[id] : undefined;
  return closure !== undefined && closure.deadline === source.deadline;
};

export const applySourceClosure = <T extends MasterRecord>(
  id: string | undefined,
  source: T
): T =>
  isClosedAtSource(id, source)
    ? { ...source, applications_status: "closed" }
    : source;
