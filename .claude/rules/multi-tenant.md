---
paths:
  - "src/app/api/**/*.ts"
  - "src/lib/prisma*.ts"
  - "prisma/**"
---

# Multi-Tenant — Isolamento de Dados

## Regra Fundamental

TODA query a model tenant-specific DEVE incluir `tenantId` no filtro.

## Models que EXIGEM tenantId

Paciente, Profissional, Agendamento, Prontuario, Atividade, Curriculum, Avaliacao,
Anamnese, Sala, Procedimento, Trilha, RelatorioClinico, Encaminhamento, PrescricaoMedica,
Diagnostico, AnexoPaciente, GradeAtendimento, GradeSala, e todos os models de
sessão/avaliação.

## Models públicos (sem tenantId)

ConfiguracaoGlobal (tenant é gerenciado pelo Sistema 1)

## Padrão de Query

```typescript
// CORRETO
const pacientes = await prisma.paciente.findMany({
  where: { tenantId: user.tenantId, /* outros filtros */ }
});

// ERRADO — vazamento cross-tenant
const pacientes = await prisma.paciente.findMany({
  where: { /* sem tenantId */ }
});
```

## Extração do tenantId

Em API routes, extrair do header `X-User-Data` (base64 encoded):
```typescript
const userData = JSON.parse(
  Buffer.from(request.headers.get('X-User-Data') || '', 'base64').toString()
);
const tenantId = userData.tenantId;
```

## Validações

- API routes DEVEM validar que o tenantId do recurso corresponde ao do usuário
- Respostas NUNCA devem vazar dados de outros tenants
- Operações de DELETE/UPDATE devem confirmar ownership via tenantId

## Models sem `tenantId` próprio — escopo por relação

`agendamento`, `prontuario`, as sessões e toda a cadeia de evolução **não têm
`tenantId`**. O isolamento vem pela relação, e esquecer isso já causou vazamento
real em produção: `/api/dashboard/agenda-hoje` filtrava só por data e devolvia a
agenda de **todas as clínicas** para qualquer admin.

```typescript
// ERRADO — sem âncora de tenant
where: { data_hora: { gte: inicio, lte: fim } }

// CORRETO — agendamento se isola pelo paciente
where: { paciente: { tenantId }, data_hora: { gte: inicio, lte: fim } }
```

Atenção ao **spread condicional**: `...(isAdmin ? {} : { profissional: {...} })`
não isola nada, porque some num dos ramos. Foi exatamente assim que o vazamento
passou despercebido — havia um `usuarioId` no `where`, mas só para não-admin.

### Cadeia da evolução (3 saltos até o tenant)

```
InstrucaoFase → AtividadeCloneInstrucao → PacienteAtividadeClone
              → PacienteCurriculum → paciente.tenantId
```

Quando o id vem da URL ou do corpo da requisição, validar a posse **antes** de
consultar, usando `@/lib/escopo-tenant`:

```typescript
import { cloneEhDoTenant, instrucaoEhDoTenant } from '@/lib/escopo-tenant';

if (!(await cloneEhDoTenant(atividadeCloneId, tenantId))) {
  return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
}
```

Responder **404 e não 403**: um 403 confirmaria que o id existe em outra clínica.

## Guarda automática

`npm run verificar:tenant` varre as API routes e aponta queries sem escopo.
Classifica em **ALTO** (lista sem nenhuma âncora de tenant — o caso do vazamento)
e **MÉDIO** (acesso por id vindo da requisição, a revisar). `npm run
verificar:tenant:ci` sai com código 1 se houver ALTO.

Para liberar um caso já revisado, anotar na linha anterior à query:

```typescript
// tenant-ok: id já validado contra o tenant na linha 42
```

## Filial não é tenant

Confundir os dois é tentador e errado:

| | Tenant | Filial |
|---|---|---|
| O que é | A clínica | Uma unidade da clínica |
| Papel | **Isolamento** — dado de uma clínica nunca aparece para outra | **Autorização** — quem pode ver/operar em qual unidade |
| Se falhar | Vazamento entre clientes | Usuário vê unidade que não é dele |
| Onde entra | Sempre, em toda query | Onde o escopo do usuário importa |

`tenantId` é obrigatório e não negociável. O escopo de filial é uma camada
**acima** dele: dentro do tenant, restringe o que cada pessoa vê. Nunca usar
filial como substituto do `tenantId`.

Escopo de filial via `@/lib/filial-pessoa` — e cuidado com a diferença entre
`null` (sem restrição) e `[]` (nenhuma permitida), detalhada em
`.claude/rules/api-patterns.md`.

Ao validar filial vinda da requisição, conferir que ela pertence ao tenant antes
de usá-la. Um `filialId` de outra clínica num `where` não vaza dado (o `tenantId`
continua lá), mas num `create` cria vínculo cross-tenant — foi por isso que
`PATCH /api/usuario-roles` recusa a lista inteira se qualquer filial for de fora.
