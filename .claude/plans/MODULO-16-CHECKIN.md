# Plano: Módulo 16 — Tela de Confirmação e Check-in

## Contexto

Tela operacional para recepção/secretaria gerenciar o fluxo de chegada dos pacientes no dia. Diferente de `/agenda` (planejamento), essa página é focada no "AGORA": quem chegou, quem está em atendimento, quem faltou. Fluxo típico:

```
AGENDADO → CONFIRMADO → (chegada) → EM_ATENDIMENTO → ATENDIDO
                     └→ FALTOU (no-show manual)
```

**Motivação**: Hoje o `agendamento` só tem status textual, sem marcos temporais (quando chegou, quando começou de fato, quando terminou). Isso impede controle de atrasos, cálculo de produtividade real e registro auditável do fluxo.

**Efeitos automáticos (cobrança, desconto de pacote) ficam fora do escopo desta fase** — serão adicionados em módulo futuro. Aqui apenas preparamos os timestamps e status.

---

## Fase 0: Schema

### Alterações no enum `StatusAgendamento`

```prisma
enum StatusAgendamento {
  AGENDADO
  CONFIRMADO
  EM_ATENDIMENTO    // ← novo: paciente em sessão
  ATENDIDO
  FALTOU
  CANCELADO
}
```

### Alterações no model `agendamento`

Adicionar campos operacionais (todos opcionais, preservam retrocompat):

```prisma
model agendamento {
  // ... campos existentes ...

  // Check-in / fluxo operacional
  confirmado_em     DateTime?
  confirmado_por    String?   // userId de quem confirmou
  hora_chegada      DateTime? // check-in na recepção
  checkin_por       String?   // userId de quem fez check-in
  hora_inicio_real  DateTime? // quando o atendimento começou de fato
  hora_fim_real     DateTime? // quando terminou de fato
  motivo_falta      String?   // justificativa de no-show (opcional)

  // ... relações existentes ...
}
```

### Arquivos
- `prisma/schema.prisma` (modificar)
- Rodar: `npx prisma db push` (dev)

### Checklist
- [ ] Enum `StatusAgendamento` com `EM_ATENDIMENTO`
- [ ] Campos de timestamp no `agendamento`
- [ ] `npx prisma generate` sem erros

---

## Fase 1: Types + API

### Types (`src/types/check-in.ts`)

```typescript
export const CHECK_IN_STATUS_LABELS: Record<StatusAgendamento, string> = {
  AGENDADO:       'Aguardando confirmação',
  CONFIRMADO:     'Confirmado',
  EM_ATENDIMENTO: 'Em atendimento',
  ATENDIDO:       'Finalizado',
  FALTOU:         'Falta',
  CANCELADO:      'Cancelado',
}

export const CHECK_IN_STATUS_COLORS: Record<StatusAgendamento, string> = {
  AGENDADO:       'bg-gray-100 text-gray-700',
  CONFIRMADO:     'bg-blue-100 text-blue-700',
  EM_ATENDIMENTO: 'bg-amber-100 text-amber-700',
  ATENDIDO:       'bg-green-100 text-green-700',
  FALTOU:         'bg-red-100 text-red-700',
  CANCELADO:      'bg-slate-100 text-slate-500',
}

export interface AgendamentoCheckIn { /* tipo completo com paciente, profissional, sala, procedimento */ }

// Calcula minutos de atraso entre data_hora e hora_chegada (ou agora se não chegou)
export function calcularAtrasoMinutos(agendamento: AgendamentoCheckIn): number
```

### API: Ações de check-in

Criar `src/app/api/agendamentos/[id]/check-in/route.ts` com uma única rota **PATCH** que aceita um `action` no body, mantendo o padrão REST enxuto:

```typescript
PATCH /api/agendamentos/[id]/check-in
body: { action: 'confirmar' | 'checkin' | 'iniciar' | 'finalizar' | 'no-show' | 'reabrir', motivo?: string }
```

Cada action:
- `confirmar`: status=CONFIRMADO, confirmado_em=now, confirmado_por=userId
- `checkin`: status=CONFIRMADO (se não estava), hora_chegada=now, checkin_por=userId
- `iniciar`: status=EM_ATENDIMENTO, hora_inicio_real=now
- `finalizar`: status=ATENDIDO, hora_fim_real=now
- `no-show`: status=FALTOU, motivo_falta=motivo
- `reabrir`: volta para CONFIRMADO (desfazer no-show/cancelamento por engano)

Todas gravam em um novo model `AgendamentoHistorico` (opcional — avaliar se vale o custo) OU apenas atualizam os campos (escolho a 2ª opção para manter escopo enxuto).

**Permissão (RBAC)**: todas as ações exigem `hasPermission(user, 'edit_schedule')` (mapeado para `agenda/UPDATE`). View da página exige `view_schedule` (`agenda/VIEW`). **Não criamos novo recurso** — reutilizamos `agenda`.

### API: Listagem para o dashboard

Reutilizamos `GET /api/agendamentos` existente adicionando query params:
- `data=YYYY-MM-DD` (default: hoje)
- `status=CONFIRMADO,AGENDADO` (multi, opcional)
- `profissionalId`, `salaId`, `pacienteId`, `procedimentoId` (filtros)
- Include já existente de paciente/profissional/sala/procedimento

Verificar a rota atual e adicionar se faltar algum filtro. **Não quebrar callers existentes** (`/agenda`).

### Arquivos
- `src/types/check-in.ts` (criar)
- `src/app/api/agendamentos/[id]/check-in/route.ts` (criar)
- `src/app/api/agendamentos/route.ts` (estender filtros se necessário)

### Checklist
- [ ] Types e helpers criados
- [ ] Endpoint PATCH de ações funcionando
- [ ] Validação de transições de status (ex.: não permitir `iniciar` sem `checkin`)
- [ ] Filtros de listagem funcionando
- [ ] Todas as ações protegidas por `edit_schedule`

---

## Fase 2: Página `/check-in`

### Estrutura (`src/app/check-in/page.tsx`)

```
ProtectedRoute requiredPermission={{ resource: 'agenda', action: 'VIEW' }}
MainLayout
  Header: "Check-in e Recepção" + data selecionada + refresh manual
  Stats cards (4): Total hoje, Aguardando, Em atendimento, Faltas
  Filtros avançados (collapsible):
    - Data (date picker, default hoje)
    - Profissional (select)
    - Sala (select)
    - Procedimento (select)
    - Status (multi-select)
    - Busca por paciente (texto)
  Tabs / Kanban por status:
    [Aguardando] [Confirmados] [Em Atendimento] [Finalizados] [Faltas]
    Cada coluna: cards com paciente, horário, profissional, sala, atraso
  Ações por card (contextuais ao status):
    - AGENDADO         → [Confirmar] [Cancelar]
    - CONFIRMADO       → [Check-in] [Cancelar] [No-show]
    - EM_ATENDIMENTO   → [Finalizar]
    - ATENDIDO/FALTOU  → [Reabrir] (desfazer)
```

### Indicador de atraso

Badge colorido no card:
- ≤ 0 min (adiantado/no horário): verde
- 1-14 min: amarelo "X min atrasado"
- ≥ 15 min sem check-in: vermelho "X min — candidato a no-show"

Pode calcular client-side a partir de `data_hora` vs `hora_chegada` ou `Date.now()`.

### Componentes

- `src/components/check-in/check-in-card.tsx` — Card de agendamento com ações contextuais
- `src/components/check-in/check-in-filters.tsx` — Painel de filtros avançados
- `src/components/check-in/check-in-stats.tsx` — 4 cards de contadores
- `src/components/check-in/no-show-dialog.tsx` — Dialog com campo de motivo opcional

### Auto-refresh (simples)

`useEffect` com `setInterval` de 60s para refazer fetch. Sem websockets por enquanto — escopo enxuto.

### Arquivos
- `src/app/check-in/page.tsx` (criar)
- `src/components/check-in/check-in-card.tsx` (criar)
- `src/components/check-in/check-in-filters.tsx` (criar)
- `src/components/check-in/check-in-stats.tsx` (criar)
- `src/components/check-in/no-show-dialog.tsx` (criar)

### Checklist
- [ ] Página renderizando com layout kanban
- [ ] Stats cards calculadas
- [ ] Filtros aplicados com query params na API
- [ ] Ações contextuais funcionando por status
- [ ] Indicador de atraso visível
- [ ] Auto-refresh de 60s
- [ ] Toast em cada ação executada
- [ ] Estado vazio em cada coluna

---

## Fase 3: RBAC + Navegação + Build

### RBAC

**Não criar novo recurso** — `check-in` reutiliza o recurso `agenda`:
- View da página → `agenda/VIEW`
- Ações (confirmar, check-in, etc.) → `agenda/UPDATE`

Isso significa que qualquer perfil RBAC com pelo menos VIEW em agenda verá o link; para usar as ações, precisa UPDATE.

### Sidebar

Adicionar item em `src/lib/navigation.ts`:
```ts
{ title: "Check-in", href: "/check-in", icon: ClipboardCheck, requiredPermission: { resource: "agenda", action: "VIEW" } }
```

Grupo "Clínica", posicionado entre "Agenda" e "Salas" (fluxo natural: planeja na Agenda → recebe no Check-in).

### Action-map

Nenhuma mudança — já existem `view_schedule` e `edit_schedule`.

### Arquivos
- `src/lib/navigation.ts` (modificar — adicionar item + grupo)

### Checklist
- [ ] Sidebar exibindo "Check-in" para usuários com agenda/VIEW
- [ ] Página bloqueada para quem não tem agenda/VIEW
- [ ] Ações negadas (403) para quem tem só VIEW (sem UPDATE)
- [ ] `npm run build` passa sem erros
- [ ] CLAUDE.md — adicionar linha do Módulo 16 na tabela

---

## Fase 4: Verificação E2E

Fluxo manual de teste:
1. Logar como ADMIN → sidebar mostra "Check-in"
2. Abrir `/check-in` → ver agendamentos do dia agrupados
3. Filtrar por profissional → lista reduz corretamente
4. Clicar "Confirmar" em AGENDADO → move para coluna "Confirmados"
5. Clicar "Check-in" → registra hora_chegada, move para Confirmados (com ícone de chegada)
6. Clicar "Iniciar" → status EM_ATENDIMENTO, hora_inicio_real gravada
7. Clicar "Finalizar" → status ATENDIDO, hora_fim_real gravada
8. Em outro agendamento, clicar "No-show" → dialog pede motivo → status FALTOU
9. Esperar 60s sem interagir → auto-refresh funciona
10. Logar como USER (só VIEW em agenda) → não vê botões de ação (ou vê mas recebe 403)

### Checklist de segurança
- [ ] Multi-tenant: todas queries via relação `paciente.tenantId = user.tenant.id`
- [ ] Validação de transição de status no servidor (não só client)
- [ ] Timestamps vêm do servidor (`new Date()` no handler), nunca do client
- [ ] Sem `console.log` em commit
- [ ] Sem `any`

---

## Arquivos de Referência

| Arquivo | Para que serve |
|---------|---------------|
| `prisma/schema.prisma` (linha 10-30) | Model `agendamento` atual |
| `src/app/api/agendamentos/route.ts` | Padrão de listagem + auth + tenant |
| `src/app/agenda/page.tsx` | Referência visual de como os agendamentos são renderizados hoje |
| `src/lib/auth/server.ts` | `getAuthenticatedUser`, `hasPermission` |
| `src/lib/auth/action-map.ts` | `view_schedule`, `edit_schedule` (já existentes) |
| `src/lib/navigation.ts` | Adicionar item de sidebar |

## Comando de verificação final

```bash
npm run build       # TS + ESLint
npm run dev         # Testar fluxo
npx prisma studio   # Inspecionar campos gravados em agendamentos
```
