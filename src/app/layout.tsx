import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import {
  Atkinson_Hyperlegible_Next,
  Caveat,
  Geist,
  Geist_Mono,
  Sora,
} from "next/font/google";
import Script from "next/script";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteCopy } from "@/lib/copy/pt-br";
import "./globals.css";

const SITE_TITLE = siteCopy.title;
const SITE_DESCRIPTION = siteCopy.description;
const FALLBACK_SITE_URL = "https://brasil-afora.vercel.app";

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

const wordmark = Sora({
  variable: "--font-wordmark",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const atkinsonNext = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson-next",
  subsets: ["latin", "latin-ext"],
  // next/font has no fallback metrics for this family yet.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600"],
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
        url: "/brasil-afora-logo-og.png",
        alt: "Logo da plataforma Brasil Afora",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/brasil-afora-logo-og.png"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${wordmark.variable} ${atkinsonNext.variable} ${caveat.variable} h-full antialiased`}
      data-theme="dark"
      lang={siteCopy.locale}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Script id="ba-theme-init" strategy="beforeInteractive">
          {`(function(){try{var m=document.cookie.match(/(?:^|; )ba-theme=(dark|light)/);var t=null;try{t=localStorage.getItem("ba-theme");}catch(e){}if(t!=="light"&&t!=="dark"){t=m?m[1]:"dark";}if(t!=="light"&&t!=="dark"){t="dark";}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`}
        </Script>
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
      <GoogleAnalytics gaId="G-TCGX1Z935P" />
    </html>
  );
}
