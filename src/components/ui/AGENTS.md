# AGENTS - src/components/ui

## Objetivo da pasta
- Biblioteca de componentes de interface reutilizaveis baseada em shadcn/base-ui.
- Esta pasta nao deve conter regra de negocio da aplicacao.

## Arquivos relevantes
- button.tsx: botao com variantes e tamanhos.
- alert-dialog.tsx / dialog.tsx: modais e confirmacoes.
- input.tsx / textarea.tsx / field.tsx / label.tsx: base de formularios.
- select.tsx / combobox.tsx / tabs.tsx / dropdown-menu.tsx: selecao e navegacao local.
- sonner.tsx / toast.tsx: notificacoes.
- confirmation-modal.tsx: wrapper de confirmacao com AlertDialog.

## Regras para agentes
- Evite adicionar import de hooks de negocio aqui.
- Use semantic tokens e classes ja adotadas no projeto.
- Preserve API publica de cada componente (props/export).
- Antes de criar novo componente, valide se ja existe equivalente nesta pasta.
