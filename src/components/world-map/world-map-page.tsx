"use client";

import {
  ArrowRightIcon,
  CalendarDaysIcon,
  Clock3Icon,
  MapPinIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useInternationalOpportunitiesQuery,
  useNationalOpportunitiesQuery,
} from "@/hooks/queries/use-opportunity-queries";
import useSessionStorage from "@/hooks/use-session-storage";
import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";
import WorldMap from "./world-map";

type OpportunitySource = "internacional" | "nacional";

interface MapOpportunity {
  duracao: string;
  id: string;
  nome: string;
  pais: string;
  prazoInscricao: string;
  source: OpportunitySource;
  tipo: string;
}

interface CountryInterchange {
  duracao: string;
  id: string;
  link: string;
  nome: string;
  prazoInscricao: string;
  tipo: string;
}

interface CountryData {
  codigo: string;
  count: number;
  intercambios: CountryInterchange[];
  nome: string;
}

const normalizeCountryName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const countryToIso3: Record<string, string> = {
  alemanha: "DEU",
  argentina: "ARG",
  arabia: "SAU",
  "arabia saudita": "SAU",
  australia: "AUS",
  austria: "AUT",
  belgica: "BEL",
  brasil: "BRA",
  canada: "CAN",
  chile: "CHL",
  china: "CHN",
  "coreia do sul": "KOR",
  coreia: "KOR",
  dinamarca: "DNK",
  egito: "EGY",
  emirados: "ARE",
  "emirados arabes unidos": "ARE",
  espanha: "ESP",
  "estados unidos": "USA",
  "estados unidos da america": "USA",
  france: "FRA",
  franca: "FRA",
  "hong kong": "HKG",
  hungria: "HUN",
  india: "IND",
  indonesia: "IDN",
  inglaterra: "GBR",
  ireland: "IRL",
  irlanda: "IRL",
  italia: "ITA",
  japao: "JPN",
  jordania: "JOR",
  malta: "MLT",
  malasia: "MYS",
  mexico: "MEX",
  norway: "NOR",
  noruega: "NOR",
  "nova zelandia": "NZL",
  oma: "OMN",
  "paises baixos": "NLD",
  peru: "PER",
  polonia: "POL",
  portugal: "PRT",
  qatar: "QAT",
  catar: "QAT",
  "reino unido": "GBR",
  romenia: "ROU",
  russia: "RUS",
  singapura: "SGP",
  suecia: "SWE",
  suica: "CHE",
  tailandia: "THA",
  tchequia: "CZE",
  "republica tcheca": "CZE",
  turquia: "TUR",
  ucrania: "UKR",
  vietnam: "VNM",
  "coreia, republic of": "KOR",
  "korea, republic of": "KOR",
  "new zealand": "NZL",
  netherlands: "NLD",
  switzerland: "CHE",
  spain: "ESP",
  germany: "DEU",
  italy: "ITA",
  japan: "JPN",
  "south korea": "KOR",
  "south africa": "ZAF",
  sweden: "SWE",
  denmark: "DNK",
  "united kingdom": "GBR",
  "united states": "USA",
  "united states of america": "USA",
};

const getCodigoPais = (nomePais: string): string | undefined => {
  const normalized = normalizeCountryName(nomePais);
  const directMatch = countryToIso3[normalized];

  if (directMatch) {
    return directMatch;
  }

  const normalizedWithoutExtraInfo =
    normalized.split(",")[0]?.trim() ?? normalized;
  const secondaryMatch = countryToIso3[normalizedWithoutExtraInfo];
  if (secondaryMatch) {
    return secondaryMatch;
  }

  if (normalized.includes("united states")) {
    return "USA";
  }
  if (normalized.includes("united kingdom") || normalized.includes("england")) {
    return "GBR";
  }
  if (normalized.includes("korea")) {
    return "KOR";
  }

  return undefined;
};

const toMapOpportunity = (
  opportunity: InternationalOpportunity | NationalOpportunity,
  source: OpportunitySource
): MapOpportunity => ({
  id: opportunity.id,
  nome: opportunity.nome,
  tipo: opportunity.tipo,
  duracao: opportunity.duracao,
  prazoInscricao: opportunity.prazoInscricao,
  pais: opportunity.pais,
  source,
});

const getOpportunityLink = (opportunity: MapOpportunity): string => {
  if (opportunity.source === "nacional") {
    return `/oportunidades/nacionais/${opportunity.id}`;
  }

  return `/oportunidades/internacionais/${opportunity.id}`;
};

const agruparOportunidadesPorPais = (
  dados: MapOpportunity[]
): CountryData[] => {
  const agrupado: Record<string, CountryData> = {};
  for (const oportunidade of dados) {
    const codigo = getCodigoPais(oportunidade.pais);
    if (codigo) {
      if (!agrupado[codigo]) {
        agrupado[codigo] = {
          nome: oportunidade.pais,
          codigo,
          count: 0,
          intercambios: [],
        };
      }
      agrupado[codigo].count++;
      agrupado[codigo].intercambios.push({
        id: oportunidade.id,
        nome: oportunidade.nome,
        tipo: oportunidade.tipo,
        duracao: oportunidade.duracao,
        prazoInscricao: oportunidade.prazoInscricao,
        link: getOpportunityLink(oportunidade),
      });
    }
  }
  return Object.values(agrupado).sort((a, b) => a.nome.localeCompare(b.nome));
};

const WorldMapPage = () => {
  const internationalQuery = useInternationalOpportunitiesQuery();
  const nationalQuery = useNationalOpportunitiesQuery();

  const [oportunidades, setOportunidades] = useState<MapOpportunity[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [clickedCountryData, setClickedCountryData] =
    useSessionStorage<CountryData | null>("mapClickedCountry", null);

  useEffect(() => {
    const internationalData = internationalQuery.data ?? [];
    const nationalData = nationalQuery.data ?? [];

    const mergedData: MapOpportunity[] = [
      ...internationalData.map((item) =>
        toMapOpportunity(item, "internacional")
      ),
      ...nationalData.map((item) => toMapOpportunity(item, "nacional")),
    ];

    setOportunidades(mergedData);
  }, [internationalQuery.data, nationalQuery.data]);

  useEffect(() => {
    if (internationalQuery.error || nationalQuery.error) {
      setErrorMessage("Nao foi possivel carregar os dados do mapa.");
      return;
    }

    setErrorMessage("");
  }, [internationalQuery.error, nationalQuery.error]);

  const isLoading = internationalQuery.isPending || nationalQuery.isPending;

  const listaDePaisesComOportunidades = useMemo(
    () => agruparOportunidadesPorPais(oportunidades),
    [oportunidades]
  );

  const oportunidadesPorPaisNoGeoJson = useMemo(() => {
    const agrupado: Record<string, CountryData> = {};

    for (const countryData of listaDePaisesComOportunidades) {
      agrupado[countryData.codigo] = countryData;
    }

    return agrupado;
  }, [listaDePaisesComOportunidades]);

  const selectedCountryCodeIso3 = useMemo(() => {
    if (!clickedCountryData?.codigo) {
      return null;
    }

    return clickedCountryData.codigo;
  }, [clickedCountryData]);

  const [showMap, setShowMap] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowMap(true), 100);
    const timer2 = setTimeout(() => setShowSidebar(true), 300);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const baseTransition = "transition-all duration-500 ease-in-out transform";

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-black font-inter text-white md:flex-row">
      <div
        className={`relative flex w-full items-center justify-center md:h-full md:basis-3/4 ${baseTransition} ${showMap ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"} ${clickedCountryData && isMobileView ? "z-10 h-0 opacity-0" : "z-10 flex-1 opacity-100 md:h-full"}`}
      >
        <WorldMap
          exchangeData={oportunidadesPorPaisNoGeoJson}
          onMarkerClick={(data) => setClickedCountryData(data as CountryData)}
          selectedCountryCode={selectedCountryCodeIso3}
        />
      </div>

      <div
        className={`relative flex w-full flex-col border border-slate-950 bg-slate-900 shadow-lg md:h-full md:basis-1/4 ${baseTransition} ${showSidebar ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"} ${clickedCountryData && isMobileView ? "z-20 h-full" : "z-20 flex-1 md:h-full"}`}
      >
        {clickedCountryData && (
          <Button
            className="absolute top-4 right-4 z-30 text-white transition-colors hover:text-amber-500"
            onClick={() => setClickedCountryData(null)}
            title="Fechar detalhes do país"
            type="button"
            variant="ghost"
          >
            <XIcon className="h-5 w-5" />
          </Button>
        )}

        <div className="px-6 py-4">
          <h2 className="mb-4 border-slate-950 border-b pb-2 font-bold text-amber-500 text-xl">
            Oportunidades
          </h2>
          {isLoading && (
            <p className="text-sm text-white">Carregando dados do mapa...</p>
          )}
          {errorMessage && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 p-2 text-red-200 text-sm">
              <TriangleAlertIcon className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div
          className="grow overflow-y-auto px-6 py-4 pt-0"
          id="map-sidebar-scroll"
        >
          {clickedCountryData ? (
            <div>
              <div className="mb-2 flex items-center">
                <MapPinIcon className="mr-2 h-4 w-4 text-amber-500" />
                <h3 className="font-semibold text-amber-500 text-xl">
                  {clickedCountryData.nome}
                </h3>
              </div>
              <p className="mb-4 text-sm text-white">
                {clickedCountryData.intercambios.length}{" "}
                {clickedCountryData.intercambios.length === 1
                  ? "oportunidade"
                  : "oportunidades"}{" "}
                disponíveis
              </p>
              <ul className="space-y-4">
                {clickedCountryData.intercambios.map((oportunidade) => (
                  <li
                    className="rounded-md border border-slate-900 bg-slate-950 p-4 text-white shadow-md"
                    key={oportunidade.id}
                  >
                    <h4 className="mb-1 font-semibold text-lg">
                      {oportunidade.nome}
                    </h4>
                    <div className="mb-1 flex items-center text-sm text-white">
                      <Clock3Icon className="mr-2 h-4 w-4 text-amber-500" />
                      Duração: {oportunidade.duracao}
                    </div>
                    <div className="mb-2 flex items-center text-sm text-white">
                      <CalendarDaysIcon className="mr-2 h-4 w-4 text-amber-500" />
                      Prazo: {oportunidade.prazoInscricao}
                    </div>
                    <div className="mb-2 inline-block rounded-full bg-slate-900 px-3 py-1 font-semibold text-white text-xs">
                      {oportunidade.tipo}
                    </div>
                    <div className="flex justify-end">
                      <Link
                        className="flex items-center font-semibold text-amber-500"
                        href={oportunidade.link}
                      >
                        Saiba Mais <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <h3 className="mb-2 font-semibold text-lg text-white">
                Como Usar o Mapa
              </h3>
              <ol className="mb-4 list-decimal pl-5 text-sm text-white">
                <li>
                  Clique em um marcador de país no mapa para ver as
                  oportunidades disponíveis.
                </li>
                <li>
                  Use a barra lateral para ver informações detalhadas sobre as
                  oportunidades.
                </li>
              </ol>
              <h3 className="mt-4 mb-2 hidden font-semibold text-lg text-white md:block">
                Países com Oportunidades
              </h3>
              <div className="hidden grid-cols-2 gap-2 text-sm md:grid">
                {listaDePaisesComOportunidades.map((pais) => (
                  <Button
                    className="rounded-md border border-slate-900 bg-slate-950 p-2 text-left text-white hover:bg-slate-800"
                    key={pais.codigo}
                    onClick={() => setClickedCountryData(pais)}
                    type="button"
                    variant="ghost"
                  >
                    <span className="font-semibold text-amber-500">
                      {`${pais.nome} (${pais.count})`}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorldMapPage;
