# AGENTS - src/components/admin

## Objetivo da pasta
- Tela administrativa para criar, editar e remover oportunidades.
- Trabalha com modos de formulario e listagem de registros.

## Arquivos relevantes
- admin-page.tsx: pagina principal do painel.
- admin-tabs.tsx: alternancia entre internacional e nacional.
- admin-opportunity-form.tsx: formulario principal (campos e texto).
- admin-records-list.tsx: listagem com acoes de editar/excluir.
- admin-feedback.tsx: mensagens de retorno no fluxo admin.

## Regras para agentes
- Mantenha compatibilidade com tipos e dados vindos dos hooks/admin data.
- Nao remover campos sem validar impacto no backend.
- Preservar tema de cor por contexto (blue internacional, amber nacional).
- Formularios desta pasta devem continuar compatveis com react-hook-form.
