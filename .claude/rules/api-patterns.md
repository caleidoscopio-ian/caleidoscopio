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

## Datas e horários — NUNCA montar hora no servidor

Produção roda em **UTC** (Vercel); o dev local roda no fuso da máquina. Por isso
`setHours()` em API route produz resultados diferentes em dev e em produção —
bug que já deslocou agendamentos recorrentes em -3h.

```typescript
// ERRADO — o horário passa a depender do fuso do servidor
const dataHora = new Date(dataStr);
dataHora.setHours(hora, minuto, 0, 0);

// CORRETO — o cliente manda o instante completo; o servidor só usa
const dataHora = new Date(dataStr); // ISO com offset, montado no navegador
const dataFim = new Date(dataHora.getTime() + duracaoMinutos * 60000);
```

Regra: **quem monta data + horário é o cliente** (fuso do usuário). A API recebe
ISO completo e deriva apenas grandezas independentes de fuso (duração, diferença).

Para limites de dia/mês calculados no servidor ("hoje", "início do mês", parâmetro
`YYYY-MM-DD`), usar **`@/lib/datas-fuso`** — nunca `setHours`, `startOfDay`/
`endOfDay` do date-fns ou `new Date(ano, mes, dia)`, que dependem do fuso do processo:

```typescript
import { inicioDoDia, fimDoDia, inicioDoMes, parseInicioPeriodo, parseFimPeriodo } from '@/lib/datas-fuso';

const hoje = { gte: inicioDoDia(), lte: fimDoDia() };          // dia no fuso da clínica
const inicio = parseInicioPeriodo(param);  // "2026-09-28" → 00:00 BRT; ISO completo → intacto
const fim = parseFimPeriodo(param);        // "2026-09-28" → 23:59:59.999 BRT
```

Atenção: `new Date("2026-09-28")` é interpretado como **meia-noite UTC**, então usar
esse valor como `lte` corta o dia inteiro do filtro.

## Permissão x vínculo — eixos independentes

Todo usuário do sistema vira um registro em `profissional`, inclusive recepção e
financeiro. Dois eixos diferentes governam o que acontece com ele:

| Eixo | Onde mora | Responde |
|------|-----------|----------|
| **Permissão** | RBAC (`UsuarioRole` → `Role`), via `hasPermission` | O que a pessoa pode fazer |
| **Vínculo** | `profissional.tipo_vinculo` | Se a pessoa tem agenda própria |

Uma recepcionista tem `view_schedule` e marca agendamentos, mas **não** é atendente:
não entra na grade de horários, na taxa de ocupação nem no dropdown de profissional
de um agendamento. Nunca derivar uma coisa da outra.

`GET /api/terapeutas?atende=true` retorna só quem tem agenda própria
(`tipo_vinculo = PROFISSIONAL_CLINICO`). **`tipo_vinculo` em branco conta como NÃO
atende** — quem foi criado e ainda não foi classificado fica de fora até alguém
preencher a ficha em `/terapeutas`.

Usar `atende=true` em telas de atendimento (agenda, check-in, taxa de ocupação,
prontuário, terapeuta responsável do paciente). O default da rota continua trazendo
todos, para as telas administrativas (cadastro de profissionais, relatórios).

## Client-side (src/lib/api.ts)

Usar as funções utilitárias que já injetam headers automaticamente:
```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
```
