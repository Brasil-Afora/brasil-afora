"use client";

import { useSyncExternalStore } from "react";
import type { Theme } from "./use-theme";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
    attributes: true,
  });
  return () => observer.disconnect();
};

const read = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

const readServer = (): Theme => "dark";

/**
 * The theme applied to the page right now (`<html data-theme>`), following
 * every switch. `useTheme` keeps its own state per caller, so only the toggle
 * that flipped it hears the change; anything else that must react (the
 * /mapa tile layer) reads the document instead.
 */
const useDocumentTheme = (): Theme =>
  useSyncExternalStore(subscribe, read, readServer);

export default useDocumentTheme;
