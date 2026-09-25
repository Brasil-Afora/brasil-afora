"use client";

import type { Dispatch, SetStateAction } from "react";
import useStoredState from "./use-stored-state";

const isPlainObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Saved objects gain any keys added to the initial value since they were saved. */
const mergeWithInitial = <T>(saved: unknown, initialValue: T): T =>
  isPlainObject(saved) && isPlainObject(initialValue)
    ? ({ ...initialValue, ...saved } as T)
    : (saved as T);

function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  return useStoredState("sessionStorage", key, initialValue, mergeWithInitial);
}

export default useSessionStorage;
