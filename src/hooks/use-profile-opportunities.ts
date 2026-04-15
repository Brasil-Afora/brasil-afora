"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FavoriteOpportunity } from "@/components/profile/types";
import useLocalStorage from "@/hooks/use-local-storage";

interface ChecklistItem {
  completed: boolean;
  text: string;
}

type OpportunitiesChecklist = Record<string, ChecklistItem[]>;

interface DeleteState {
  itemIndex: number;
  oportunidadeId: string;
}

interface PendingStatusChange {
  nextStatus: ApplicationStatus;
  oportunidadeId: string;
}

interface ConfettiPiece {
  color: string;
  delay: number;
  duration: number;
  left: number;
  rotate: number;
  size: number;
}

export type ApplicationStatus = "Em preparação" | "Inscrito" | "Aprovado";

type OpportunitiesStatus = Record<string, ApplicationStatus>;
type OpportunitiesPinned = Record<string, boolean>;

const statusPriority: Record<ApplicationStatus, number> = {
  "Em preparação": 0,
  Inscrito: 1,
  Aprovado: 2,
};

const parseDeadline = (deadlineString: string): Date | null => {
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

  return new Date(year, month, day);
};

const compareFavoriteByStatusAndPin = (
  a: FavoriteOpportunity,
  b: FavoriteOpportunity,
  statusByOpportunity: OpportunitiesStatus,
  pinnedByOpportunity: OpportunitiesPinned
): number => {
  const statusA = statusByOpportunity[a.id] ?? "Em preparação";
  const statusB = statusByOpportunity[b.id] ?? "Em preparação";
  const statusPriorityA = statusPriority[statusA];
  const statusPriorityB = statusPriority[statusB];

  if (statusPriorityA !== statusPriorityB) {
    return statusPriorityA - statusPriorityB;
  }

  const isPinnedA = Boolean(pinnedByOpportunity[a.id]);
  const isPinnedB = Boolean(pinnedByOpportunity[b.id]);
  if (isPinnedA !== isPinnedB) {
    return isPinnedA ? -1 : 1;
  }

  return 0;
};

const compareFavoriteByDeadlineAndName = (
  a: FavoriteOpportunity,
  b: FavoriteOpportunity
): number => {
  const dateA = parseDeadline(a.prazoInscricao);
  const dateB = parseDeadline(b.prazoInscricao);

  if (!(dateA || dateB)) {
    return a.nome.localeCompare(b.nome);
  }
  if (!dateA) {
    return 1;
  }
  if (!dateB) {
    return -1;
  }

  return dateA.getTime() - dateB.getTime();
};

export const statusOptions: ApplicationStatus[] = [
  "Em preparação",
  "Inscrito",
  "Aprovado",
];

interface UseProfileOpportunitiesResult {
  checklistItems: OpportunitiesChecklist;
  confettiPieces: ConfettiPiece[];
  customItem: string;
  deleteConfirmation: DeleteState | null;
  expandedOportunidadeId: string | null;
  handleAddItem: (oportunidadeId: string, itemText: string) => void;
  handleChecklistItem: (oportunidadeId: string, itemIndex: number) => void;
  handleConfirmDelete: () => void;
  handleConfirmStatusChange: () => void;
  handleDeleteItem: (oportunidadeId: string, itemIndex: number) => void;
  handleRequestStatusChange: (
    oportunidadeId: string,
    nextStatus: ApplicationStatus
  ) => void;
  handleToggleExpand: (id: string) => void;
  handleTogglePin: (oportunidadeId: string) => void;
  pendingStatusChange: PendingStatusChange | null;
  pinnedByOpportunity: OpportunitiesPinned;
  setCustomItem: (value: string) => void;
  setDeleteConfirmation: (value: DeleteState | null) => void;
  setPendingStatusChange: (value: PendingStatusChange | null) => void;
  setShowAddMenu: (value: string | null) => void;
  showAddMenu: string | null;
  showCelebration: boolean;
  sortedFavoriteOpportunities: FavoriteOpportunity[];
  statusByOpportunity: OpportunitiesStatus;
}

const useProfileOpportunities = (
  favoriteOpportunities: FavoriteOpportunity[]
): UseProfileOpportunitiesResult => {
  const [expandedOportunidadeId, setExpandedOportunidadeId] = useState<
    string | null
  >(null);
  const [checklistItems, setChecklistItems] =
    useLocalStorage<OpportunitiesChecklist>("oportunidadesChecklist", {});
  const [statusByOpportunity, setStatusByOpportunity] =
    useLocalStorage<OpportunitiesStatus>("oportunidadesStatus", {});
  const [pinnedByOpportunity, setPinnedByOpportunity] =
    useLocalStorage<OpportunitiesPinned>("oportunidadesPinned", {});
  const [customItem, setCustomItem] = useState("");
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteState | null>(null);
  const [pendingStatusChange, setPendingStatusChange] =
    useState<PendingStatusChange | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => ({
        color: ["#f59e0b", "#fbbf24", "#fde68a", "#ffffff"][index % 4],
        delay: Math.random() * 0.5,
        duration: 1.7 + Math.random() * 1.4,
        left: Math.random() * 100,
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 7,
      })),
    []
  );

  const handleToggleExpand = (id: string) => {
    setExpandedOportunidadeId(expandedOportunidadeId === id ? null : id);
    setShowAddMenu(null);
  };

  const handleAddItem = (oportunidadeId: string, itemText: string) => {
    if (itemText.trim() === "") {
      return;
    }

    setChecklistItems((prev) => ({
      ...prev,
      [oportunidadeId]: [
        ...(prev[oportunidadeId] || []),
        { text: itemText, completed: false },
      ],
    }));
    setCustomItem("");
    setShowAddMenu(null);
  };

  const handleChecklistItem = (oportunidadeId: string, itemIndex: number) => {
    setChecklistItems((prev) => {
      const checklist = [...(prev[oportunidadeId] || [])];
      checklist[itemIndex] = {
        ...checklist[itemIndex],
        completed: !checklist[itemIndex].completed,
      };
      return { ...prev, [oportunidadeId]: checklist };
    });
  };

  const handleDeleteItem = (oportunidadeId: string, itemIndex: number) => {
    setDeleteConfirmation({ oportunidadeId, itemIndex });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmation) {
      return;
    }

    const { oportunidadeId, itemIndex } = deleteConfirmation;
    setChecklistItems((prev) => {
      const checklist = [...(prev[oportunidadeId] || [])];
      checklist.splice(itemIndex, 1);
      return { ...prev, [oportunidadeId]: checklist };
    });
    setDeleteConfirmation(null);
  };

  const handleTogglePin = (oportunidadeId: string) => {
    setPinnedByOpportunity((prev) => ({
      ...prev,
      [oportunidadeId]: !prev[oportunidadeId],
    }));
  };

  const handleStatusChange = (
    oportunidadeId: string,
    nextStatus: ApplicationStatus
  ) => {
    setStatusByOpportunity((prev) => ({
      ...prev,
      [oportunidadeId]: nextStatus,
    }));

    if (nextStatus !== "Aprovado") {
      return;
    }

    setShowCelebration(true);
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = window.setTimeout(() => {
      setShowCelebration(false);
      celebrationTimerRef.current = null;
    }, 2400);
  };

  const handleRequestStatusChange = (
    oportunidadeId: string,
    nextStatus: ApplicationStatus
  ) => {
    setPendingStatusChange({ oportunidadeId, nextStatus });
  };

  const handleConfirmStatusChange = () => {
    if (!pendingStatusChange) {
      return;
    }

    handleStatusChange(
      pendingStatusChange.oportunidadeId,
      pendingStatusChange.nextStatus
    );
    setPendingStatusChange(null);
  };

  const sortedFavoriteOpportunities = useMemo(() => {
    return [...favoriteOpportunities].sort((a, b) => {
      const comparison = compareFavoriteByStatusAndPin(
        a,
        b,
        statusByOpportunity,
        pinnedByOpportunity
      );

      if (comparison !== 0) {
        return comparison;
      }

      return compareFavoriteByDeadlineAndName(a, b);
    });
  }, [favoriteOpportunities, pinnedByOpportunity, statusByOpportunity]);

  return {
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
  };
};

export default useProfileOpportunities;
