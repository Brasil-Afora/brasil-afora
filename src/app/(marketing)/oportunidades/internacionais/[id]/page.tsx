import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InternacionalInfo from "@/components/international-opportunities/internacional-info";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";
import { getOpportunityMetadata } from "@/server/opportunity-metadata";

export async function generateMetadata(
  props: PageProps<"/oportunidades/internacionais/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const metadata = await getOpportunityMetadata("international", id);
  if (!metadata) {
    notFound();
  }
  const url = `/oportunidades/internacionais/${id}`;
  return {
    alternates: { canonical: url },
    description: metadata.description,
    openGraph: {
      description: metadata.description,
      title: metadata.title,
      url,
    },
    title: metadata.title,
  };
}

export default async function InternationalOpportunityDetailsPage(
  props: PageProps<"/oportunidades/internacionais/[id]">
) {
  const { id } = await props.params;
  if (!(await getOpportunityMetadata("international", id))) {
    notFound();
  }

  return (
    <InternacionalInfo
      id={id}
      verifiedLocations={getVerifiedLocations().international[id]}
    />
  );
}
