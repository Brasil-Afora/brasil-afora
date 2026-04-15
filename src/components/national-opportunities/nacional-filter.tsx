"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import FilterDropdown from "@/components/ui/filter-dropdown";
import { Input } from "@/components/ui/input";
import type { OpportunitiesFiltros } from "./types";

interface NacionalFilterProps {
  filtros: OpportunitiesFiltros;
  filtrosIniciais: OpportunitiesFiltros;
  setFiltros: Dispatch<SetStateAction<OpportunitiesFiltros>>;
}

const niveisEnsinoOptions = [
  "Ano Sabático",
  "Doutorado",
  "Ensino Médio",
  "Graduação",
  "MBA",
  "Mestrado",
  "Pós-Doutorado",
].sort();

const tiposProgramaOptions = [
  "Olimpíadas",
  "Feiras de Ciências",
  "Programas de Liderança",
  "Iniciação Científica",
  "Simulações da ONU",
  "Cursos & Imersões",
  "Programas de Mentoria",
  "Voluntariado/Social",
];

const taxaAplicacaoOptions = ["Gratuito", "Pago"].sort();
const modalidadeOptions = ["Presencial", "Online", "Híbrido"];

const NacionalFilter = ({
  filtros,
  setFiltros,
  filtrosIniciais,
}: NacionalFilterProps) => {
  const handleCheckboxChange = (
    id: keyof OpportunitiesFiltros,
    value: string
  ) => {
    const currentArray = (filtros[id] as string[]) || [];
    if (currentArray.includes(value)) {
      setFiltros((prev) => ({
        ...prev,
        [id]: currentArray.filter((item) => item !== value),
      }));
    } else {
      setFiltros((prev) => ({ ...prev, [id]: [...currentArray, value] }));
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;
    setFiltros((prev) => ({ ...prev, [id]: value }));
  };

  const isFilterActive = () =>
    filtros.idade !== "" ||
    filtros.nivelEnsino.length > 0 ||
    filtros.tipo.length > 0 ||
    filtros.taxaAplicacao.length > 0 ||
    filtros.modalidade.length > 0;

  const inputClasses =
    "h-10 w-full rounded border border-slate-900 bg-slate-950 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <div className="flex flex-col gap-2 font-inter">
      <FilterDropdown
        accentColor="amber"
        cols={2}
        label="Tipo de Programa"
        onChange={(value) => handleCheckboxChange("tipo", value)}
        options={tiposProgramaOptions}
        placeholder="Qualquer programa"
        selected={filtros.tipo}
      />

      <FilterDropdown
        accentColor="amber"
        cols={1}
        label="Nível de Ensino"
        onChange={(value) => handleCheckboxChange("nivelEnsino", value)}
        options={niveisEnsinoOptions}
        placeholder="Qualquer nível"
        selected={filtros.nivelEnsino}
      />

      <FilterDropdown
        accentColor="amber"
        cols={1}
        label="Taxa de Aplicação"
        onChange={(value) => handleCheckboxChange("taxaAplicacao", value)}
        options={taxaAplicacaoOptions}
        placeholder="Qualquer taxa"
        selected={filtros.taxaAplicacao}
      />

      <FilterDropdown
        accentColor="amber"
        cols={1}
        label="Modalidade"
        onChange={(value) => handleCheckboxChange("modalidade", value)}
        options={modalidadeOptions}
        placeholder="Qualquer modalidade"
        selected={filtros.modalidade}
      />

      <div className="w-full">
        <label className="mb-1 block text-white text-xs" htmlFor="idade">
          <span className="text-amber-500">Sua idade</span>
        </label>
        <Input
          className={inputClasses}
          id="idade"
          onChange={handleInputChange}
          placeholder="Ex: 18"
          type="number"
          value={filtros.idade}
        />
      </div>

      <div className="mt-2 hidden md:block">
        <Button
          className={`w-full rounded-lg py-2 font-semibold text-sm transition-colors duration-200 ${isFilterActive() ? "bg-amber-500 text-black hover:bg-amber-600" : "cursor-not-allowed bg-slate-900 text-slate-500"}`}
          disabled={!isFilterActive()}
          onClick={() => setFiltros(filtrosIniciais)}
          type="button"
          variant="ghost"
        >
          Limpar Filtros
        </Button>
      </div>
    </div>
  );
};

export default NacionalFilter;
