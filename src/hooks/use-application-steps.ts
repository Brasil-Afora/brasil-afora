"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Which application steps the student has ticked off for one opportunity.
// For now this lives in the browser only; it is the seed of an "applications
// in progress" list on the profile.

const STORAGE_PREFIX = "brasil-afora:etapas:";
const CHANGE_EVENT = "brasil-afora:etapas-change";

// Used when localStorage is blocked (private mode, disabled site data), so the
// checkboxes still work for the visit.
const memory = new Map<string, string>();

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
};

const write = (key: string, done: Set<string>) => {
  const value = JSON.stringify([...done]);
  try {
    if (done.size === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    memory.set(key, value);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
};

const parse = (raw: string | null): Set<string> => {
  if (!raw) {
    return new Set();
  }
  try {
    const value: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : []
    );
  } catch {
    return new Set();
  }
};

/** Every opportunity with ticked steps, as one string so React can compare it. */
const readAll = (): string => {
  const entries: [string, string][] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(STORAGE_PREFIX)) {
        entries.push([key, window.localStorage.getItem(key) ?? ""]);
      }
    }
  } catch {
    // Storage blocked: only this visit's ticks, kept in memory.
  }
  for (const [key, value] of memory) {
    entries.push([key, value]);
  }
  return JSON.stringify(entries.sort(([a], [b]) => a.localeCompare(b)));
};

/**
 * Ticked steps of every opportunity, keyed like the detail page stores them
 * ("international:<id>" / "national:<id>"). The profile reads this to list the
 * applications a student has started.
 */
export const useAllApplicationSteps = (): Record<string, string[]> => {
  const raw = useSyncExternalStore(subscribe, readAll, () => "[]");
  return useMemo(() => {
    const entries = JSON.parse(raw) as [string, string][];
    return Object.fromEntries(
      entries
        .map(([key, value]) => [
          key.slice(STORAGE_PREFIX.length),
          [...parse(value)],
        ])
        .filter(([, done]) => done.length > 0)
    );
  }, [raw]);
};

/** Forgets the ticked steps of one opportunity. */
export const clearApplicationSteps = (opportunityKey: string) =>
  write(`${STORAGE_PREFIX}${opportunityKey}`, new Set());

const useApplicationSteps = (opportunityKey: string) => {
  const storageKey = `${STORAGE_PREFIX}${opportunityKey}`;
  const raw = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => null
  );
  const done = useMemo(() => parse(raw), [raw]);

  const toggle = useCallback(
    (step: string) => {
      const next = new Set(done);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      write(storageKey, next);
    },
    [done, storageKey]
  );

  const clear = useCallback(() => write(storageKey, new Set()), [storageKey]);

  return { clear, done, toggle };
};

export default useApplicationSteps;
