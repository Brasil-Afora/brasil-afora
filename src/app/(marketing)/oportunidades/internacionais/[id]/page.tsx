import InternacionalInfo from "@/components/international-opportunities/internacional-info";

export default async function InternationalOpportunityDetailsPage(
  props: PageProps<"/oportunidades/internacionais/[id]">
) {
  const { id } = await props.params;

  return <InternacionalInfo id={id} />;
}
