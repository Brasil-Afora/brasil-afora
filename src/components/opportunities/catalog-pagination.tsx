import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface CatalogPaginationProps {
  onChange: (page: number) => void;
  page: number;
  pageCount: number;
}

const EDGE_PAGES = 1;
const NEIGHBOR_PAGES = 1;

/** Page numbers to show, with null standing for an ellipsis. */
const visiblePages = (page: number, pageCount: number): (number | null)[] => {
  const pages: (number | null)[] = [];
  for (let current = 1; current <= pageCount; current += 1) {
    const nearEdge = current <= EDGE_PAGES || current > pageCount - EDGE_PAGES;
    const nearCurrent = Math.abs(current - page) <= NEIGHBOR_PAGES;
    if (nearEdge || nearCurrent) {
      pages.push(current);
    } else if (pages.at(-1) !== null) {
      pages.push(null);
    }
  }
  return pages;
};

const stepClassName =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-navy-700 text-slate-100 transition-colors hover:border-navy-600 hover:bg-navy-800 disabled:pointer-events-none disabled:opacity-40";

const CatalogPagination = ({
  onChange,
  page,
  pageCount,
}: CatalogPaginationProps) => (
  <nav aria-label="Paginação dos resultados">
    <ul className="flex items-center gap-1.5">
      <li>
        <button
          aria-label="Página anterior"
          className={stepClassName}
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          type="button"
        >
          <ChevronLeftIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      </li>
      {visiblePages(page, pageCount).map((entry, index) =>
        entry === null ? (
          <li
            aria-hidden="true"
            className="w-6 text-center text-mist"
            // biome-ignore lint/suspicious/noArrayIndexKey: ellipses have no identity of their own.
            key={`gap-${index}`}
          >
            …
          </li>
        ) : (
          <li key={entry}>
            <button
              aria-current={entry === page ? "page" : undefined}
              aria-label={`Página ${entry}`}
              className={`h-10 min-w-10 rounded-lg px-2 font-semibold text-[14px] tabular-nums transition-colors ${entry === page ? "bg-signal text-navy-950" : "text-slate-100 hover:bg-navy-800"}`}
              onClick={() => onChange(entry)}
              type="button"
            >
              {entry}
            </button>
          </li>
        )
      )}
      <li>
        <button
          aria-label="Próxima página"
          className={stepClassName}
          disabled={page === pageCount}
          onClick={() => onChange(page + 1)}
          type="button"
        >
          <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      </li>
    </ul>
  </nav>
);

export default CatalogPagination;
