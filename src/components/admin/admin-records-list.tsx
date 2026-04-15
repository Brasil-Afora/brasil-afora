"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminRecordsListItem {
  id: string;
  name: string;
  subtitle: string;
}

interface AdminRecordsListProps {
  accentColor: "amber" | "blue";
  activeId?: string | null;
  items: AdminRecordsListItem[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  title: string;
}

const AdminRecordsList = ({
  title,
  items,
  activeId,
  onEdit,
  onDelete,
  accentColor,
}: AdminRecordsListProps) => {
  const titleColorClass =
    accentColor === "blue" ? "text-blue-400" : "text-amber-500";
  const cardBorderClass =
    accentColor === "blue"
      ? "border-blue-500/50 ring-blue-500/20"
      : "border-amber-500/50 ring-amber-500/20";
  const activeButtonClass =
    accentColor === "blue"
      ? "bg-blue-500 text-white"
      : "bg-amber-500 text-black";

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className={`mb-3 font-bold ${titleColorClass} text-xl`}>{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <article
            className={`rounded-xl border bg-slate-950 p-3 transition-all duration-200 ${item.id === activeId ? `${cardBorderClass} ring-2` : "border-slate-800 hover:border-slate-700"}`}
            key={item.id}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{item.name}</p>
                <p className="truncate text-slate-400 text-sm">
                  {item.subtitle}
                </p>
              </div>
              {item.id === activeId && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-semibold text-[11px] ${activeButtonClass}`}
                >
                  Editando
                </span>
              )}
            </div>

            <div className="mt-2 flex gap-2">
              <Button
                className={`rounded-md px-3 py-1 text-sm ${item.id === activeId ? activeButtonClass : "bg-slate-800 text-white"}`}
                onClick={() => onEdit(item.id)}
                type="button"
                variant="ghost"
              >
                <span className="inline-flex items-center gap-2">
                  <PencilIcon className="h-4 w-4" />
                  {item.id === activeId ? "Selecionado" : "Editar"}
                </span>
              </Button>
              <Button
                className="rounded-md bg-red-700 px-3 py-1 text-sm text-white"
                onClick={() => onDelete(item.id)}
                type="button"
                variant="ghost"
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2Icon className="h-4 w-4" /> Excluir
                </span>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AdminRecordsList;
