"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "ba-theme";
const THEME_COOKIE_MAX_AGE = 31_536_000;
const THEME_COOKIE_REGEX = /(?:^|; )ba-theme=(dark|light)/;

const isTheme = (value: string | null): value is Theme =>
  value === "dark" || value === "light";

const readStoredTheme = (): Theme | null => {
  try {
    const local = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(local)) {
      return local;
    }
  } catch {
    // Private mode: fall through to the cookie, then the default.
  }

  try {
    const match = THEME_COOKIE_REGEX.exec(document.cookie);
    if (match && isTheme(match[1])) {
      return match[1];
    }
  } catch {
    // Cookies blocked: fall through to the default.
  }

  return null;
};

interface UseThemeResult {
  mounted: boolean;
  theme: Theme;
  toggleTheme: () => void;
}

/**
 * Dark is the default (today's look). The choice persists in localStorage
 * with a cookie mirror so a future middleware/SSR pass can read it without
 * JavaScript. The pre-paint inline script in `RootLayout` applies the stored
 * value before first paint to avoid a theme flash.
 */
const useTheme = (): UseThemeResult => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    const initial =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(stored ?? initial);
    setMounted(true);
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the cookie below still carries the choice.
    }
    try {
      // biome-ignore lint/suspicious/noDocumentCookie: theme persistence mirror (localStorage is primary); Cookie Store API lacks Safari support.
      document.cookie = `${THEME_STORAGE_KEY}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
    } catch {
      // Cookies blocked: the page still switches for this session.
    }
    setTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [applyTheme, theme]);

  return { mounted, theme, toggleTheme };
};

export default useTheme;
