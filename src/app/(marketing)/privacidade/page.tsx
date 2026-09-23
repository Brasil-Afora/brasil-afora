import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidade",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-28 leading-relaxed">
      <h1 className="font-bold text-3xl">Privacidade no Brasil Afora</h1>
      <p>Atualizado em 23 de setembro de 2026.</p>
      <section className="space-y-3">
        <h2 className="font-semibold text-xl">Navegação e conta</h2>
        <p>
          Você pode consultar o catálogo sem criar uma conta. Ao se cadastrar, o
          Brasil Afora utiliza seu nome, e-mail, dados de autenticação e
          oportunidades favoritas para oferecer acesso à conta e salvar suas
          escolhas. Senhas de cadastro são armazenadas como hashes, não como
          texto legível.
        </p>
        <p>
          Ao escolher entrar com Google, recebemos os dados básicos autorizados
          de identidade, como nome, e-mail e imagem de perfil, além dos
          identificadores e tokens necessários à autenticação. Esse login não
          solicita acesso ao seu Gmail, Drive ou contatos.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-xl">Cookies e registros técnicos</h2>
        <p>
          Cookies de sessão mantêm o acesso à conta. A preferência de tema é
          salva no navegador. Registros técnicos podem incluir endereço IP,
          navegador, horários e erros para operação e segurança do serviço. O
          site também utiliza Google Analytics para medir navegação e uso, com
          cookies e identificadores associados a essa ferramenta.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-xl">Serviços utilizados</h2>
        <p>
          A hospedagem é fornecida pela Vercel, o banco de dados pela Supabase,
          e os e-mails de confirmação e recuperação pela Resend. O Google
          fornece o login opcional e a ferramenta de análise. Esses serviços
          podem processar informações em outros países; o banco de produção está
          nos Estados Unidos.
        </p>
        <p>
          Links de oportunidades levam a instituições externas, com suas
          próprias práticas de privacidade. As inscrições nesses programas
          acontecem nos canais dessas instituições.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-xl">Contato e solicitações</h2>
        <p>
          Para perguntar sobre seus dados ou solicitar acesso, correção ou
          exclusão da conta e informações associadas, escreva para{" "}
          <a className="underline" href="mailto:fellipe.gleite10@gmail.com">
            fellipe.gleite10@gmail.com
          </a>
          . Poderá ser necessária a confirmação de identidade para atender uma
          solicitação com segurança.
        </p>
      </section>
    </main>
  );
}
