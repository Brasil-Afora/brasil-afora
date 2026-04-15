"use client";

import { useEffect, useState } from "react";

function useStaggeredAnimation(
  itemCount: number,
  delayMs = 30,
  trigger = true
): number[] {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    if (!trigger) {
      setVisibleItems([]);
      return;
    }

    setVisibleItems([]);

    const timers = Array.from({ length: itemCount }, (_, index) =>
      setTimeout(() => {
        setVisibleItems((prev) => [...prev, index]);
      }, index * delayMs)
    );

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [itemCount, delayMs, trigger]);

  return visibleItems;
}

export default useStaggeredAnimation;
