# AGENTS - src/components/opportunities

## Objetivo da pasta
- Componentes compartilhados de listagem e filtro usados por fluxos nacional/internacional.

## Arquivos relevantes
- opportunities-main-layout.tsx: layout comum com area de filtros e resultados.
- opportunity-card.tsx: card de oportunidade.
- opportunity-list.tsx: lista de oportunidades.
- opportunity-filter.tsx: filtro generico reutilizavel.
- filter-options.ts: opcoes estaticas de filtro.
- types.ts: tipos compartilhados do dominio de oportunidades.

## Regras para agentes
- Nao acoplar cores fixas fora de `accentColor` quando houver suporte.
- Tipos compartilhados devem continuar sendo fonte de verdade desta pasta.
- Layout deve seguir responsividade atual (mobile sidebar + desktop painel).
- Reutilize FilterDropdown em vez de criar novos dropdowns custom.
