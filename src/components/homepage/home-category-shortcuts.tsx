"use client";

import {
  BookOpenCheckIcon,
  FlaskConicalIcon,
  GraduationCapIcon,
  type LucideIcon,
  PlaneIcon,
  SlidersHorizontalIcon,
  SunIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import { OPPORTUNITY_FILTER_STORAGE_KEYS } from "@/hooks/use-opportunity-filters";
import { CATALOG_PATHS, type OpportunityScope } from "./home-data";

interface CategoryShortcut {
  filters: Record<string, string[]>;
  icon: LucideIcon;
  label: string;
  scope: OpportunityScope;
}

// Each shortcut opens a catalog with these filters applied. Values must match
// the catalog filter options in src/components/opportunities/filter-options.ts.
const CATEGORY_SHORTCUTS: CategoryShortcut[] = [
  {
    label: "Bolsas de estudo",
    icon: GraduationCapIcon,
    scope: "international",
    filters: { tipoBolsa: ["Completa", "Parcial"] },
  },
  {
    label: "Summer programs",
    icon: SunIcon,
    scope: "international",
    filters: { tipo: ["Curso de verão"] },
  },
  {
    label: "Intercâmbios",
    icon: PlaneIcon,
    scope: "international",
    filters: { tipo: ["Intercâmbio cultural", "Mobilidade acadêmica"] },
  },
  {
    label: "Olimpíadas",
    icon: TrophyIcon,
    scope: "national",
    filters: { tipo: ["Olimpíadas"] },
  },
  {
    label: "Feiras de ciências",
    icon: FlaskConicalIcon,
    scope: "national",
    filters: { tipo: ["Feiras de Ciências"] },
  },
  {
    label: "Mestrado e doutorado",
    icon: BookOpenCheckIcon,
    scope: "international",
    filters: { nivelEnsino: ["Mestrado", "Doutorado"] },
  },
];

const presetCatalogFilters = ({ filters, scope }: CategoryShortcut) => {
  try {
    window.sessionStorage.setItem(
      OPPORTUNITY_FILTER_STORAGE_KEYS[scope],
      JSON.stringify(filters)
    );
  } catch {
    // Storage can be unavailable (private mode); the catalog still opens.
  }
};

const chipClassName =
  "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-navy-700 bg-navy-900/70 px-4 text-[14px] text-slate-100 transition-[border-color,background-color,color] duration-200 hover:border-signal/60 hover:bg-navy-800 hover:text-white focus-visible:border-signal focus-visible:outline-none";

const HomeCategoryShortcuts = () => (
  <nav
    aria-label="Atalhos por categoria"
    className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
  >
    <ul className="flex w-max gap-2.5 sm:w-auto sm:flex-wrap">
      {CATEGORY_SHORTCUTS.map((shortcut) => {
        const Icon = shortcut.icon;
        return (
          <li key={shortcut.label}>
            <Link
              className={chipClassName}
              href={CATALOG_PATHS[shortcut.scope]}
              onClick={() => presetCatalogFilters(shortcut)}
            >
              <Icon aria-hidden="true" className="h-4 w-4 text-mist" />
              {shortcut.label}
            </Link>
          </li>
        );
      })}
      <li>
        <Link className={chipClassName} href={CATALOG_PATHS.international}>
          <SlidersHorizontalIcon
            aria-hidden="true"
            className="h-4 w-4 text-mist"
          />
          Mais filtros
        </Link>
      </li>
    </ul>
  </nav>
);

export default HomeCategoryShortcuts;
