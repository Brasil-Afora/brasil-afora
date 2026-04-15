"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import FilterDropdown from "@/components/ui/filter-dropdown";
import { Input } from "@/components/ui/input";
import type { OpportunitiesFiltros } from "./types";

interface InternacionalFilterProps {
  filtros: OpportunitiesFiltros;
  filtrosIniciais: OpportunitiesFiltros;
  setFiltros: Dispatch<SetStateAction<OpportunitiesFiltros>>;
}

const allPaises = [
  "Adamar",
  "Alemanha",
  "Andorra",
  "Arábia Saudita",
  "Argentina",
  "Austrália",
  "Áustria",
  "Azerbaijão",
  "Bahrein",
  "Bélgica",
  "Benin",
  "Botswana",
  "Brasil",
  "Bulgária",
  "Burkina Faso",
  "Cabo Verde",
  "Canadá",
  "Cazaquistão",
  "Chile",
  "China",
  "Chipre",
  "Colômbia",
  "Coreia do Sul",
  "Costa Rica",
  "Croácia",
  "Dinamarca",
  "Egito",
  "Emirados Árabes Unidos",
  "Eslováquia",
  "Espanha",
  "Estados Unidos",
  "Estonia",
  "Filipinas",
  "Finlândia",
  "França",
  "Gâmbia",
  "Gana",
  "Geórgia",
  "Grécia",
  "Guiné",
  "Hong Kong",
  "Hungria",
  "Índia",
  "Indonésia",
  "Inglaterra",
  "Irlanda",
  "Islândia",
  "Israel",
  "Itália",
  "Japão",
  "Jordânia",
  "Kuwait",
  "Líbano",
  "Lituânia",
  "Luxemburgo",
  "Madagascar",
  "Malásia",
  "Malta",
  "Marrocos",
  "México",
  "Mônaco",
  "Moçambique",
  "Namíbia",
  "Nigéria",
  "Noruega",
  "Nova Zelândia",
  "Omã",
  "Países Baixos",
  "Peru",
  "Polônia",
  "Portugal",
  "Qatar",
  "Reino Unido",
  "República Dominicana",
  "República Tcheca",
  "Romênia",
  "Ruanda",
  "Rússia",
  "San Marino",
  "Senegal",
  "Seychelles",
  "Singapura",
  "Somália",
  "Suécia",
  "Suíça",
  "Tailândia",
  "Tanzânia",
  "Togo",
  "Tunísia",
  "Turquia",
  "Ucrânia",
  "Uganda",
  "Vietnã",
  "Zâmbia",
].sort();

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
  "Curso curta duração",
  "Curso de idiomas",
  "Curso de verão",
  "Doutorado",
  "Estágio/Trabalho",
  "Evento/Workshop",
  "Graduação",
  "High School",
  "Intercâmbio cultural",
  "MBA",
  "Mestrado",
  "Mobilidade acadêmica",
  "Pesquisa",
  "Trabalho voluntário",
].sort();

const requisitosIdiomaOptions = [
  "Alemão",
  "Cantonês",
  "Espanhol",
  "Francês",
  "Holandês",
  "Inglês",
  "Italiano",
  "Japonês",
  "Mandarim",
  "Português",
].sort();

const taxaAplicacaoOptions = ["Gratuito", "Pago"].sort();
const tipoBolsaOptions = ["Completa", "Parcial", "Sem bolsa"].sort();

const InternacionalFilter = ({
  filtros,
  setFiltros,
  filtrosIniciais,
}: InternacionalFilterProps) => {
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
    filtros.pais.length > 0 ||
    filtros.nivelEnsino.length > 0 ||
    filtros.tipo.length > 0 ||
    filtros.requisitosIdioma.length > 0 ||
    filtros.taxaAplicacao.length > 0 ||
    filtros.tipoBolsa.length > 0;

  const inputClasses =
    "h-10 w-full rounded border border-slate-900 bg-slate-950 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="flex flex-col gap-2 font-inter">
      <FilterDropdown
        accentColor="blue"
        cols={2}
        label="Tipo de Programa"
        onChange={(value) => handleCheckboxChange("tipo", value)}
        options={tiposProgramaOptions}
        placeholder="Qualquer programa"
        selected={filtros.tipo}
      />

      <FilterDropdown
        accentColor="blue"
        cols={1}
        label="Nível de Ensino"
        onChange={(value) => handleCheckboxChange("nivelEnsino", value)}
        options={niveisEnsinoOptions}
        placeholder="Qualquer nível"
        selected={filtros.nivelEnsino}
      />

      <FilterDropdown
        accentColor="blue"
        cols={2}
        label="Países de Destino"
        onChange={(value) => handleCheckboxChange("pais", value)}
        options={allPaises}
        placeholder="Todos os países"
        searchable
        searchPlaceholder="Pesquisar país..."
        selected={filtros.pais}
      />

      <FilterDropdown
        accentColor="blue"
        cols={2}
        label="Idiomas"
        onChange={(value) => handleCheckboxChange("requisitosIdioma", value)}
        options={requisitosIdiomaOptions}
        placeholder="Qualquer idioma"
        selected={filtros.requisitosIdioma}
      />

      <FilterDropdown
        accentColor="blue"
        cols={1}
        label="Taxa de Aplicação"
        onChange={(value) => handleCheckboxChange("taxaAplicacao", value)}
        options={taxaAplicacaoOptions}
        placeholder="Qualquer taxa"
        selected={filtros.taxaAplicacao}
      />

      <FilterDropdown
        accentColor="blue"
        cols={1}
        label="Tipo de Bolsa"
        onChange={(value) => handleCheckboxChange("tipoBolsa", value)}
        options={tipoBolsaOptions}
        placeholder="Qualquer bolsa"
        selected={filtros.tipoBolsa}
      />

      <div className="w-full">
        <label className="mb-1 block text-white text-xs" htmlFor="idade">
          <span className="text-blue-400">Sua idade</span>
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
          className={`w-full rounded-lg py-2 font-semibold text-sm transition-colors duration-200 ${isFilterActive() ? "bg-blue-500 text-white hover:bg-blue-600" : "cursor-not-allowed bg-slate-900 text-slate-500"}`}
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

export default InternacionalFilter;
