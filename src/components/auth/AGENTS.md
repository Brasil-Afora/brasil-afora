# AGENTS - src/components/auth

## Objetivo da pasta
- Implementar fluxos de autenticacao e telas relacionadas.
- Integracao principal com src/lib/auth-client.ts.

## Arquivos relevantes
- auth-layout.tsx: estrutura visual das paginas de autenticacao.
- auth-ui.tsx: campos/botoes de auth (baseados em shadcn).
- sign-in-page.tsx: login.
- sign-up-page.tsx: cadastro.
- forgot-password-page.tsx: solicitacao de reset.
- reset-password-page.tsx: redefinicao de senha.
- verify-email-page.tsx: validacao e reenvio de email.
- As protecoes de rota ficam no App Router via server/session guards.

## Regras para agentes
- Manter redirecionamentos coerentes com rotas do App Router do Next.js.
- Formularios devem usar react-hook-form quando aplicavel.
- Nao duplicar chamadas de auth; reutilize funcoes de auth-client.
- Preserve mensagens de erro/sucesso em portugues.
