# Módulo 20 — Taxa de Agendamento por Profissional

> **Objetivo**: Dar ao gestor uma visão analítica da ocupação de cada profissional — quanto da sua grade de atendimento está efetivamente preenchida por agendamentos. É um "espelho" da agenda: mesmos dados (`agendamento`), outra leitura (tabelas, cards, gráficos, indicadores em tempo real).

## Contexto

A página `/agenda` mostra os agendamentos em formato calendário (diário/semanal). Falta uma visão **gerencial e quantitativa**: qual profissional está sobrecarregado, qual está ocioso, qual a taxa de ocupação por período. Para calcular "taxa de ocupação" precisamos de um **denominador** — as horas que o profissional tem disponíveis para atender. Hoje o model `profissional` não guarda horário de trabalho, então criamos o model **`GradeAtendimento`**.

```
taxa_ocupacao = minutos_agendados ÷ minutos_disponiveis_na_grade
```

## Decisões (confirmadas com o usuário)

- **Grade configurável por profissional** — novo model `GradeAtendimento` (dias da semana × faixas de horário), com tela de configuração. É a base do cálculo.
- **RBAC reusa o recurso `agenda`** (action `VIEW`, action-key `view_schedule`). Sem novo slug no seed.
- **Rota**: `/taxa-ocupacao` (top-level), item no sidebar logo abaixo de "Agenda".
- **Espelho da agenda**: mesma fonte de dados (`agendamento`), respeitando isolamento multi-tenant e filtro por filial.

## Premissas

- **Multi-tenant + multi-filial** — todas as queries filtram por `tenantId`; não-admin só vê sua filial (via `user.filialId`), admin pode escolher filial no filtro.
- **Status que contam como "ocupado"**: `AGENDADO`, `CONFIRMADO`, `EM_ATENDIMENTO`, `ATENDIDO`. `CANCELADO`/`FALTOU` não contam para horas agendadas (mas podem ser exibidos como métrica de absenteísmo).
- **Grade por dia da semana** — cada bloco é (`diaSemana`, `hora_inicio`, `hora_fim`). Um dia pode ter vários blocos (ex: manhã + tarde com intervalo de almoço).
- **Grade pode ter `filialId`** — profissional que atende em filiais diferentes em dias diferentes. `null` = vale para qualquer filial.
- **Performance** — período máximo de 60 dias por consulta. Cálculo feito server-side com agregação em memória.
- **Taxa > 100%** — possível (overbooking / agendamento fora da grade). Exibir com destaque (vermelho) em vez de truncar.

---

## Fase 0 — Setup e exploração

- [ ] Confirmar enum `StatusAgendamento` e campos de tempo (`data_hora`, `horario_fim`)
- [ ] Confirmar action-key `view_schedule` (`src/lib/auth/action-map.ts`) — OK
- [ ] Confirmar padrão de sub-rota de terapeutas (`/api/terapeutas/[id]/regras-repasse`) — OK

## Fase 1 — Backend: Schema `GradeAtendimento`

- [ ] Adicionar model em `prisma/schema.prisma`:
  ```prisma
  model GradeAtendimento {
    id             String   @id @default(uuid())
    tenantId       String
    profissionalId String
    diaSemana      Int      // 0=Dom, 1=Seg ... 6=Sáb
    hora_inicio    String   // "08:00"
    hora_fim       String   // "12:00"
    filialId       String?  // null = qualquer filial
    ativo          Boolean  @default(true)
    createdAt      DateTime @default(now())
    updatedAt      DateTime @default(now()) @updatedAt

    profissional   profissional @relation(fields: [profissionalId], references: [id], onDelete: Cascade)
    filial         Filial?      @relation(fields: [filialId], references: [id], onDelete: SetNull)

    @@index([tenantId])
    @@index([profissionalId])
    @@index([tenantId, profissionalId, diaSemana])
    @@map("grades_atendimento")
  }
  ```
- [ ] Adicionar relações inversas: `profissional.grades GradeAtendimento[]` e `Filial.grades GradeAtendimento[]`
- [ ] `npx prisma generate` + `npx prisma db push`
- [ ] Atualizar `.claude/rules/multi-tenant.md` (novo model tenant-specific) e `.claude/rules/typescript-prisma.md` se necessário

## Fase 2 — Backend: API da grade

- [ ] `src/app/api/terapeutas/[id]/grade/route.ts`
  - **GET** — retorna blocos da grade do profissional (`[{ id, diaSemana, hora_inicio, hora_fim, filialId, ativo }]`)
  - **PUT** — substitui a grade inteira (recebe array de blocos, faz `deleteMany` + `createMany` em transação). Mais simples que CRUD bloco-a-bloco.
  - RBAC: `hasPermission(user, 'view_schedule')` no GET, `edit_schedule` no PUT
  - Validar: `diaSemana` 0–6, `hora_fim > hora_inicio`, formato `HH:mm`, profissional pertence ao tenant

## Fase 3 — Backend: API de ocupação

- [ ] `src/app/api/relatorios/ocupacao-profissionais/route.ts` — GET com filtros:
  - `dataInicio` (obrigatório, ISO), `dataFim` (obrigatório, ISO, máx 60 dias)
  - `filialId?`, `profissionalId?` (foco em 1 profissional)
  - Lógica:
    1. Buscar profissionais ativos do tenant (filtrados por filial via `UsuarioRole`/`ProfissionalFilial` conforme regra atual)
    2. Buscar grades desses profissionais
    3. Buscar agendamentos no período com status ocupado
    4. Para cada profissional: somar `minutos_disponiveis` (grade aplicada a cada dia do período) e `minutos_agendados`; calcular `taxa`
  - Resposta: `{ success, periodo, profissionais: [{ id, nome, especialidade, minutos_disponiveis, minutos_agendados, total_agendamentos, taxa_ocupacao, faltas, atendendo_agora }], resumo: { taxa_media, total_agendamentos, horas_disponiveis, horas_agendadas } }`
  - RBAC: `hasPermission(user, 'view_schedule')`

## Fase 4 — Tipos compartilhados

- [ ] `src/types/ocupacao-profissional.ts` — interfaces de grade, linha de ocupação e resposta (ver bloco no fim)

## Fase 5 — Página base + sidebar

- [ ] `src/app/taxa-ocupacao/page.tsx`
  - `<ProtectedRoute requiredPermission={{ resource: 'agenda', action: 'VIEW' }}>`
  - `MainLayout` + breadcrumbs (`Dashboard › Taxa de Ocupação`)
  - Estrutura: filtros no topo → KPI cards → tabela → gráficos (uma página só, scrollável; ou tabs Tabela/Gráficos)
- [ ] Adicionar item no sidebar **abaixo de Agenda** em `src/lib/navigation.ts`:
  ```ts
  { title: "Taxa de Ocupação", href: "/taxa-ocupacao", icon: Gauge, requiredPermission: { resource: "agenda", action: "VIEW" } }
  ```
  e incluir o título no grupo "Clínica" de `PROFESSIONAL_GROUPS`.

## Fase 6 — Filtros + KPI cards

- [ ] `src/components/ocupacao-prof/filtros-ocupacao.tsx`
  - Seletor de período (7d / 30d / mês atual / custom), profissional (todos/1), filial (admin)
- [ ] `src/components/ocupacao-prof/kpi-cards.tsx`
  - Cards: **taxa média de ocupação**, **total de atendimentos**, **horas agendadas ÷ disponíveis**, **profissional com maior ocupação**

## Fase 7 — Tabela de ocupação (visão principal "espelho")

- [ ] `src/components/ocupacao-prof/tabela-ocupacao.tsx`
  - Linha por profissional: nome + especialidade, nº agendamentos, horas agendadas, horas disponíveis, **barra de taxa %** (verde/âmbar/vermelho), faltas, **indicador "atendendo agora"** (ponto verde pulsante)
  - Ordenável por taxa (maior ocupação no topo)
  - Linha clicável → expande/abre detalhe ou linka para `/agenda?profissional=ID`
  - Botão por linha **"Configurar grade"** → abre `grade-dialog`

## Fase 8 — Gráficos

- [ ] `src/components/ocupacao-prof/graficos-ocupacao.tsx` (recharts, já instalado)
  - Barras horizontais: taxa de ocupação por profissional (cor por faixa)
  - Linha: evolução da ocupação ao longo dos dias do período
  - (Opcional) barras por hora do dia: horários de pico agregados

## Fase 9 — Configuração da grade de atendimento

- [ ] `src/components/ocupacao-prof/grade-dialog.tsx`
  - Editor visual: 7 linhas (Dom–Sáb), cada uma com faixas de horário (adicionar/remover bloco)
  - Atalhos: "copiar Seg para todos os dias úteis", "limpar dia"
  - Seleção de filial por bloco (opcional, default "qualquer")
  - Salva via `PUT /api/terapeutas/[id]/grade` (substituição total)
  - Validação client (Zod) + server

## Fase 10 — Indicadores em tempo real

- [ ] `atendendo_agora` calculado server-side (agendamento com `data_hora <= now <= horario_fim` e status `EM_ATENDIMENTO`/`CONFIRMADO`)
- [ ] Client refaz fetch a cada 60s (polling leve) ou ao focar a aba; ponto verde pulsante na tabela/cards
- [ ] Card "X profissionais atendendo agora"

## Fase 11 — Integração com Mapa de Salas

- [ ] Link cruzado: na tabela, ação "ver no mapa de salas" → `/salas/mapa-ocupacao` (dia atual, filial do profissional)
- [ ] Reaproveitar paleta de cores de status (`src/types/ocupacao-sala.ts` → `STATUS_COR`) para consistência visual

## Fase 12 — Polimento, RBAC e validação

- [ ] Skeletons + empty states (profissional sem grade configurada → CTA "configurar grade")
- [ ] Acessibilidade (aria-labels nas barras de taxa, foco, contraste)
- [ ] `npx next build` sem erros TS/ESLint
- [ ] Atualizar tabela "Módulos do Sistema" no `CLAUDE.md` (Módulo 20)
- [ ] Atualizar `MEMORY.md` se virar referência recorrente

---

## Arquivos afetados

### Novos
- `src/app/api/terapeutas/[id]/grade/route.ts` (GET, PUT)
- `src/app/api/relatorios/ocupacao-profissionais/route.ts` (GET)
- `src/app/taxa-ocupacao/page.tsx`
- `src/components/ocupacao-prof/filtros-ocupacao.tsx`
- `src/components/ocupacao-prof/kpi-cards.tsx`
- `src/components/ocupacao-prof/tabela-ocupacao.tsx`
- `src/components/ocupacao-prof/graficos-ocupacao.tsx`
- `src/components/ocupacao-prof/grade-dialog.tsx`
- `src/types/ocupacao-profissional.ts`
- `src/lib/ocupacao.ts` (helpers de cálculo: minutos da grade num período, sobreposição, formatação de horas)

### Modificados
- `prisma/schema.prisma` — model `GradeAtendimento` + relações inversas
- `src/lib/navigation.ts` — item "Taxa de Ocupação" abaixo de Agenda
- `CLAUDE.md` — tabela de módulos (Módulo 20)
- `.claude/rules/multi-tenant.md` — novo model tenant-specific

### Não afetados
- `prisma/seed-rbac.ts` (reusa `agenda`)
- `src/lib/auth/action-map.ts` (reusa `view_schedule`/`edit_schedule`)
- `src/components/rbac/permission-matrix.tsx` (`agenda` já está)

---

## Tipos compartilhados (`src/types/ocupacao-profissional.ts`)

```typescript
export interface BlocoGrade {
  id?: string
  diaSemana: number       // 0=Dom ... 6=Sáb
  hora_inicio: string     // "08:00"
  hora_fim: string        // "12:00"
  filialId?: string | null
  ativo?: boolean
}

export interface OcupacaoProfissional {
  id: string
  nome: string
  especialidade: string | null
  minutos_disponiveis: number
  minutos_agendados: number
  total_agendamentos: number
  taxa_ocupacao: number     // 0..1+ (pode passar de 1)
  faltas: number
  atendendo_agora: boolean
}

export interface OcupacaoResumo {
  taxa_media: number
  total_agendamentos: number
  horas_disponiveis: number
  horas_agendadas: number
  atendendo_agora: number
}

export interface OcupacaoResponse {
  success: boolean
  periodo: { inicio: string; fim: string }
  profissionais: OcupacaoProfissional[]
  resumo: OcupacaoResumo
}
```

---

## Cálculo de minutos disponíveis (núcleo)

```
para cada dia D no período [inicio, fim]:
  dow = diaSemana(D)
  para cada bloco da grade do profissional com bloco.diaSemana == dow (e filial compatível):
    minutos_disponiveis += (bloco.hora_fim - bloco.hora_inicio) em minutos

minutos_agendados = Σ (horario_fim - data_hora) dos agendamentos OCUPADOS no período

taxa = minutos_disponiveis > 0 ? minutos_agendados / minutos_disponiveis : (agendados>0 ? Infinity→flag : 0)
```

---

## Checklist RBAC (skill `criar-feature`)

- [ ] **`resource`**: `agenda` (slug já existe no seed)
- [ ] **`action-key`**: `view_schedule` (GET) / `edit_schedule` (PUT grade) — já em `action-map.ts`
- [ ] **Permission matrix**: `agenda` já presente
- [ ] **Sidebar**: novo item "Taxa de Ocupação" com `requiredPermission: { resource: 'agenda', action: 'VIEW' }`
- [ ] **Bootstrap roles**: não muda

## Pendências para discussão

1. **Grade na página de detalhe do profissional** (`/terapeutas/[id]`) — espelhar o editor de grade lá também? (Sugestão: fase futura; por ora a config fica acessível pela tabela de ocupação.)
2. **Layout** — página única scrollável (filtros → cards → tabela → gráficos) vs tabs ("Visão Geral" / "Gráficos" / "Grades"). Sugestão: página única, com a tabela como protagonista (é o "espelho").
3. **Absenteísmo** — exibir faltas/cancelamentos como métrica separada? (Dados já disponíveis; baixo custo.)
4. **Profissional sem grade** — taxa indefinida; exibir badge "grade não configurada" + CTA, e excluir da taxa média.
```
