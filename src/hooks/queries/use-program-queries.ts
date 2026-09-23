"use client";
import { useQuery } from "@tanstack/react-query";
import type { Program } from "@/components/programs/types";

export const programQueryKeys = { list: () => ["programs", "list"] as const };
export const useProgramsQuery = () =>
  useQuery({
    queryKey: programQueryKeys.list(),
    queryFn: async (): Promise<Program[]> => {
      const response = await fetch("/api/programs");
      if (!response.ok) {
        throw new Error("Não foi possível carregar os programas.");
      }
      return response.json();
    },
  });
