import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { Bebas_Neue, Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const SITE_TITLE = "Brasil Afora: encontre oportunidades acadêmicas";
const SITE_DESCRIPTION =
  "Conecte-se às melhores oportunidades, bolsas e feiras, no Brasil e no mundo. Tudo em um só lugar para impulsionar seu futuro!";
const FALLBACK_SITE_URL = "http://localhost:3000";

const getMetadataBase = (): URL => {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredUrl) {
    return new URL(FALLBACK_SITE_URL);
  }

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: SITE_TITLE,
    template: "%s | Brasil Afora",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Brasil Afora",
  keywords: [
    "oportunidades acadêmicas",
    "bolsas de estudo",
    "feiras acadêmicas",
    "intercâmbio",
    "oportunidades internacionais",
    "oportunidades nacionais",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Brasil Afora",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: "/logo-20260413.png",
        alt: "Logo da plataforma Brasil Afora",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/logo-20260413.png"],
  },
  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} h-full antialiased`}
      lang="pt-BR"
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
      <GoogleAnalytics gaId="G-TCGX1Z935P" />
    </html>
  );
}
