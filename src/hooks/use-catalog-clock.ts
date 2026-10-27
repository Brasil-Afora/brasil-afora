"use client";
import { useEffect, useState } from "react";

/** Recheck deadlines on open pages and immediately after returning to a tab. */
export function useCatalogClock(initialNow?: string) {
  // Cached HTML and its first browser render must use the same instant.
  const [now, setNow] = useState(() =>
    initialNow ? new Date(initialNow) : new Date()
  );
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return now;
}
