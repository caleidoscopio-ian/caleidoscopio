---
name: criar-api
description: Criar novo endpoint REST API seguindo os padrões do projeto. Usar quando precisar criar rotas em src/app/api/.
---

# Criar API Endpoint

Você vai criar um endpoint REST API para o projeto Caleidoscópio.

## Etapas

1. **Analisar o schema** — Ler `prisma/schema.prisma` para entender os models envolvidos
2. **Verificar endpoints existentes** — Buscar em `src/app/api/` endpoints similares como referência
3. **Criar a estrutura de arquivos**:
   - Coleção: `src/app/api/{recurso}/route.ts` (GET lista, POST cria)
   - Item: `src/app/api/{recurso}/[id]/route.ts` (GET detalhe, PUT atualiza, DELETE remove)
   - Ação: `src/app/api/{recurso}/{acao}/route.ts` (POST para ações específicas)
4. **Implementar seguindo o padrão**:
   - Extrair auth do header `X-User-Data` (base64)
   - Filtrar SEMPRE por `tenantId`
   - Usar tipos Prisma (NUNCA `any`)
   - Validar enums de query params antes de cast
   - Try/catch com respostas de erro padronizadas (400, 401, 404, 500)
5. **Validar** — Garantir que não há erros de TypeScript

## Referência de endpoint existente

Consultar `src/app/api/pacientes/route.ts` ou `src/app/api/atividades/route.ts` como modelo.

## Checklist

- [ ] tenantId em todas as queries
- [ ] Tipos Prisma (sem `any`)
- [ ] Validação de enums
- [ ] Error handling padronizado
- [ ] Campos correspondem ao schema
