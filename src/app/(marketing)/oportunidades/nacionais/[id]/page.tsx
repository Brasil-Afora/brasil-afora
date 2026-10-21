import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import NacionalInfo from "@/components/national-opportunities/nacional-info";
import { isOpportunityUuid } from "@/lib/opportunity-path";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";
import { searchTitle } from "@/server/opportunity-metadata";
import { getNationalOpportunityPage } from "@/server/opportunity-page";

export async function generateMetadata(
  props: PageProps<"/oportunidades/nacionais/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const page = await getNationalOpportunityPage(id);
  if (!page) {
    notFound();
  }
  const { metadata, path } = page;
  return {
    alternates: { canonical: path },
    description: metadata.description,
    openGraph: {
      description: metadata.description,
      title: metadata.title,
      url: path,
    },
    title: searchTitle(metadata.title),
  };
}

export default async function NationalOpportunityDetailsPage(
  props: PageProps<"/oportunidades/nacionais/[id]">
) {
  const { id: segment } = await props.params;
  const page = await getNationalOpportunityPage(segment);
  if (!page) {
    notFound();
  }
  // Old UUID links and renamed slugs move to the current address. Without the
  // record's display name the address can't be trusted, so it stays put.
  const isCanonical = page.path.endsWith(`/${segment}`);
  if (!isCanonical && (page.opportunity || isOpportunityUuid(segment))) {
    permanentRedirect(page.path);
  }

  return (
    <NacionalInfo
      id={page.id}
      initialOpportunity={page.opportunity}
      verifiedLocations={getVerifiedLocations().national[page.id]}
    />
  );
}
