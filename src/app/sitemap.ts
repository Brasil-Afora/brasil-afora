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

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/mapa`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/oportunidades/nacionais`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/oportunidades/internacionais`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
