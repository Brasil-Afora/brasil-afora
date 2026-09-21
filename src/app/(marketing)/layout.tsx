import Header from "@/components/header/header";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-200">
      <Header transparent />
      {children}
    </div>
  );
}
