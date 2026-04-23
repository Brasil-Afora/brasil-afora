import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthGroupLayout({ children }: AuthLayoutProps) {
  return children;
}
