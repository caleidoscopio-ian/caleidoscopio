---
name: revisar-codigo
description: Code review focado em segurança, multi-tenant, tipagem e padrões do projeto. Usar antes de commits ou PRs.
---

# Revisão de Código

Você vai revisar código do projeto Caleidoscópio focando nos pontos críticos.

## O que Revisar

### 1. Multi-Tenant (CRÍTICO)
- [ ] Todas queries tem filtro `tenantId`?
- [ ] Não há vazamento de dados cross-tenant nas respostas?
- [ ] DELETE/UPDATE validam ownership via tenantId?

### 2. Tipagem TypeScript
- [ ] Zero uso de `any`?
- [ ] Tipos Prisma usados corretamente?
- [ ] Enums validados antes de cast?
- [ ] Interfaces correspondem ao schema real?

### 3. Segurança
- [ ] Input sanitizado?
- [ ] Sem `dangerouslySetInnerHTML`?
- [ ] Sem dados sensíveis em localStorage?
- [ ] 401 tratado com auto-logout?

### 4. Padrões do Projeto
- [ ] Imports via aliases (`@/`)?
- [ ] Sem `console.log`?
- [ ] Error handling padronizado?
- [ ] Loading/error states nos componentes?

### 5. Acessibilidade
- [ ] ARIA labels presentes?
- [ ] Navegação por teclado funciona?
- [ ] Contraste adequado?

## Formato da Revisão

Para cada arquivo revisado, reportar:
- **OK**: Pontos que estão corretos
- **PROBLEMA**: Issues encontradas com sugestão de correção
- **SUGESTÃO**: Melhorias opcionais

## Severidade

- **BLOCKER**: Deve corrigir (segurança, multi-tenant, build quebrado)
- **WARNING**: Deveria corrigir (tipagem fraca, padrão inconsistente)
- **INFO**: Pode melhorar (legibilidade, performance)
