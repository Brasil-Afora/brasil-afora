# AGENTS - src/components/international-opportunities

## Objetivo da pasta
- Fluxo completo de oportunidades internacionais: listagem, filtros, detalhes e favoritos.

## Arquivos relevantes
- internacional-main.tsx: composicao da pagina principal internacional.
- internacional-list.tsx: renderizacao de cards/lista.
- internacional-filter.tsx: filtros com dropdowns baseados em combobox.
- internacional-info.tsx: pagina de detalhes e acoes de favorito.
- internacional-confirmation-popup.tsx: confirmacao de remocao de favorito.
- types.ts: tipos locais do dominio internacional.

## Regras para agentes
- Tema de acento internacional deve permanecer blue.
- Mantenha integracao de favoritos sem quebrar login obrigatorio.
- Preservar comportamento de tabs internas em detalhes.
- Evitar logica duplicada com national-opportunities quando possivel.
