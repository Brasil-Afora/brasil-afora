"use client";

import { PlusIcon } from "lucide-react";

interface FormFieldConfig {
  key: string;
  label: string;
  type?: "input" | "textarea";
}

interface AdminOpportunityFormProps {
  accentColor: "amber" | "blue";
  editingId: string | null;
  editingName?: string | null;
  fields: FormFieldConfig[];
  filterOptions?: Record<string, string[]>;
  formData: Record<string, string>;
  formMode: "campos" | "texto";
  jsonInput: string;
  onCopyTemplate?: () => void;
  onFormChange: (key: string, value: string) => void;
  onJsonInputChange: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
  onSaveText?: () => void;
  setFormMode: (mode: "campos" | "texto") => void;
  textareaFields: FormFieldConfig[];
  title: string;
}

const AdminOpportunityForm = ({
  title,
  editingId,
  formMode,
  setFormMode,
  formData,
  onFormChange,
  jsonInput,
  onJsonInputChange,
  onSave,
  onSaveText,
  onReset,
  fields,
  textareaFields,
  accentColor,
}: AdminOpportunityFormProps) => {
  const titleColorClass =
    accentColor === "blue" ? "text-blue-400" : "text-amber-500";
  const buttonColorClass =
    accentColor === "blue"
      ? "bg-blue-500 text-white"
      : "bg-amber-500 text-black";
  const modeButtonActiveClass =
    accentColor === "blue"
      ? "bg-blue-500 text-white"
      : "bg-amber-500 text-black";

  const allFieldKeys = [...fields, ...textareaFields]
    .map((f) => f.key)
    .join(", ");

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className={`font-bold ${titleColorClass} text-xl`}>
          {editingId ? "Editar Oportunidade" : title}
        </h2>
        <button
          className="rounded-md bg-slate-800 px-3 py-1 text-sm"
          onClick={onReset}
          type="button"
        >
          Limpar
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={`rounded-lg px-3 py-1 font-semibold text-sm ${formMode === "campos" ? modeButtonActiveClass : "bg-slate-800 text-slate-300"}`}
          onClick={() => setFormMode("campos")}
          type="button"
        >
          Campos Separados
        </button>
        <button
          className={`rounded-lg px-3 py-1 font-semibold text-sm ${formMode === "texto" ? modeButtonActiveClass : "bg-slate-800 text-slate-300"}`}
          onClick={() => setFormMode("texto")}
          type="button"
        >
          Colar Texto
        </button>
      </div>

      {formMode === "campos" ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {fields.map(({ key, label }) => (
              <label className="flex flex-col gap-1" key={key}>
                <span className="text-slate-300 text-sm">{label}</span>
                <input
                  className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
                  onChange={(e) => onFormChange(key, e.target.value)}
                  value={formData[key] || ""}
                />
              </label>
            ))}

            {textareaFields.map(({ key, label }) => (
              <label className="flex flex-col gap-1 md:col-span-2" key={key}>
                <span className="text-slate-300 text-sm">{label}</span>
                <textarea
                  className="min-h-24 rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
                  onChange={(e) => onFormChange(key, e.target.value)}
                  value={formData[key] || ""}
                />
              </label>
            ))}
          </div>

          <button
            className={`mt-4 rounded-lg ${buttonColorClass} px-4 py-2 font-semibold`}
            onClick={onSave}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />{" "}
              {editingId ? "Atualizar" : "Criar"}
            </span>
          </button>
        </>
      ) : (
        <>
          <div className="mb-3 rounded-lg bg-slate-800/50 p-3 text-slate-400 text-xs">
            <p className="mb-2 font-semibold text-slate-300">
              Cole o texto no formato "chave: valor" (uma por linha):
            </p>
            <code className="block whitespace-pre-wrap text-slate-500">
              {`nome: Nome da Oportunidade
pais: País
cidade: Cidade
instituicao: Nome da Instituição
tipo: Tipo do Programa
...`}
            </code>
            <p className="mt-2 text-slate-500">
              Campos disponíveis: {allFieldKeys}
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <textarea
              className="min-h-96 rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-sm"
              onChange={(e) => onJsonInputChange(e.target.value)}
              placeholder={
                "nome: Bolsa de Estudos XYZ\npais: Alemanha\ncidade: Berlim\ninstituicao: Universidade de Berlim\ntipo: Mestrado\n..."
              }
              value={jsonInput}
            />
          </label>

          <button
            className={`mt-4 rounded-lg ${buttonColorClass} px-4 py-2 font-semibold`}
            onClick={onSaveText}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />{" "}
              {editingId ? "Atualizar" : "Criar"}
            </span>
          </button>
        </>
      )}
    </section>
  );
};

export default AdminOpportunityForm;
