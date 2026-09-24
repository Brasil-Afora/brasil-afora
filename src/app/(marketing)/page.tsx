import Homepage from "@/components/homepage/homepage";
import { siteCopy } from "@/lib/copy/pt-br";

export const dynamic = "force-dynamic";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://brasilafora.org/#organization",
      name: siteCopy.brand,
      url: "https://brasilafora.org/",
      logo: "https://brasilafora.org/brasil-afora-logo-og.png",
      sameAs: [
        "https://www.instagram.com/brasilaforaorg/",
        "https://www.tiktok.com/@brasilafora.org",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://brasilafora.org/#website",
      name: siteCopy.brand,
      url: "https://brasilafora.org/",
      description: siteCopy.description,
      inLanguage: siteCopy.locale,
      publisher: { "@id": "https://brasilafora.org/#organization" },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Static JSON-LD; angle brackets are escaped before embedding in HTML.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
        type="application/ld+json"
      />
      <Homepage />
    </>
  );
}
