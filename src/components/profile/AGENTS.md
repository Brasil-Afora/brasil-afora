# AGENTS - src/components/profile

## Objetivo da pasta
- Fluxo de perfil e favoritos do usuario, incluindo checklist por oportunidade.

## Arquivos relevantes
- profile-main.tsx: pagina principal do perfil e tabs.
- profile-opportunities.tsx: cards de favoritos, status e checklist.
- profile-confirmation-popup.tsx: confirmacao de remocao.
- types.ts: tipos locais para favoritos.

## Regras para agentes
- Nao quebrar persistencia local (status/checklist/pin).
- Preserve confirmacoes antes de acoes destrutivas.
- Mantenha compatibilidade com links de detalhes de oportunidades.
- Qualquer alteracao de estado deve respeitar IDs de oportunidade como chave.
