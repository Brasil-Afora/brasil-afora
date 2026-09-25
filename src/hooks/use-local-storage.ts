"use client";

import type { Dispatch, SetStateAction } from "react";
import useStoredState from "./use-stored-state";

function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  return useStoredState("localStorage", key, initialValue);
}

export default useLocalStorage;
