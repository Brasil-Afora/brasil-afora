import type { Metadata } from "next";
import ProgramsMain from "@/components/programs/programs-main";

export const metadata: Metadata = {
  title: "Programas e Bolsas",
  description:
    "Bolsas de estudo, mentorias, preparatórios e programas de acesso para estudantes brasileiros, no Brasil e no exterior.",
  alternates: { canonical: "/programas-e-bolsas" },
};

export default function ProgramsPage() {
  return <ProgramsMain />;
}
