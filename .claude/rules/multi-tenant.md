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
Diagnostico, AnexoPaciente, e todos os models de sessão/avaliação.

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
