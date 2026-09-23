import { footerCopy } from "@/lib/copy/pt-br";
import { getVerifiedDestinations } from "@/server/geo/opportunity-locations";
import { getCuratedHomepage } from "@/server/publication/curated-home";
import FeaturedOpportunities from "./featured-opportunities";
import HomeContribute from "./home-contribute";
import {
  getFeaturedOpportunities,
  getVerifiedSearchEntries,
} from "./home-data";
import HomeHero from "./home-hero";
import HomeMapTeaser from "./home-map-teaser";
import HomeWhy from "./home-why";

const GEONAMES_CREDIT = {
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  url: "https://www.geonames.org/",
};

const creditLinkClassName =
  "underline decoration-navy-600 underline-offset-2 transition-colors hover:text-slate-200";

const Homepage = async () => {
  const curated = await getCuratedHomepage();
  const featured = curated?.featured ?? getFeaturedOpportunities();
  const verifiedEntries =
    curated?.entries ?? getVerifiedSearchEntries(featured);
  const verifiedDestinations =
    curated?.destinations ?? getVerifiedDestinations();

  return (
    <div className="overflow-x-clip bg-navy-950 font-reading text-slate-100">
      <HomeHero verifiedEntries={verifiedEntries} />
      <FeaturedOpportunities opportunities={featured} />

      <div className="mx-auto grid w-full max-w-[84rem] gap-8 px-5 pb-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
        <HomeWhy />
        <HomeMapTeaser verifiedDestinations={verifiedDestinations} />
      </div>

      <HomeContribute />

      <footer className="border-navy-700/60 border-t">
        <div className="mx-auto flex w-full max-w-[84rem] flex-col gap-2 px-5 py-6 text-[13px] text-mist-dim sm:px-8 md:flex-row md:justify-between">
          <p>
            {footerCopy.tagline}{" "}
            <a className={creditLinkClassName} href="/creditos-imagens">
              Créditos das imagens
            </a>
          </p>
          <p>
            {footerCopy.topPhotos} {footerCopy.mapLocations}{" "}
            <a
              className={creditLinkClassName}
              href={GEONAMES_CREDIT.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              GeoNames
            </a>{" "}
            (
            <a
              className={creditLinkClassName}
              href={GEONAMES_CREDIT.licenseUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              CC BY 4.0
            </a>
            )
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
