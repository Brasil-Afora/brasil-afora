import FeaturedOpportunities from "./featured-opportunities";
import HomeContribute from "./home-contribute";
import {
  getFeaturedOpportunities,
  getMapDestinations,
  getVerifiedSearchEntries,
} from "./home-data";
import HomeHero from "./home-hero";
import HomeMapTeaser from "./home-map-teaser";
import HomeWhy from "./home-why";

const HERO_PHOTO_CREDIT = {
  author: "Magnus Hagdorn",
  license: "CC BY-SA 2.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
  title: "Edinburgh Evening Skyline",
  url: "https://commons.wikimedia.org/wiki/File:Edinburgh_Evening_Skyline.jpg",
};

const creditLinkClassName =
  "underline decoration-navy-600 underline-offset-2 transition-colors hover:text-slate-200";

const Homepage = () => {
  const featured = getFeaturedOpportunities();
  const verifiedEntries = getVerifiedSearchEntries(featured);
  const destinations = getMapDestinations(featured);

  return (
    <div className="overflow-x-clip bg-navy-950 font-reading text-slate-100">
      <HomeHero verifiedEntries={verifiedEntries} />
      <FeaturedOpportunities opportunities={featured} />

      <div className="mx-auto grid w-full max-w-[84rem] gap-8 px-5 pb-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
        <HomeWhy />
        <HomeMapTeaser destinations={destinations} />
      </div>

      <HomeContribute />

      <footer className="border-navy-700/60 border-t">
        <div className="mx-auto flex w-full max-w-[84rem] flex-col gap-2 px-5 py-6 text-[13px] text-mist-dim sm:px-8 md:flex-row md:justify-between">
          <p>Brasil Afora · oportunidades acadêmicas no Brasil e no mundo.</p>
          <p>
            Foto do topo:{" "}
            <a
              className={creditLinkClassName}
              href={HERO_PHOTO_CREDIT.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {HERO_PHOTO_CREDIT.title}
            </a>
            , {HERO_PHOTO_CREDIT.author},{" "}
            <a
              className={creditLinkClassName}
              href={HERO_PHOTO_CREDIT.licenseUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {HERO_PHOTO_CREDIT.license}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
