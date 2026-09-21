"use client";

import { useCallback } from "react";
import {
  type ApplicationStatus,
  PINNED_STORAGE_KEY,
  type PinnedById,
  type ProfileItem,
  STATUS_STORAGE_KEY,
  type StatusById,
  TASKS_STORAGE_KEY,
  type TasksById,
} from "@/components/profile/profile-model";
import {
  clearApplicationSteps,
  useAllApplicationSteps,
} from "./use-application-steps";
import useStoredJson from "./use-stored-json";

const EMPTY = {};

const without = <T>(record: Record<string, T>, id: string) => {
  const { [id]: _removed, ...rest } = record;
  return rest;
};

/**
 * The student's own tracking of each application, kept in this browser:
 * status, pin, their tasks, and the steps ticked on the opportunity pages.
 */
const useApplicationTracker = () => {
  const [statuses, setStatuses] = useStoredJson<StatusById>(
    STATUS_STORAGE_KEY,
    EMPTY
  );
  const [pinned, setPinned] = useStoredJson<PinnedById>(
    PINNED_STORAGE_KEY,
    EMPTY
  );
  const [tasks, setTasks] = useStoredJson<TasksById>(TASKS_STORAGE_KEY, EMPTY);
  const steps = useAllApplicationSteps();

  const setStatus = useCallback(
    (id: string, status: ApplicationStatus) =>
      setStatuses((previous) => ({ ...previous, [id]: status })),
    [setStatuses]
  );

  const togglePin = useCallback(
    (id: string) =>
      setPinned((previous) => ({ ...previous, [id]: !previous[id] })),
    [setPinned]
  );

  const addTask = useCallback(
    (id: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      setTasks((previous) => ({
        ...previous,
        [id]: [...(previous[id] ?? []), { completed: false, text: trimmed }],
      }));
    },
    [setTasks]
  );

  const toggleTask = useCallback(
    (id: string, index: number) =>
      setTasks((previous) => ({
        ...previous,
        [id]: (previous[id] ?? []).map((task, position) =>
          position === index ? { ...task, completed: !task.completed } : task
        ),
      })),
    [setTasks]
  );

  /** Removes a task; `restoreTask` puts it back, for an undo. */
  const removeTask = useCallback(
    (id: string, index: number) =>
      setTasks((previous) => ({
        ...previous,
        [id]: (previous[id] ?? []).filter((_, position) => position !== index),
      })),
    [setTasks]
  );

  const restoreTask = useCallback(
    (id: string, index: number, task: { completed: boolean; text: string }) =>
      setTasks((previous) => {
        const list = [...(previous[id] ?? [])];
        list.splice(index, 0, task);
        return { ...previous, [id]: list };
      }),
    [setTasks]
  );

  /** Forgets everything tracked for one opportunity. */
  const stopTracking = useCallback(
    (item: ProfileItem) => {
      setStatuses((previous) => without(previous, item.id));
      setPinned((previous) => without(previous, item.id));
      setTasks((previous) => without(previous, item.id));
      clearApplicationSteps(item.stepsKey);
    },
    [setPinned, setStatuses, setTasks]
  );

  return {
    addTask,
    pinned,
    removeTask,
    restoreTask,
    setStatus,
    statuses,
    steps,
    stopTracking,
    tasks,
    toggleTask,
    togglePin,
  };
};

export type ApplicationTracker = ReturnType<typeof useApplicationTracker>;

export default useApplicationTracker;
