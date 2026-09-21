import {
  GlobeIcon,
  ListFilterIcon,
  LockOpenIcon,
  type LucideIcon,
  ShieldCheckIcon,
} from "lucide-react";

interface Reason {
  description: string;
  icon: LucideIcon;
  title: string;
}

const REASONS: Reason[] = [
  {
    icon: ShieldCheckIcon,
    title: "Fontes oficiais à vista",
    description:
      "Cada oportunidade da seleção verificada traz o link oficial e a data em que foi conferida.",
  },
  {
    icon: GlobeIcon,
    title: "Brasil e mundo juntos",
    description:
      "Olimpíadas, feiras e programas nacionais ao lado de bolsas e cursos no exterior.",
  },
  {
    icon: ListFilterIcon,
    title: "Do fundamental ao doutorado",
    description:
      "Filtre por nível de ensino, idade, país e tipo de programa para achar o que é seu.",
  },
  {
    icon: LockOpenIcon,
    title: "Gratuito, sem cadastro",
    description:
      "Explore tudo livremente. A conta só serve para salvar suas favoritas.",
  },
];

const HomeWhy = () => (
  <section aria-labelledby="porque-titulo" className="lg:pt-7 lg:pr-4">
    <h2
      className="font-bold text-[1.375rem] text-white leading-tight"
      id="porque-titulo"
    >
      Por que usar o Brasil Afora
    </h2>
    <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
      {REASONS.map(({ description, icon: Icon, title }) => (
        <li className="flex gap-4 border-navy-700/70 border-t py-5" key={title}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy-600 text-slate-100">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-[16px] text-white">{title}</h3>
            <p className="mt-1 text-[14px] text-mist leading-relaxed">
              {description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

export default HomeWhy;
