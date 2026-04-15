"use client";

import { CalendarDaysIcon, MapPinIcon, TagIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getTimeRemaining,
  getTimeRemainingBadgeClass,
} from "../../lib/date-utils";
import type { Opportunity } from "./types";

interface NacionalListProps {
  data: Opportunity[];
}

const NacionalList = ({ data }: NacionalListProps) => {
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

            return (
              <Link
                className={`relative flex transform cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-950 bg-slate-900 shadow-2xl transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-amber-500/30 ${visibleItems.includes(index) ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
                href={`/oportunidades/nacionais/${oportunidade.id}`}
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
                    onError={(e) => {
                      e.currentTarget.src = "/home.png";
                    }}
                    src={oportunidade.imagem}
                    unoptimized
                    width={400}
                  />
                </div>

                <div className="flex grow flex-col p-4">
                  <div className="mb-2 flex min-h-14 items-center">
                    <h2 className="line-clamp-2 font-bold text-white text-xl">
                      {oportunidade.nome}
                    </h2>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {oportunidade.nivelEnsino && (
                      <span className="rounded-full bg-slate-950 px-2 py-1 font-semibold text-white text-xs">
                        {oportunidade.nivelEnsino}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-950 px-2 py-1 font-semibold text-white text-xs">
                      {oportunidade.modalidade}
                    </span>
                  </div>

                  <div className="flex grow flex-col justify-end text-white">
                    <div className="mb-1 flex items-center space-x-2">
                      <TagIcon className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">{oportunidade.tipo}</span>
                    </div>
                    <div className="mb-1 flex items-center space-x-2">
                      <CalendarDaysIcon className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">
                        Prazo: {oportunidade.prazoInscricao}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPinIcon className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">
                        {oportunidade.cidadeEstado}
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

export default NacionalList;
