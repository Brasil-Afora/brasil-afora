import NacionalMain from "@/components/national-opportunities/nacional-main";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";

export default function NationalOpportunitiesPage() {
  return <NacionalMain verifiedLocations={getVerifiedLocations().national} />;
}
