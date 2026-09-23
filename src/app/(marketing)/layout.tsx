import Link from "next/link";
import Header from "@/components/header/header";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-200">
      <Header transparent />
      {children}
      <footer className="px-6 py-6 text-center text-slate-400 text-sm">
        <Link className="underline" href="/privacidade">
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
