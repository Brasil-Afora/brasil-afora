"use client";

import { GlobeIcon, GraduationCapIcon, LockOpenIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import Header from "@/components/header/header";

interface AuthLayoutProps {
  children: ReactNode;
  subtitle: string;
  title: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <Header transparent />
      <div className="flex flex-1">
        {/* Left panel — branding */}
        <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden lg:flex">
          <div className="absolute top-20 left-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute right-10 bottom-20 h-60 w-60 rounded-full bg-amber-500/5 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center space-y-6 px-12 text-center">
            <Link className="flex items-center space-x-3" href="/">
              <Image
                alt="Logo do Brasil Afora"
                className="h-20 w-auto object-contain"
                height={80}
                src="/logo-20260413.png"
                unoptimized
                width={80}
              />
            </Link>

            <div className="mt-8 space-y-3">
              <h1 className="font-bold text-3xl text-white leading-tight">
                Sua jornada acadêmica não tem fronteiras.
              </h1>
              <p className="text-lg text-slate-400">
                Conecte-se às melhores oportunidades, bolsas e feiras, no Brasil
                e no mundo. Tudo em um só lugar para impulsionar seu futuro.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <GraduationCapIcon className="h-8 w-8 text-amber-500" />
                <p className="text-slate-300 text-sm">Curadoria Real</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <GlobeIcon className="h-8 w-8 text-amber-500" />
                <p className="text-slate-300 text-sm">Nacional & Global</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <LockOpenIcon className="h-8 w-8 text-amber-500" />
                <p className="text-slate-300 text-sm">Acesso Gratuito</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-md space-y-2">
            {/* Mobile logo */}
            <Link
              className="mb-6 flex items-center space-x-2 lg:hidden"
              href="/"
            >
              <Image
                alt="Logo do Brasil Afora"
                className="h-12 w-auto object-contain"
                height={48}
                src="/logo-20260413.png"
                unoptimized
                width={48}
              />
              <span className="font-bold text-white">Brasil Afora</span>
            </Link>

            <h2 className="font-bold text-2xl text-white">{title}</h2>
            <p className="text-slate-400">{subtitle}</p>
          </div>

          <div className="mt-8 w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
