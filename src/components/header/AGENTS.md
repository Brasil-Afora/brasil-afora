# AGENTS - src/components/header

## Objetivo da pasta
- Fornecer navegacao global desktop/mobile e acesso de conta.
- Integrar estado de sessao no cabecalho.

## Arquivo relevante
- header.tsx: menu principal, dropdown de perfil, menu mobile, logout.

## Regras para agentes
- Preserve comportamento responsivo (desktop vs mobile).
- Nao quebrar fluxo de logout e redirecionamento para /login.
- Links devem permanecer alinhados as rotas existentes do app.
- Ao alterar itens de menu, revisar condicao de role admin.
