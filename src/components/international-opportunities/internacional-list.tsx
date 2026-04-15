"use client";

import {
  CalendarDaysIcon,
  Clock3Icon,
  MapPinIcon,
  TagIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getTimeRemaining,
  getTimeRemainingBadgeClass,
} from "../../lib/date-utils";
import type { Opportunity } from "./types";

interface InternacionalListProps {
  data: Opportunity[];
}

const getScholarshipTagClasses = (tipoBolsa: string): string => {
  switch (tipoBolsa.toLowerCase()) {
    case "parcial":
      return "bg-amber-500 text-black";
    case "completa":
      return "bg-green-500 text-black";
    case "variavel":
      return "bg-blue-500 text-white";
    default:
      return "bg-slate-900 text-white";
  }
};

const InternacionalList = ({ data }: InternacionalListProps) => {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    setVisibleItems([]);
    const timers = data.map((_, index) =>
      setTimeout(() => {
        setVisibleItems((prev) => [...prev, index]);
      }, index * 30)
    );
    return () => {
      for (const t of timers) {
        clearTimeout(t);
      }
    };
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-8 font-inter sm:grid-cols-2 lg:grid-cols-3">
          {data.map((oportunidade, index) => {
            const timeRemaining = getTimeRemaining(oportunidade.prazoInscricao);
            const deadlineBadgeClass = getTimeRemainingBadgeClass(
              oportunidade.prazoInscricao
            );
            const scholarshipClasses = getScholarshipTagClasses(
              oportunidade.tipoBolsa
            );

            return (
              <Link
                className={`relative flex transform cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-950 bg-slate-900 shadow-2xl transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-blue-500/30 ${visibleItems.includes(index) ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
                href={`/oportunidades/internacionais/${oportunidade.id}`}
                key={oportunidade.id}
              >
                {timeRemaining && (
                  <div
                    className={`absolute top-4 right-4 z-10 rounded-full px-3 py-1 font-bold text-xs ${deadlineBadgeClass}`}
                  >
                    {timeRemaining}
                  </div>
                )}

                <div className="relative h-44">
                  <Image
                    alt={`Capa de ${oportunidade.nome}`}
                    className="h-full w-full object-cover"
                    height={176}
                    src={oportunidade.imagem}
                    unoptimized
                    width={400}
                  />
                </div>

                <div className="flex grow flex-col p-4">
                  <div className="mb-2 flex h-14 items-center">
                    <h2 className="line-clamp-2 font-bold text-white text-xl">
                      {oportunidade.nome}
                    </h2>
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    {oportunidade.nivelEnsino && (
                      <span className="rounded-full bg-slate-950 px-2 py-1 font-semibold text-white text-xs">
                        {oportunidade.nivelEnsino}
                      </span>
                    )}
                    {oportunidade.tipoBolsa && (
                      <span
                        className={`${scholarshipClasses} rounded-full px-2 py-1 font-semibold text-xs`}
                      >
                        {oportunidade.tipoBolsa}
                      </span>
                    )}
                  </div>

                  <div className="flex grow flex-col justify-end text-white">
                    <div className="mb-1 flex items-center space-x-2">
                      <TagIcon className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">{oportunidade.tipo}</span>
                    </div>
                    <div className="mb-1 flex items-center space-x-2">
                      <MapPinIcon className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">{oportunidade.pais}</span>
                    </div>
                    <div className="mb-1 flex items-center space-x-2">
                      <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">
                        Prazo: {oportunidade.prazoInscricao}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock3Icon className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">
                        Duração: {oportunidade.duracao}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InternacionalList;
