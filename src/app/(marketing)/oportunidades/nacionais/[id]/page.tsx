import NacionalInfo from "@/components/national-opportunities/nacional-info";

export default async function NationalOpportunityDetailsPage(
  props: PageProps<"/oportunidades/nacionais/[id]">
) {
  const { id } = await props.params;

  return <NacionalInfo id={id} />;
}
