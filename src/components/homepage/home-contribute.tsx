import { ArrowUpRightIcon, MailIcon } from "lucide-react";

const SUBMISSION_FORM_URL = "https://forms.gle/dJrD1eg4y3VHGFap9";
const CONTACT_EMAIL = "equipe@brasilafora.org";

const HomeContribute = () => (
  <section
    aria-labelledby="contribua-titulo"
    className="mx-auto w-full max-w-[84rem] px-5 pb-16 sm:px-8"
  >
    <div className="flex flex-col gap-6 rounded-2xl border border-navy-700 bg-navy-900/60 px-6 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2
          className="text-balance font-bold text-[1.375rem] text-white leading-tight"
          id="contribua-titulo"
        >
          Conhece uma oportunidade que ainda não está aqui?
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] text-mist leading-relaxed">
          Compartilhe com a gente pelo formulário. Para dúvidas, críticas ou
          sugestões, escreva para{" "}
          <a
            className="inline-flex items-center gap-1 text-slate-100 underline decoration-navy-600 underline-offset-4 transition-colors hover:text-white hover:decoration-signal"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            <MailIcon aria-hidden="true" className="h-4 w-4" />
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
      <a
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-signal px-6 font-semibold text-[15px] text-navy-950 transition-colors duration-200 hover:bg-signal-strong lg:self-auto"
        href={SUBMISSION_FORM_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        Enviar oportunidade
        <span className="sr-only">(abre em nova aba)</span>
        <ArrowUpRightIcon aria-hidden="true" className="h-4 w-4" />
      </a>
    </div>
  </section>
);

export default HomeContribute;
