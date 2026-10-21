import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import InternacionalInfo from "@/components/international-opportunities/internacional-info";
import { isOpportunityUuid } from "@/lib/opportunity-path";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";
import { searchTitle } from "@/server/opportunity-metadata";
import { getInternationalOpportunityPage } from "@/server/opportunity-page";

export async function generateMetadata(
  props: PageProps<"/oportunidades/internacionais/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const page = await getInternationalOpportunityPage(id);
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

export default async function InternationalOpportunityDetailsPage(
  props: PageProps<"/oportunidades/internacionais/[id]">
) {
  const { id: segment } = await props.params;
  const page = await getInternationalOpportunityPage(segment);
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
    <InternacionalInfo
      id={page.id}
      initialOpportunity={page.opportunity}
      verifiedLocations={getVerifiedLocations().international[page.id]}
    />
  );
}
