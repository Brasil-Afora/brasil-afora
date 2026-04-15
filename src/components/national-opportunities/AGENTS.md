# AGENTS - src/components/national-opportunities

## Objetivo da pasta
- Fluxo completo de oportunidades nacionais: listagem, filtros, detalhes e favoritos.

## Arquivos relevantes
- nacional-main.tsx: composicao da pagina principal nacional.
- nacional-list.tsx: renderizacao de cards/lista.
- nacional-filter.tsx: filtros com dropdowns baseados em combobox.
- nacional-info.tsx: pagina de detalhes e acoes de favorito.
- nacional-confirmation-popup.tsx: confirmacao de remocao de favorito.
- types.ts: tipos locais do dominio nacional.

## Regras para agentes
- Tema de acento nacional deve permanecer amber.
- Campos especificos nacionais (ex: modalidade/cidadeEstado) nao devem ser removidos.
- Mantenha consistencia com fluxo internacional, sem copiar classes indevidas de cor.
- Preservar links e rotas de detalhe nacionais.
