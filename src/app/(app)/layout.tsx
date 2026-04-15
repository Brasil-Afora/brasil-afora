import Header from "@/components/header/header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header />
      {children}
    </div>
  );
}
