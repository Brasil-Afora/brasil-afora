"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// A JSON value in localStorage that every component reading the same key sees
// change at once (and other tabs too), and that renders as the fallback on the
// server so hydration never disagrees with the browser.

const CHANGE_EVENT = "brasil-afora:stored-json";

// Used when localStorage is blocked (private mode, disabled site data), so the
// page still works for the visit.
const memory = new Map<string, string>();

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
};

const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
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

const parse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const useStoredJson = <T>(
  key: string,
  fallback: T
): [T, (update: (previous: T) => T) => void] => {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );
  // The fallback is a fresh literal on every render; only its content matters.
  const fallbackJson = JSON.stringify(fallback);
  const value = useMemo(
    () => parse<T>(raw, JSON.parse(fallbackJson) as T),
    [raw, fallbackJson]
  );

  const update = useCallback(
    (change: (previous: T) => T) => {
      const current = parse<T>(read(key), JSON.parse(fallbackJson) as T);
      write(key, JSON.stringify(change(current)));
    },
    [key, fallbackJson]
  );

  return [value, update];
};

export default useStoredJson;
