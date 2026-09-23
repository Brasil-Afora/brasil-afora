"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useCatalogClock } from "@/hooks/use-catalog-clock";
export default function CatalogExpiryRefresh() {
  const now = useCatalogClock();
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(now);
  const previous = useRef(day);
  const router = useRouter();
  useEffect(() => {
    if (previous.current !== day) {
      previous.current = day;
      router.refresh();
    }
  }, [day, router]);
  return null;
}
