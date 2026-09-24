import type { Metadata } from "next";
import InternacionalMain from "@/components/international-opportunities/internacional-main";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";

export const metadata: Metadata = {
  title: "Estudar fora: bolsas e oportunidades internacionais",
  description:
    "Encontre oportunidades para estudar fora: bolsas de estudo, intercâmbios, cursos e programas internacionais para estudantes brasileiros.",
  alternates: { canonical: "/oportunidades/internacionais" },
};

export default function InternationalOpportunitiesPage() {
  return (
    <InternacionalMain
      verifiedLocations={getVerifiedLocations().international}
    />
  );
}
