"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type StorageArea = "localStorage" | "sessionStorage";

/**
 * State mirrored to web storage. The first render always uses `initialValue`,
 * on the server and during hydration alike, so the HTML React hydrates matches
 * what the server sent; the saved value is read right after hydration (before
 * the browser paints) and only then written back. Reading storage during the
 * first render made a reload with saved catalog filters fail hydration.
 *
 * `restore` turns the parsed saved value into state, e.g. by merging in keys
 * added to `initialValue` since it was saved.
 */
function useStoredState<T>(
  area: StorageArea,
  key: string,
  initialValue: T,
  restore: (saved: unknown, initialValue: T) => T = (saved) => saved as T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  // Callers pass fresh literals and callbacks each render; only the first counts.
  const initialRef = useRef({ initialValue, restore });

  useLayoutEffect(() => {
    const { initialValue: initial, restore: revive } = initialRef.current;
    try {
      const item = window[area].getItem(key);
      if (item) {
        setValue(revive(JSON.parse(item), initial));
      }
    } catch {
      // unreadable or blocked storage keeps the initial value
    }
    setLoadedKey(key);
  }, [area, key]);

  useEffect(() => {
    if (loadedKey !== key) {
      return;
    }
    try {
      window[area].setItem(key, JSON.stringify(value));
    } catch {
      // ignore write failures
    }
  }, [area, key, loadedKey, value]);

  return [value, setValue];
}

export default useStoredState;
