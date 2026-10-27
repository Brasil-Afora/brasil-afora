import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { useCatalogClock } from "./use-catalog-clock";

const Clock = ({ snapshot }: { snapshot?: string }) => {
  const now = useCatalogClock(snapshot);
  return createElement("time", null, now.toISOString());
};
afterEach(() => vi.useRealTimers());
it("hydrates a cached page with its serialized date even after midnight", () => {
  vi.useFakeTimers();
  const snapshot = "2026-10-27T02:59:00.000Z";
  vi.setSystemTime(new Date(snapshot));
  const cachedHtml = renderToStaticMarkup(createElement(Clock, { snapshot }));
  vi.setSystemTime(new Date("2026-10-27T03:05:00.000Z"));
  expect(renderToStaticMarkup(createElement(Clock, { snapshot }))).toBe(
    cachedHtml
  );
});
it("keeps the current date as the default for existing callers", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T03:05:00.000Z"));
  expect(renderToStaticMarkup(createElement(Clock))).toContain(
    "2026-10-27T03:05:00.000Z"
  );
});
