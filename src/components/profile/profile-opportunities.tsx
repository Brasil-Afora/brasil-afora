"use client";

import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon,
  PinIcon,
  PlusIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useProfileOpportunities, {
  type ApplicationStatus,
  statusOptions,
} from "@/hooks/use-profile-opportunities";
import {
  getTimeRemaining,
  getTimeRemainingBadgeClass,
} from "../../lib/date-utils";
import type { FavoriteOpportunity } from "./types";

const getDaysUntilDeadline = (deadlineString: string): number | null => {
  if (typeof deadlineString !== "string" || deadlineString.length < 10) {
    return null;
  }

  const parts = deadlineString.split("/");
  if (parts.length !== 3) {
    return null;
  }

  const day = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10) - 1;
  const year = Number.parseInt(parts[2], 10);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return null;
  }

  const deadline = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const timeDiff = deadline.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

const getCardStatusClass = (status: ApplicationStatus): string => {
  if (status === "Aprovado") {
    return "border-amber-500/60 bg-amber-500/10 opacity-80 saturate-50";
  }

  if (status === "Inscrito") {
    return "border-slate-800 bg-slate-950 opacity-90";
  }

  return "border-slate-950 bg-slate-900";
};

interface ProfileOpportunitiesProps {
  favoriteOpportunities: FavoriteOpportunity[];
  handleRemoveFromList: (
    detalhePath: string,
    name: string,
    id: string,
    categoria: "internacional" | "nacional"
  ) => void;
}

const statusSelectItems = statusOptions.map((item) => ({
  label: item,
  value: item,
}));

const ProfileOpportunities = ({
  favoriteOpportunities,
  handleRemoveFromList,
}: ProfileOpportunitiesProps) => {
  const {
    checklistItems,
    confettiPieces,
    customItem,
    deleteConfirmation,
    expandedOportunidadeId,
    handleAddItem,
    handleChecklistItem,
    handleConfirmDelete,
    handleConfirmStatusChange,
    handleDeleteItem,
    handleRequestStatusChange,
    handleToggleExpand,
    handleTogglePin,
    pendingStatusChange,
    pinnedByOpportunity,
    setCustomItem,
    setDeleteConfirmation,
    setPendingStatusChange,
    setShowAddMenu,
    showAddMenu,
    showCelebration,
    sortedFavoriteOpportunities,
    statusByOpportunity,
  } = useProfileOpportunities(favoriteOpportunities);

  return (
    <div>
      <style>
        {
          "@keyframes confetti-fall { 0% { transform: translateY(-12vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(120vh) rotate(540deg); opacity: 0; } }"
        }
      </style>
      {showCelebration && (
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
          {confettiPieces.map((piece) => (
            <span
              className="absolute rounded-sm"
              key={`confetti-${piece.left}-${piece.delay}-${piece.rotate}`}
              style={{
                animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
                backgroundColor: piece.color,
                height: `${piece.size * 1.4}px`,
                left: `${piece.left}%`,
                top: "-14vh",
                transform: `rotate(${piece.rotate}deg)`,
                width: `${piece.size}px`,
              }}
            />
          ))}
        </div>
      )}
      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {sortedFavoriteOpportunities.length > 0 ? (
          /* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this render block handles many visual states in a single card. */
          sortedFavoriteOpportunities.map((oportunidade) => {
            const timeRemaining = getTimeRemaining(oportunidade.prazoInscricao);
            const daysRemaining = getDaysUntilDeadline(
              oportunidade.prazoInscricao
            );
            const deadlineBadgeClass = getTimeRemainingBadgeClass(
              oportunidade.prazoInscricao
            );
            const isExpanded = expandedOportunidadeId === oportunidade.id;
            const isPinned = Boolean(pinnedByOpportunity[oportunidade.id]);
            const items = checklistItems[oportunidade.id] || [];
            const completedCount = items.filter(
              (item) => item.completed
            ).length;
            const totalCount = items.length;
            const progressPercentage =
              totalCount > 0
                ? Math.round((completedCount / totalCount) * 100)
                : 0;
            const status =
              statusByOpportunity[oportunidade.id] ?? "Em preparação";
            const isApproved = status === "Aprovado";
            const cardStatusClass = getCardStatusClass(status);
            const checklistIsIncomplete =
              totalCount > 0 && completedCount < totalCount;
            const isDeadlineNear = daysRemaining !== null && daysRemaining <= 7;
            const showNearDeadlineWarning =
              isDeadlineNear && checklistIsIncomplete;
            const showSuggestMarkAsApplied =
              totalCount > 0 &&
              progressPercentage === 100 &&
              status !== "Inscrito" &&
              status !== "Aprovado";

            return (
              <div
                className={`relative flex flex-col overflow-hidden rounded-2xl border shadow-lg ${cardStatusClass} ${isExpanded ? "h-auto" : "h-[420px]"}`}
                key={oportunidade.id}
              >
                <Button
                  className={`absolute top-4 left-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 ${
                    isPinned
                      ? "border-amber-300/90 bg-amber-400/95 text-black shadow-amber-500/40"
                      : "border-slate-600/80 bg-slate-950/90 text-white hover:-translate-y-0.5 hover:bg-slate-800/95"
                  }`}
                  onClick={() => handleTogglePin(oportunidade.id)}
                  title={isPinned ? "Desfixar do topo" : "Fixar no topo"}
                  type="button"
                  variant="ghost"
                >
                  <PinIcon className="h-4 w-4" />
                </Button>
                <div
                  className={`absolute top-4 left-16 z-10 flex min-w-[3.3rem] items-center justify-center rounded-xl px-2 py-1 font-bold text-[11px] shadow-lg backdrop-blur-sm ${
                    isApproved
                      ? "border border-amber-400/70 bg-slate-950/90 text-amber-300"
                      : "border border-amber-400/50 bg-slate-950/90 text-amber-400"
                  }`}
                >
                  <span
                    className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${isApproved ? "bg-amber-300" : "bg-amber-400"}`}
                  />
                  {progressPercentage}%
                </div>
                {timeRemaining && (
                  <div
                    className={`absolute top-4 right-4 z-10 rounded-full px-3 py-1 font-bold text-sm shadow-lg ${deadlineBadgeClass}`}
                  >
                    {timeRemaining}
                  </div>
                )}
                <div className="relative h-44">
                  <Image
                    alt={`Capa de ${oportunidade.nome}`}
                    className="object-cover"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    src={oportunidade.imagem}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/70" />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black to-transparent p-4">
                    <h3 className="line-clamp-2 font-bold text-lg text-white leading-tight">
                      {oportunidade.nome}
                    </h3>
                  </div>
                </div>
                <div className="flex grow flex-col p-4 text-white">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-amber-500">
                        Status:
                      </span>
                      <Select
                        items={statusSelectItems}
                        onValueChange={(value) =>
                          handleRequestStatusChange(
                            oportunidade.id,
                            value as ApplicationStatus
                          )
                        }
                        value={status}
                      >
                        <SelectTrigger className="h-auto w-[11rem] rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {statusOptions.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-5 text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold text-amber-500">
                          País:
                        </span>
                      </div>
                      <span>{oportunidade.pais}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <CalendarDaysIcon className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold text-amber-500">
                          Prazo:
                        </span>
                      </div>
                      <span>{oportunidade.prazoInscricao}</span>
                    </div>
                  </div>
                  {status === "Em preparação" && (
                    <Button
                      className="mt-3 flex items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-center font-bold text-black text-sm transition-colors duration-200 hover:bg-amber-600"
                      onClick={() =>
                        handleRequestStatusChange(oportunidade.id, "Inscrito")
                      }
                      type="button"
                      variant="ghost"
                    >
                      <CheckCircleIcon className="h-4 w-4" /> Marcar como
                      aplicado
                    </Button>
                  )}
                  {status === "Inscrito" && (
                    <Button
                      className="mt-3 flex items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-center font-bold text-black text-sm transition-colors duration-200 hover:bg-amber-600"
                      onClick={() =>
                        handleRequestStatusChange(oportunidade.id, "Aprovado")
                      }
                      type="button"
                      variant="ghost"
                    >
                      <CheckCircleIcon className="h-4 w-4" /> Marcar como
                      aprovado
                    </Button>
                  )}
                  {isApproved && (
                    <div className="mt-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center font-bold text-amber-300 text-sm">
                      Processo concluído
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <Link
                      className="rounded-full bg-slate-950 px-4 py-2 text-center font-bold text-amber-500 text-sm transition-colors duration-200 hover:bg-slate-800"
                      href={oportunidade.detalhePath}
                    >
                      Ver Detalhes
                    </Link>
                    <div className="flex items-center space-x-2">
                      <Button
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-red-500 transition-colors duration-200 hover:bg-slate-800"
                        onClick={() =>
                          handleRemoveFromList(
                            oportunidade.detalhePath,
                            oportunidade.nome,
                            oportunidade.id,
                            oportunidade.categoria
                          )
                        }
                        title="Remover dos favoritos"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                      <Button
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white transition-colors duration-200 hover:bg-slate-800"
                        onClick={() => handleToggleExpand(oportunidade.id)}
                        title="Ver checklist"
                        type="button"
                        variant="ghost"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 border-slate-950 border-t pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-bold text-amber-500">
                          Checklist{" "}
                          <span className="font-normal text-white">
                            ({completedCount}/{totalCount})
                          </span>
                        </h4>
                        <Button
                          className="rounded-full bg-slate-950 p-2 text-sm text-white hover:bg-slate-800"
                          disabled={isApproved}
                          onClick={() =>
                            setShowAddMenu(
                              showAddMenu === oportunidade.id
                                ? null
                                : oportunidade.id
                            )
                          }
                          title={
                            isApproved
                              ? "Checklist em modo leitura para oportunidades aprovadas"
                              : "Adicionar item"
                          }
                          type="button"
                          variant="ghost"
                        >
                          {showAddMenu === oportunidade.id ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <PlusIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="mb-4 text-sm text-white">
                        {isApproved
                          ? "Oportunidade concluída. O checklist está em modo leitura."
                          : "Adicione tarefas para acompanhar sua aplicação."}
                      </p>
                      {showNearDeadlineWarning && (
                        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200 text-sm">
                          Você ainda não terminou suas tarefas.
                        </p>
                      )}
                      {showSuggestMarkAsApplied && (
                        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200 text-sm">
                          <p className="mb-2 font-semibold">
                            Marcar como aplicado?
                          </p>
                          <Button
                            className="rounded-full bg-amber-500 px-3 py-1.5 font-bold text-black transition-colors hover:bg-amber-600"
                            onClick={() =>
                              handleRequestStatusChange(
                                oportunidade.id,
                                "Inscrito"
                              )
                            }
                            type="button"
                            variant="ghost"
                          >
                            Sim, marcar agora
                          </Button>
                        </div>
                      )}
                      {showAddMenu === oportunidade.id && !isApproved && (
                        <div className="mb-4 flex gap-2">
                          <Input
                            className="flex-1 rounded-md border border-slate-900 bg-slate-950 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            disabled={isApproved}
                            onChange={(e) => setCustomItem(e.target.value)}
                            placeholder="Novo item da checklist"
                            type="text"
                            value={customItem}
                          />
                          <Button
                            className="rounded-md bg-amber-500 px-3 py-2 font-bold text-black text-sm"
                            disabled={isApproved}
                            onClick={() =>
                              handleAddItem(oportunidade.id, customItem)
                            }
                            type="button"
                            variant="ghost"
                          >
                            Adicionar
                          </Button>
                        </div>
                      )}
                      <ul className="space-y-2">
                        {items.map((item, index) => (
                          <li
                            className="flex items-center justify-between rounded-lg border border-slate-900 bg-slate-950 p-3"
                            key={`${oportunidade.id}-${item.text}`}
                          >
                            <div className="flex flex-1 items-center space-x-2">
                              <Checkbox
                                checked={item.completed}
                                className="rounded border-slate-900 bg-slate-900 text-amber-500 focus:ring-amber-500"
                                disabled={isApproved}
                                onCheckedChange={() =>
                                  handleChecklistItem(oportunidade.id, index)
                                }
                              />
                              <span
                                className={`text-sm ${item.completed ? "text-white line-through" : "text-white"}`}
                              >
                                {item.text}
                              </span>
                            </div>
                            <Button
                              className="text-white transition-colors hover:text-red-500"
                              disabled={isApproved}
                              onClick={() =>
                                handleDeleteItem(oportunidade.id, index)
                              }
                              title="Remover item"
                              type="button"
                              variant="ghost"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="col-span-full text-center text-white">
            Você ainda não salvou nenhuma oportunidade.
          </p>
        )}
      </div>

      <ConfirmationModal
        accentColor="amber"
        confirmText="Sim"
        isOpen={Boolean(deleteConfirmation)}
        message="Tem certeza que deseja remover este item?"
        onCancel={() => setDeleteConfirmation(null)}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmationModal
        accentColor="amber"
        confirmText="Sim"
        isOpen={Boolean(pendingStatusChange)}
        message={`Deseja alterar o status para ${pendingStatusChange?.nextStatus ?? ""}?`}
        onCancel={() => setPendingStatusChange(null)}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
};

export default ProfileOpportunities;
