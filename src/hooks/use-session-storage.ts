"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      const savedValue = item ? (JSON.parse(item) as T) : initialValue;
      if (
        typeof savedValue === "object" &&
        savedValue !== null &&
        !Array.isArray(savedValue)
      ) {
        return { ...initialValue, ...(savedValue as object) } as T;
      }

      return savedValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore write failures
    }
  }, [key, value]);

  return [value, setValue];
}

export default useSessionStorage;
