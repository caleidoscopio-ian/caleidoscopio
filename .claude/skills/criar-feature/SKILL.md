---
name: criar-feature
description: Implementar feature completa (schema + API + UI + types). Usar para funcionalidades que tocam múltiplas camadas.
---

# Implementar Feature Completa

Você vai implementar uma feature end-to-end no projeto Caleidoscópio.

## Sequência de Implementação

### Fase 1: Planejamento
1. **Entender o escopo** — O que a feature faz? Quais módulos afeta?
2. **Analisar schema** — Ler `prisma/schema.prisma`, verificar se precisa de novos models
3. **Mapear arquivos** — Listar todos os arquivos que serão criados/modificados
4. **Apresentar plano** — Usar o Plan agent para aprovação antes de implementar

### Fase 2: Backend (se necessário alteração de schema)
1. **Alterar schema** — Adicionar/modificar models em `prisma/schema.prisma`
2. **Gerar client** — `npx prisma generate`
3. **Sync DB** — `npx prisma db push` (dev) ou `npx prisma migrate dev` (produção)
4. **Criar API routes** — Seguir padrões de `/criar-api`

### Fase 3: Frontend
1. **Criar tipos** — Interfaces em `src/types/` se necessário
2. **Criar componentes** — Seguir padrões de `/criar-componente`
3. **Adicionar navegação** — Atualizar `src/lib/navigation.ts` se nova rota
4. **Atualizar sidebar** — Se necessário, `src/components/app-sidebar.tsx`

### Fase 4: Validação
1. **Build** — `npm run build` (obrigatório, deve passar sem erros)
2. **Review** — Verificar isolamento multi-tenant, tipos, segurança

## Delegação a Subagents

Para features grandes:
- Use **Explore agent** para pesquisar padrões existentes
- Use **background agents** para build enquanto implementa
- Implemente em commits atômicos (1 camada por commit)

## Checklist Final

- [ ] Schema atualizado (se necessário)
- [ ] API routes com tenantId
- [ ] Componentes acessíveis
- [ ] Navegação atualizada
- [ ] `npm run build` passa sem erros
- [ ] Sem `any`, sem campos fantasma, sem console.log
- [ ] **Arquitetura atualizada** — Seguir tabela "Regra de Manutenção da Arquitetura" no CLAUDE.md
