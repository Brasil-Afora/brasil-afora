import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NacionalInfo from "@/components/national-opportunities/nacional-info";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";
import { getOpportunityMetadata } from "@/server/opportunity-metadata";

export async function generateMetadata(
  props: PageProps<"/oportunidades/nacionais/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const metadata = await getOpportunityMetadata("national", id);
  if (!metadata) {
    notFound();
  }
  const url = `/oportunidades/nacionais/${id}`;
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

export default async function NationalOpportunityDetailsPage(
  props: PageProps<"/oportunidades/nacionais/[id]">
) {
  const { id } = await props.params;
  if (!(await getOpportunityMetadata("national", id))) {
    notFound();
  }

  return (
    <NacionalInfo
      id={id}
      verifiedLocations={getVerifiedLocations().national[id]}
    />
  );
}
