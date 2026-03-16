---
name: corrigir-bug
description: Investigar e corrigir bugs seguindo metodologia estruturada. Usar quando reportado um bug ou comportamento inesperado.
---

# Corrigir Bug

Você vai investigar e corrigir um bug no projeto Caleidoscópio.

## Metodologia

### 1. Reproduzir e Entender
- Qual o comportamento esperado vs. atual?
- Em qual módulo/rota ocorre?
- Usar **Explore agent** para mapear os arquivos envolvidos

### 2. Investigar
- Ler os arquivos relevantes (página, API route, componentes)
- Verificar o `prisma/schema.prisma` para campos e relações
- Checar se é problema de:
  - **Multi-tenant**: Query sem tenantId?
  - **Tipagem**: Campo inexistente no schema?
  - **Auth**: Token expirado/inválido?
  - **Estado**: Race condition no React?
  - **API**: Resposta em formato inesperado?

### 3. Corrigir
- Aplicar a correção mínima necessária (não refatorar código adjacente)
- Manter os padrões do projeto (tipos Prisma, aliases, tenantId)

### 4. Validar
- `npm run build` deve passar sem erros
- Verificar se a correção não introduz regressão

## Bugs Comuns neste Projeto

| Sintoma | Causa Provável | Onde Verificar |
|---------|---------------|----------------|
| Dados de outro tenant | Query sem tenantId | API route `where` clause |
| TypeScript error | Campo removido do schema | Interface vs `prisma/schema.prisma` |
| 401 inesperado | Token expirado | `useAuth` validação |
| Dados não carregam | Header X-User-Data ausente | `src/lib/api.ts` |
| Componente não renderiza | Falta `'use client'` | Topo do arquivo |
