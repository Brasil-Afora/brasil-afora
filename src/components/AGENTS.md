# AGENTS - src/components

## Objetivo da pasta
- Esta pasta concentra componentes React organizados por dominio funcional.
- Cada subpasta deve manter responsabilidade propria (auth, admin, opportunities, profile, world-map, ui).

## Regras para agentes
- Nao misture logica de dominios entre subpastas sem necessidade.
- Prefira reutilizar componentes de src/components/ui antes de criar markup novo.
- Mantenha contratos de props e tipos usados pelos componentes de pagina.
- Sempre preservar classes visuais existentes ao migrar para shadcn.

## Subpastas
- admin: painel administrativo.
- auth: login, cadastro, reset e verificacao.
- header: navegacao global.
- homepage: landing/home.
- international-opportunities: fluxo internacional.
- national-opportunities: fluxo nacional.
- opportunities: componentes compartilhados de listagem/filtro.
- profile: favoritos e checklist do usuario.
- ui: componentes shadcn/base reutilizaveis.
- world-map: visualizacao em mapa.
