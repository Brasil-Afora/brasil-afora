import InternacionalMain from "@/components/international-opportunities/internacional-main";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";

export default function InternationalOpportunitiesPage() {
  return (
    <InternacionalMain
      verifiedLocations={getVerifiedLocations().international}
    />
  );
}
