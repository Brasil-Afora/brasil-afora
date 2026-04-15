# AGENTS - src/components/world-map

## Objetivo da pasta
- Visualizacao de oportunidades em mapa e painel lateral de paises/oportunidades.

## Arquivos relevantes
- world-map-page.tsx: pagina do mapa e painel de detalhes.
- world-map.tsx: componente do mapa em si.
- WorldMap.css: estilos especificos do mapa.

## Regras para agentes
- Preservar interacao de clique em pais e sincronizacao com painel lateral.
- Evitar regressao de performance em renderizacao de mapa.
- Nao remover mapeamento de codigos de pais sem revisar impacto no destaque.
- Alteracoes visuais devem manter legibilidade em fundo escuro atual.
