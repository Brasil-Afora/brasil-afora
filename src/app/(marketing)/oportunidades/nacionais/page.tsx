import type { Metadata } from "next";
import NacionalMain from "@/components/national-opportunities/nacional-main";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";

export const metadata: Metadata = {
  title: "Bolsas de estudo e oportunidades no Brasil",
  description:
    "Explore bolsas de estudo, olimpíadas, feiras, cursos e programas acadêmicos no Brasil. Encontre oportunidades para estudantes brasileiros.",
  alternates: { canonical: "/oportunidades/nacionais" },
};

export default function NationalOpportunitiesPage() {
  return <NacionalMain verifiedLocations={getVerifiedLocations().national} />;
}
