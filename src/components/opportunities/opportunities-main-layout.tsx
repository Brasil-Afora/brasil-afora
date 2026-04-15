"use client";

import {
  CheckIcon,
  CircleXIcon,
  FilterIcon,
  type LucideIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type AccentColor = "amber" | "blue";

interface AppliedFilter {
  key: string;
  value: string;
}

interface OpportunitiesMainLayoutProps {
  accentColor: AccentColor;
  appliedFilters: AppliedFilter[];
  children: ReactNode;
  error: string | null;
  filterComponent: ReactNode;
  icon: LucideIcon;
  isFilterActive: boolean;
  loading: boolean;
  mobileFilterComponent: ReactNode;
  onApplyMobileFilters: () => void;
  onClearFilters: () => void;
  onRemoveFilter: (key: string, value: string) => void;
  resultCount: number;
  subtitle: string;
  title: string;
}

const OpportunitiesMainLayout = ({
  title,
  subtitle,
  icon: Icon,
  accentColor,
  loading,
  error,
  isFilterActive,
  resultCount,
  appliedFilters,
  onRemoveFilter,
  onClearFilters,
  onApplyMobileFilters,
  filterComponent,
  mobileFilterComponent,
  children,
}: OpportunitiesMainLayoutProps) => {
  const [showTitle, setShowTitle] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowTitle(true), 100);
    const timer2 = setTimeout(() => setShowContent(true), 300);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const baseTransition = "transition-all duration-500 ease-in-out transform";

  const accentClasses = {
    text: accentColor === "blue" ? "text-blue-400" : "text-amber-500",
    border:
      accentColor === "blue" ? "border-blue-500/20" : "border-amber-500/20",
    button:
      accentColor === "blue"
        ? "bg-blue-500 hover:bg-blue-600 text-white"
        : "bg-amber-500 hover:bg-amber-600 text-black",
    hoverText:
      accentColor === "blue" ? "hover:text-blue-400" : "hover:text-amber-500",
  };

  const handleToggleFilterSidebar = () => {
    setShowFilter((prev) => !prev);
  };

  const handleApplyFilters = () => {
    onApplyMobileFilters();
    setShowFilter(false);
  };

  const handleClearAllFilters = () => {
    onClearFilters();
    setShowFilter(false);
  };

  const renderAppliedFilters = () => (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white">
      {appliedFilters.map((filter) => (
        <span
          className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-white"
          key={`${filter.key}-${filter.value}`}
        >
          {filter.value}
          <Button
            className="text-white opacity-70 transition-opacity hover:opacity-100"
            onClick={() => onRemoveFilter(filter.key, filter.value)}
            type="button"
            variant="ghost"
          >
            <CircleXIcon className="ml-1 h-4 w-4" />
          </Button>
        </span>
      ))}
    </div>
  );

  const renderLoadingState = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black font-inter text-white">
      {!isFilterActive && (
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full bg-slate-800" />
            <Skeleton className="h-10 w-72 bg-slate-800" />
          </div>
          <Skeleton className="mx-auto mt-2 h-4 w-full max-w-xl bg-slate-800" />
        </div>
      )}

      <div className="flex flex-col gap-6 px-6 md:flex-row">
        <div className="hidden md:block md:w-1/4">
          <div className="sticky top-24 rounded-lg border border-slate-700/20 bg-slate-900 p-6 shadow-lg">
            <div className="mb-4">
              <Skeleton className="h-6 w-28 bg-slate-800" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
              <Skeleton className="h-9 w-full bg-slate-800" />
            </div>
          </div>
        </div>

        <div className="md:w-3/4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Skeleton className="h-7 w-56 bg-slate-800" />
            <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
              <Skeleton className="h-8 w-24 rounded-full bg-slate-800" />
              <Skeleton className="h-8 w-28 rounded-full bg-slate-800" />
              <Skeleton className="h-8 w-20 rounded-full bg-slate-800" />
            </div>
            <div className="w-full md:hidden">
              <Skeleton className="h-10 w-full rounded-lg bg-slate-800" />
            </div>
          </div>

          <div className="p-4">
            <div className="container mx-auto">
              <div className="grid grid-cols-1 gap-8 font-inter sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "skeleton-card-1",
                  "skeleton-card-2",
                  "skeleton-card-3",
                  "skeleton-card-4",
                  "skeleton-card-5",
                  "skeleton-card-6",
                ].map((cardId) => (
                  <div
                    className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-950 bg-slate-900 shadow-2xl"
                    key={cardId}
                  >
                    <Skeleton className="absolute top-4 right-4 z-10 h-6 w-24 rounded-full bg-slate-800" />
                    <Skeleton className="h-44 w-full rounded-none bg-slate-800" />

                    <div className="flex grow flex-col p-4">
                      <div className="mb-2 flex min-h-14 items-center">
                        <Skeleton className="h-6 w-full max-w-64 bg-slate-800" />
                      </div>

                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Skeleton className="h-6 w-24 rounded-full bg-slate-800" />
                        <Skeleton className="h-6 w-20 rounded-full bg-slate-800" />
                      </div>

                      <div className="mt-auto space-y-2">
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-4 w-4 rounded-full bg-slate-800" />
                          <Skeleton className="h-4 w-3/4 bg-slate-800" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-4 w-4 rounded-full bg-slate-800" />
                          <Skeleton className="h-4 w-2/3 bg-slate-800" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-4 w-4 rounded-full bg-slate-800" />
                          <Skeleton className="h-4 w-5/6 bg-slate-800" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return renderLoadingState();
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black font-inter text-white">
      {!isFilterActive && (
        <div
          className={`px-8 pt-10 pb-6 text-center ${baseTransition} ${showTitle ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
        >
          <div className="mb-2 flex items-center justify-center gap-2">
            <Icon className={`h-8 w-8 ${accentClasses.text}`} />
            <h1 className={`font-bold text-3xl ${accentClasses.text}`}>
              {title}
            </h1>
          </div>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/50">
            {subtitle}
          </p>
        </div>
      )}

      {showFilter && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-75 md:hidden">
          <div className="max-h-[90vh] w-11/12 overflow-y-auto rounded-lg bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`font-bold ${accentClasses.text} text-lg`}>
                Filtros
              </h2>
              <Button
                className={`text-white ${accentClasses.hoverText}`}
                onClick={handleToggleFilterSidebar}
                type="button"
                variant="ghost"
              >
                <XIcon className="h-6 w-6" />
              </Button>
            </div>
            {mobileFilterComponent}
            <div className="mt-4 flex flex-col gap-2">
              <Button
                className={`w-full rounded-lg ${accentClasses.button} py-2 font-semibold transition-colors`}
                onClick={handleApplyFilters}
                type="button"
                variant="ghost"
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckIcon className="h-4 w-4" /> Aplicar Filtros
                </span>
              </Button>
              <Button
                className="w-full rounded-lg bg-red-500 py-2 font-semibold text-white transition-colors hover:bg-red-600"
                onClick={handleClearAllFilters}
                type="button"
                variant="ghost"
              >
                <span className="flex items-center justify-center gap-2">
                  <XIcon className="h-4 w-4" /> Limpar Filtros
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 px-6 md:flex-row">
        <div
          className={`hidden md:block md:w-1/4 ${baseTransition} ${showContent ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"}`}
        >
          <div
            className={`sticky top-24 rounded-lg border ${accentClasses.border} bg-slate-900 p-6 shadow-lg`}
          >
            <div
              className={`mb-4 flex items-center font-bold ${accentClasses.text} text-lg`}
            >
              <FilterIcon className={`mr-2 h-4 w-4 ${accentClasses.text}`} />
              Filtros
            </div>
            {filterComponent}
          </div>
        </div>

        <div
          className={`md:w-3/4 ${baseTransition} ${showContent ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"}`}
        >
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
            <p className="font-semibold text-lg text-white">
              {`Exibindo ${resultCount} oportunidades`}
            </p>
            <div className="mt-4 w-full md:hidden">
              <Button
                className={`flex w-full items-center justify-center gap-2 rounded-lg ${accentClasses.button} py-2 font-semibold transition-colors`}
                onClick={handleToggleFilterSidebar}
                type="button"
                variant="ghost"
              >
                <SlidersHorizontalIcon className="h-4 w-4" /> Abrir Filtros
              </Button>
            </div>
            {renderAppliedFilters()}
          </div>

          {resultCount > 0 ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center p-12">
              <Image
                alt="Logo Global Passport"
                className="mb-4 h-20 w-auto object-contain opacity-80"
                height={80}
                src="/logo-20260413.png"
                unoptimized
                width={80}
              />
              <h3 className="mb-2 font-bold text-2xl text-white">
                Nenhuma oportunidade encontrada
              </h3>
              <p className="mb-6 text-sm text-white/60">
                Tente ajustar seus filtros para ver mais resultados.
              </p>
              <Button
                className={`rounded-full ${accentClasses.button} px-6 py-2 font-bold transition-colors duration-300`}
                onClick={handleClearAllFilters}
                type="button"
                variant="ghost"
              >
                Limpar Todos os Filtros
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpportunitiesMainLayout;
export type { AppliedFilter };
