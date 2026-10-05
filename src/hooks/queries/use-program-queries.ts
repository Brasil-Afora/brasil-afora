"use client";
import { useQuery } from "@tanstack/react-query";
import type { Program } from "@/components/programs/types";

export const programQueryKeys = { list: () => ["programs", "list"] as const };
/** `initialData` is the list the server already read for the page. */
export const useProgramsQuery = (initialData?: Program[]) =>
  useQuery({
    queryKey: programQueryKeys.list(),
    queryFn: async (): Promise<Program[]> => {
      const response = await fetch("/api/programs");
      if (!response.ok) {
        throw new Error("Não foi possível carregar os programas.");
      }
      return response.json();
    },
    initialData,
  });
