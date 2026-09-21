"use client";

import {
  BadgeCheckIcon,
  ChevronDownIcon,
  MapPinIcon,
  PinIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import CatalogCover from "@/components/opportunities/catalog-cover";
import { URGENT_DAYS } from "@/components/opportunities/catalog-model";
import { StepsChecklist } from "@/components/opportunities/detail-parts";
import type { ApplicationTracker } from "@/hooks/use-application-tracker";
import { formatDaysLeft } from "@/lib/date-utils";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type ProfileItem,
  stepsDoneOf,
} from "./profile-model";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  "Em preparação": "Preparando",
  Inscrito: "Inscrição enviada",
  Aprovado: "Aprovado",
};

const statusPillClass: Record<ApplicationStatus, string> = {
  "Em preparação": "border border-navy-600 text-mist",
  Inscrito: "border border-slate-300/60 text-white",
  Aprovado: "bg-white text-navy-950",
};

// ---------------------------------------------------------------------------
// Pieces

export const Deadline = ({ item }: { item: ProfileItem }) => {
  if (item.daysLeft === null) {
    return <span>Prazo não informado</span>;
  }
  if (item.daysLeft < 0) {
    return <span>Inscrições encerradas em {item.deadline}</span>;
  }
  return (
    <span className="tabular-nums">
      Prazo {item.deadline}{" "}
      <span
        className={`font-semibold ${item.daysLeft <= URGENT_DAYS ? "text-signal" : "text-slate-200"}`}
      >
        · {formatDaysLeft(item.daysLeft)}
      </span>
    </span>
  );
};

const Progress = ({
  stepsDone,
  stepsTotal,
  tasksDone,
  tasksTotal,
}: {
  stepsDone: number;
  stepsTotal: number;
  tasksDone: number;
  tasksTotal: number;
}) => {
  const total = stepsTotal + tasksTotal;
  if (total === 0) {
    return null;
  }
  const share = (stepsDone + tasksDone) / total;
  const parts = [
    stepsTotal > 0 && `${stepsDone} de ${stepsTotal} etapas`,
    tasksTotal > 0 && `${tasksDone} de ${tasksTotal} tarefas`,
  ].filter(Boolean);
  return (
    <div className="mt-3 flex items-center gap-3">
      <div
        aria-hidden="true"
        className="h-1.5 max-w-56 flex-1 overflow-hidden rounded-full bg-navy-700"
      >
        <div
          className="h-full rounded-full bg-slate-200 transition-[width] duration-500"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </div>
      <span className="text-[13px] text-mist tabular-nums">
        {parts.join(" · ")}
      </span>
    </div>
  );
};

const StatusControl = ({
  onChange,
  status,
}: {
  onChange: (status: ApplicationStatus) => void;
  status: ApplicationStatus;
}) => {
  const name = useId();
  return (
    <fieldset>
      <legend className="font-semibold text-[15px] text-white">
        Situação da inscrição
      </legend>
      <div className="mt-3 inline-flex rounded-lg border border-navy-700 bg-navy-950 p-1">
        {APPLICATION_STATUSES.map((option) => (
          <label
            className="relative cursor-pointer rounded-md px-3 py-1.5 text-[14px] text-mist transition-colors hover:text-white has-[:checked]:bg-navy-700 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
            key={option}
          >
            <input
              checked={status === option}
              className="sr-only"
              name={name}
              onChange={() => onChange(option)}
              type="radio"
              value={option}
            />
            {STATUS_LABELS[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
};

const TaskList = ({
  item,
  tracker,
}: {
  item: ProfileItem;
  tracker: ApplicationTracker;
}) => {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const tasks = tracker.tasks[item.id] ?? [];

  const remove = (index: number) => {
    const task = tasks[index];
    if (!task) {
      return;
    }
    tracker.removeTask(item.id, index);
    toast(`Tarefa removida: ${task.text}`, {
      action: {
        label: "Desfazer",
        onClick: () => tracker.restoreTask(item.id, index, task),
      },
    });
  };

  return (
    <div>
      <h4 className="font-semibold text-[15px] text-white">Suas tarefas</h4>
      <p className="mt-1 text-[13px] text-mist">
        O que a fonte não lista: cartas, documentos, traduções.
      </p>
      {tasks.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {tasks.map((task, index) => (
            <li
              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-navy-800/60"
              // biome-ignore lint/suspicious/noArrayIndexKey: tasks are positional and may repeat text.
              key={`${index}:${task.text}`}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  checked={task.completed}
                  className="h-4 w-4 shrink-0 accent-[var(--color-signal)]"
                  onChange={() => tracker.toggleTask(item.id, index)}
                  type="checkbox"
                />
                <span
                  className={`min-w-0 text-[14px] ${task.completed ? "text-mist line-through decoration-navy-600" : "text-slate-100"}`}
                >
                  {task.text}
                </span>
              </label>
              <button
                aria-label={`Remover a tarefa ${task.text}`}
                className="shrink-0 rounded p-1 text-mist opacity-60 transition hover:text-white hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-signal group-hover:opacity-100"
                onClick={() => remove(index)}
                type="button"
              >
                <XIcon aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          tracker.addTask(item.id, draft);
          setDraft("");
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          Nova tarefa
        </label>
        <input
          className="h-10 min-w-0 flex-1 rounded-lg border border-navy-700 bg-navy-950/60 px-3 text-[14px] text-slate-100 placeholder:text-mist-dim hover:border-navy-600 focus-visible:border-signal/70 focus-visible:outline-none"
          id={inputId}
          maxLength={140}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ex.: pedir carta ao professor"
          value={draft}
        />
        <button
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-navy-600 px-3 font-medium text-[14px] text-white transition-colors hover:border-signal/60 disabled:opacity-40"
          disabled={!draft.trim()}
          type="submit"
        >
          <PlusIcon aria-hidden="true" className="h-4 w-4" />
          Adicionar
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// One application

const ApplicationRow = ({
  item,
  onStatusChange,
  onStop,
  tracker,
}: {
  item: ProfileItem;
  onStatusChange: (item: ProfileItem, status: ApplicationStatus) => void;
  onStop: (item: ProfileItem) => void;
  tracker: ApplicationTracker;
}) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const status = tracker.statuses[item.id] ?? "Em preparação";
  const pinned = Boolean(tracker.pinned[item.id]);
  const tasks = tracker.tasks[item.id] ?? [];

  return (
    <li
      className={`rounded-xl border bg-navy-900/60 transition-colors ${open ? "border-navy-600" : "border-navy-700"}`}
    >
      <div className="flex gap-4 p-3 sm:p-4">
        <CatalogCover
          className="hidden h-[4.5rem] w-24 shrink-0 rounded-lg sm:block"
          compact
          cover={item.cover}
          sizes="6rem"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <div className="min-w-0">
              {item.institution && (
                <p className="flex items-center gap-1.5 text-[12px] text-mist">
                  {item.verified && (
                    <BadgeCheckIcon
                      aria-label="Verificada"
                      className="h-3.5 w-3.5 shrink-0 text-verified"
                    />
                  )}
                  <span className="truncate">{item.institution}</span>
                </p>
              )}
              <h3 className="font-semibold text-[16px] text-white leading-snug">
                <Link
                  className="underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                  href={item.href}
                >
                  {item.name}
                </Link>
              </h3>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 font-semibold text-[12px] ${statusPillClass[status]}`}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-mist">
            {item.place && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon aria-hidden="true" className="h-3.5 w-3.5" />
                {item.place}
                <span aria-hidden="true" className="ml-1 hidden sm:inline">
                  ·
                </span>
              </span>
            )}
            <Deadline item={item} />
          </p>
          <Progress
            stepsDone={stepsDoneOf(item, tracker.steps)}
            stepsTotal={item.steps.length}
            tasksDone={tasks.filter((task) => task.completed).length}
            tasksTotal={tasks.length}
          />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            aria-label={pinned ? "Desafixar do topo" : "Fixar no topo"}
            aria-pressed={pinned}
            className={`rounded-lg p-2 transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-signal ${pinned ? "text-signal" : "text-mist hover:text-white"}`}
            onClick={() => tracker.togglePin(item.id)}
            title={pinned ? "Desafixar do topo" : "Fixar no topo"}
            type="button"
          >
            <PinIcon
              aria-hidden="true"
              className={`h-4 w-4 ${pinned ? "fill-current" : ""}`}
            />
          </button>
          <button
            aria-controls={panelId}
            aria-expanded={open}
            aria-label={open ? "Fechar detalhes" : "Abrir etapas e tarefas"}
            className="rounded-lg p-2 text-mist transition-colors hover:bg-navy-800 hover:text-white focus-visible:outline-2 focus-visible:outline-signal"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <ChevronDownIcon
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="grid gap-8 border-navy-700/70 border-t px-4 py-6 sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
          id={panelId}
        >
          <div>
            <h4 className="mb-4 font-semibold text-[15px] text-white">
              Etapas da inscrição
            </h4>
            {item.steps.length > 0 ? (
              <StepsChecklist
                key={item.stepsKey}
                progressKey={item.stepsKey}
                steps={item.steps}
              />
            ) : (
              <p className="max-w-[40ch] rounded-lg border border-navy-700 border-dashed px-4 py-3 text-[14px] text-mist">
                A fonte não lista as etapas desta oportunidade. Use suas tarefas
                para montar o passo a passo.
              </p>
            )}
          </div>
          <div className="space-y-8">
            <StatusControl
              onChange={(next) => onStatusChange(item, next)}
              status={status}
            />
            <TaskList item={item} tracker={tracker} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-navy-700/70 border-t pt-4 lg:col-span-2">
            <Link
              className="font-medium text-[14px] text-signal hover:text-signal-strong"
              href={item.href}
            >
              Abrir a oportunidade
            </Link>
            <button
              className="rounded text-[13px] text-mist underline decoration-navy-600 underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-signal"
              onClick={() => onStop(item)}
              type="button"
            >
              Parar de acompanhar
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

// ---------------------------------------------------------------------------
// The section

const ProfileApplications = ({
  items,
  loading,
  onStatusChange,
  onStop,
  tracker,
}: {
  items: ProfileItem[];
  loading: boolean;
  onStatusChange: (item: ProfileItem, status: ApplicationStatus) => void;
  onStop: (item: ProfileItem) => void;
  tracker: ApplicationTracker;
}) => (
  <section
    aria-labelledby="em-andamento-titulo"
    className="scroll-mt-24"
    id="em-andamento"
  >
    <h2
      className="font-bold text-[1.375rem] text-white leading-tight"
      id="em-andamento-titulo"
    >
      Em andamento
    </h2>
    {loading && (
      <div aria-hidden="true" className="mt-5 space-y-3">
        <div className="h-24 animate-pulse rounded-xl bg-navy-900" />
        <div className="h-24 animate-pulse rounded-xl bg-navy-900" />
      </div>
    )}
    {!loading && items.length === 0 && (
      <p className="mt-4 max-w-[60ch] rounded-xl border border-navy-700 border-dashed px-5 py-4 text-[15px] text-mist leading-relaxed">
        Nada em andamento ainda. Marque as etapas na página de uma oportunidade,
        ou use “Começar” em uma das salvas, e ela aparece aqui.
      </p>
    )}
    {!loading && items.length > 0 && (
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <ApplicationRow
            item={item}
            key={item.stepsKey}
            onStatusChange={onStatusChange}
            onStop={onStop}
            tracker={tracker}
          />
        ))}
      </ul>
    )}
  </section>
);

export default ProfileApplications;
