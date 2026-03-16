---
paths:
  - "src/app/api/**/*.ts"
---

# API Routes — Padrões

## Estrutura de um Endpoint

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 1. Extrair e validar auth
    const userData = JSON.parse(
      Buffer.from(request.headers.get('X-User-Data') || '', 'base64').toString()
    );
    const tenantId = userData.tenantId;

    // 2. Extrair query params e validar
    const { searchParams } = new URL(request.url);

    // 3. Montar query com tenantId
    const where: Prisma.ModelWhereInput = { tenantId };

    // 4. Executar query
    const data = await prisma.model.findMany({ where });

    // 5. Retornar resposta
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

## Convenções

- RESTful: GET (listar/detalhar), POST (criar), PUT (atualizar), DELETE (remover)
- Rota de coleção: `src/app/api/recurso/route.ts` (GET, POST)
- Rota de item: `src/app/api/recurso/[id]/route.ts` (GET, PUT, DELETE)
- Ações especiais: `src/app/api/recurso/acao/route.ts` (ex: `atribuir`, `finalizar`)

## Headers Obrigatórios

- `X-User-Data`: Dados do usuário (base64)
- `X-Auth-Token`: Token SSO

## Respostas de Erro

```typescript
// 400 - Dados inválidos
return NextResponse.json({ error: 'Campo obrigatório' }, { status: 400 });

// 401 - Não autenticado (auto-logout no client)
return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

// 404 - Não encontrado
return NextResponse.json({ error: 'Recurso não encontrado' }, { status: 404 });

// 500 - Erro interno
return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
```

## Client-side (src/lib/api.ts)

Usar as funções utilitárias que já injetam headers automaticamente:
```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
```
