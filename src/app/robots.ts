import type { MetadataRoute } from "next";

const DEFAULT_SITE_URL = "http://localhost:3000";
const TRAILING_SLASH_PATTERN = /\/$/;

const getSiteUrl = (): string => {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredUrl) {
    return DEFAULT_SITE_URL;
  }

  try {
    return new URL(configuredUrl)
      .toString()
      .replace(TRAILING_SLASH_PATTERN, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
};

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/perfil",
        "/login",
        "/cadastro",
        "/esqueci-senha",
        "/redefinir-senha",
        "/verificar-email",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
