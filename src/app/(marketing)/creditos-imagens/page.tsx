import type { Metadata } from "next";
import credits from "@/data/curated-image-credits.json";

export const metadata: Metadata = {
  title: "Créditos das imagens | Brasil Afora",
};

export default function ImageCreditsPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 text-slate-100">
      <h1 className="font-semibold text-3xl">Créditos das imagens</h1>
      <p className="mt-4 text-mist">
        Fotografias e materiais das instituições, programas e destinos. Algumas
        imagens são ilustrativas do tema ou da instituição e não representam
        participantes de uma edição específica.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {credits.map((credit) => (
          <li
            className="rounded-xl border border-navy-700 p-5"
            id={`fonte-${credit.index}`}
            key={credit.index}
          >
            <h2 className="font-semibold">{credit.name}</h2>
            <p className="mt-2 text-mist text-sm">
              {credit.author ? `${credit.author} · ` : ""}
              {credit.license}
            </p>
            <p className="mt-2 text-mist text-xs">{credit.changes}</p>
            <a
              className="mt-3 inline-block text-signal underline underline-offset-4"
              href={credit.source}
              rel="noopener noreferrer"
              target="_blank"
            >
              Fonte da imagem
            </a>
            {credit.licenseUrl ? (
              <a
                className="ml-4 text-signal underline underline-offset-4"
                href={credit.licenseUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Licença
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
