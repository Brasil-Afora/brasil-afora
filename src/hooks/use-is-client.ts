"use client";

import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => undefined;

/**
 * False during prerender and hydration, true once running in the browser.
 * Anything that depends on today's date (countdowns, open/closed status)
 * waits for it, so prerendered HTML never carries a build-time date.
 */
const useIsClient = (): boolean =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

export default useIsClient;
