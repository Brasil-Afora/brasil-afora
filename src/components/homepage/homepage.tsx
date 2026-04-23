"use client";

import {
  GlobeIcon,
  GraduationCapIcon,
  LockOpenIcon,
  type LucideIcon,
  MailIcon,
  MapPinIcon,
  MegaphoneIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import useScrollReveal from "@/hooks/use-scroll-reveal";

interface FeatureItem {
  description: string;
  icon: LucideIcon;
  title: string;
}

const featuresData: FeatureItem[] = [
  {
    icon: GlobeIcon,
    title: "Mundo & Brasil",
    description:
      "Oportunidades internacionais e nacionais centralizadas em um só lugar.",
  },
  {
    icon: GraduationCapIcon,
    title: "Bolsas de Estudo",
    description:
      "Uma curadoria focada em bolsas que realmente transformam carreiras.",
  },
  {
    icon: MegaphoneIcon,
    title: "Feiras Acadêmicas",
    description:
      "Informações atualizadas sobre as maiores feiras e congressos.",
  },
  {
    icon: LockOpenIcon,
    title: "100% Acessível",
    description:
      "Conteúdo gratuito e simplificado para democratizar o acesso à educação.",
  },
];

interface CardItem {
  description: string;
  icon: LucideIcon;
  title: string;
  to: string;
}

const cardData: CardItem[] = [
  {
    to: "/oportunidades/internacionais",
    icon: GlobeIcon,
    title: "Oportunidades Internacionais",
    description:
      "Explore bolsas de estudo, summer camps e intercâmbios ao redor do mundo. O primeiro passo para sua carreira global.",
  },
  {
    to: "/oportunidades/nacionais",
    icon: TrophyIcon,
    title: "Oportunidades Nacionais",
    description:
      "Encontre olimpíadas, feiras científicas e projetos de liderança no Brasil para fortalecer seu currículo.",
  },
  {
    to: "/mapa",
    icon: MapPinIcon,
    title: "Exploração Visual",
    description:
      "Visualize no mapa onde as oportunidades estão localizadas, facilitando sua descoberta geográfica pelo mundo.",
  },
];

const Homepage = () => {
  const [statsRef, statsVisible] = useScrollReveal({ threshold: 0.2 });
  const [whyRef, whyVisible] = useScrollReveal({ threshold: 0.1 });
  const [contactRef, contactVisible] = useScrollReveal({ threshold: 0.1 });

  const [statsVisibleItems, setStatsVisibleItems] = useState<number[]>([]);
  const [cardsVisibleItems, setCardsVisibleItems] = useState<number[]>([]);
  const [contactVisibleItems, setContactVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    if (statsVisible) {
      setStatsVisibleItems([]);
      const timers = [0, 1, 2, 3].map((_, index) =>
        setTimeout(() => {
          setStatsVisibleItems((prev) => [...prev, index]);
        }, index * 100)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [statsVisible]);

  useEffect(() => {
    if (whyVisible) {
      setCardsVisibleItems([]);
      const timers = [0, 1, 2].map((_, index) =>
        setTimeout(() => {
          setCardsVisibleItems((prev) => [...prev, index]);
        }, index * 150)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [whyVisible]);

  useEffect(() => {
    if (contactVisible) {
      setContactVisibleItems([]);
      const timers = [0, 1].map((_, index) =>
        setTimeout(() => {
          setContactVisibleItems((prev) => [...prev, index]);
        }, index * 200)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [contactVisible]);

  const baseTransition = "transition-all duration-700 ease-in-out transform";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black font-inter text-white">
      {/* Hero Section */}
      <div className="relative min-h-screen">
        <div className="absolute inset-0 z-0 bg-linear-to-t from-slate-950 via-slate-950/30 to-slate-900/20 opacity-90" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center md:px-8">
          <p className="mb-5 font-medium text-sm text-white/50 uppercase tracking-[0.2em]">
            Brasil Afora
          </p>
          <h1 className="mb-6 max-w-4xl font-extrabold text-5xl text-white leading-tight tracking-tight md:text-7xl">
            Sua jornada acadêmica não tem fronteiras
          </h1>
          <p className="mb-10 max-w-xl text-lg text-white/70 leading-relaxed">
            Encontre as melhores oportunidades extracurriculares, bolsas e
            feiras, no Brasil e no mundo, em um só lugar.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative bg-slate-900/35 px-4 py-20" ref={statsRef}>
        <div className="container mx-auto">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuresData.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  className={`group flex flex-col items-center rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:border-amber-500/40 hover:bg-slate-800 ${baseTransition} ${statsVisibleItems.includes(index) ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
                  key={feature.title}
                >
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-amber-500">
                    <Icon className="h-[30px] w-[30px]" />
                  </div>
                  <h3 className="mb-2 font-bold text-amber-500 text-lg">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Why Choose Section */}
      <div className="bg-transparent px-4 py-24" ref={whyRef}>
        <div className="container mx-auto text-center">
          <h2
            className={`mb-3 font-extrabold text-4xl text-white md:text-5xl ${baseTransition} ${whyVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          >
            Por Que Escolher Brasil Afora?
          </h2>
          <p
            className={`mx-auto mb-14 max-w-xl text-base text-white/60 ${baseTransition} ${whyVisible ? "translate-y-0 opacity-100 delay-200" : "translate-y-10 opacity-0"}`}
          >
            Três pilares para impulsionar sua trajetória acadêmica.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {cardData.map((card, index) => {
              const Icon = card.icon;
              return (
                <Link
                  className={`group flex flex-col items-center rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:border-amber-500/40 hover:bg-slate-800 ${baseTransition} ${cardsVisibleItems.includes(index) ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
                  href={card.to}
                  key={card.to}
                >
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-amber-500">
                    <Icon className="h-[30px] w-[30px]" />
                  </div>
                  <h3 className="mb-2 font-bold text-amber-500 text-lg">
                    {card.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {card.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      {/* Contact Section */}
      <div className="bg-slate-900/35 px-4 py-24" ref={contactRef}>
        <div className="container mx-auto">
          <h2 className="mb-12 text-center font-extrabold text-4xl text-white md:text-5xl">
            Fale Conosco
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Contact Section */}
            <div
              className={`rounded-xl bg-slate-950 p-8 shadow-lg ${baseTransition} ${contactVisibleItems.includes(0) ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"}`}
            >
              <h3 className="mb-4 font-bold text-2xl text-white">
                Entrar em Contato
              </h3>
              <p className="mb-6 text-base text-white/70">
                Tem alguma sugestão, crítica ou dúvida? Gostaríamos muito de
                ouvir você. Entre em contato conosco através do e-mail.
              </p>
              <div className="flex flex-col items-start space-y-4">
                <div className="flex items-center text-lg text-white">
                  <MailIcon className="mr-3 h-6 w-6 text-amber-500" />
                  <a
                    className="transition-colors hover:text-amber-500"
                    href="mailto:passaporteglobalbr@gmail.com"
                  >
                    passaporteglobalbr@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Submit Opportunity Section */}
            <div
              className={`rounded-xl bg-slate-950 p-8 shadow-lg ${baseTransition} ${contactVisibleItems.includes(1) ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"}`}
            >
              <h3 className="mb-4 font-bold text-2xl text-white">
                Enviar Oportunidade
              </h3>
              <p className="mb-6 text-base text-white/70">
                Encontrou uma oportunidade interessante? Compartilhe conosco!
                Preencha o formulário com os detalhes.
              </p>
              <a
                className="inline-block w-full rounded-full bg-amber-500 px-6 py-3 text-center font-bold text-slate-950 transition-colors duration-300 hover:bg-amber-600"
                href="https://forms.gle/dJrD1eg4y3VHGFap9"
                rel="noopener noreferrer"
                target="_blank"
              >
                Abrir Formulário
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
