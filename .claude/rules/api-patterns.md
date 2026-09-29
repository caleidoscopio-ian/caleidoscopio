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
    // Nunca console.error solto — ver "Tratamento de erro" abaixo
    const { ref, classificacao } = registrarErroApi(
      { rota: '/api/recurso', acao: 'GET' },
      error
    );
    return NextResponse.json(
      { error: classificacao.mensagem ?? 'Erro interno', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== 'conexao' ? 400 : 500 }
    );
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

## Tratamento de erro — `@/lib/erro-prisma`

`console.error` solto num catch produz duas falhas: o usuário vê "Erro interno do
servidor" sem saber o que houve, e o motivo real só existe no log da Vercel, sem
como casar com o relato dele. Todo catch de API route usa `registrarErroApi`.

```typescript
import { registrarErroApi } from '@/lib/erro-prisma';

} catch (error) {
  const { ref, classificacao } = registrarErroApi(
    { rota: '/api/pacientes', acao: 'POST', tenantId: user?.tenant?.id, usuarioId: user?.id },
    error
  );
  return NextResponse.json(
    { success: false, error: classificacao.mensagem ?? 'Erro interno do servidor',
      details: classificacao.detalhe, ref },
    { status: classificacao.mensagem && classificacao.categoria !== 'conexao' ? 400 : 500 }
  );
}
```

O que isso garante:

- **Mensagem útil na tela.** O erro do Prisma vira texto que a clínica entende
  ("Já existe um registro com este CPF", "O convênio informado não existe").
- **Referência curta.** A mesma `ref` vai para a resposta e para o log, então o
  usuário reporta "erro, ref a3f9c1" e a linha é achada com uma busca só.
- **Status coerente.** Erro de dado responde 400; erro de conexão continua 500,
  para não mascarar indisponibilidade no monitoramento.

Categorias de `classificarErro`: `constraint` (P2002), `vinculo` (P2003, P2025),
`validacao` (P2000, P2011, valor/enum/data inválidos), `conexao` (P2024, P1001,
P1002, P1008, P1017, falha de inicialização — inclui pool esgotado do Neon),
`concorrencia` (P2028, P2034) e `desconhecido`.

### Nunca logar dado de paciente

É um sistema clínico: nome, CPF, telefone, endereço e dados dos responsáveis
**não podem** ir para o log. Para diagnosticar, logar a forma do que chegou, não
o conteúdo:

```typescript
// ERRADO — despeja PII no log da Vercel
console.log('Body recebido:', body);

// CORRETO — o que serve para diagnóstico, sem identificar ninguém
console.log('campos recebidos:', {
  temCpf: Boolean(body?.cpf), responsaveis: body?.responsaveis?.length ?? 0,
});
```

O campo `referencias` de `registrarErroApi` aceita apenas ids e contagens, nunca
dado identificável.

## Client-side (src/lib/api.ts)

Usar as funções utilitárias que já injetam headers automaticamente:
```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
```
