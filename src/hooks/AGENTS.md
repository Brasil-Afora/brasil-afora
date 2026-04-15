# AGENTS - src/hooks

## Objetivo da pasta
- Hooks reutilizaveis para dados, estado local, animacoes e utilitarios de UI.

## Grupos de hooks
- Dados: use-oportunidades-internacionais, use-oportunidades-nacionais, use-admin-data.
- Estado persistente: use-local-storage, use-session-storage.
- UI/interacao: use-click-outside, use-scroll-observer, use-scroll-reveal, use-staggered-animation.
- Favoritos/filtros/toast: use-favorite-toggle, use-opportunity-filters, use-toast.

## Regras para agentes
- Mantenha hooks puros e sem efeitos colaterais ocultos.
- Sempre revisar arrays de dependencias em useEffect/useCallback.
- Nao acessar DOM diretamente quando houver hook utilitario existente.
- Contratos de retorno dos hooks nao devem mudar sem ajustar consumidores.
