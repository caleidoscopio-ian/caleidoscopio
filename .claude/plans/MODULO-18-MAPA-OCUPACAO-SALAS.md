# Módulo 18 — Mapa de Ocupação de Salas

> **Objetivo**: Dar ao gestor visibilidade da utilização das salas (diária, semanal, dashboard, mapa de filiais) reaproveitando os dados já existentes de agendamentos.

## Contexto

Hoje a página `/salas` é apenas CRUD. A informação de ocupação está dispersa na agenda. O Mapa de Ocupação consolida: cada agendamento (`agendamento.salaId`) já indica a sala em uso em um intervalo de tempo (`data_hora` + `horario_fim`). Não há mudanças de schema — é puramente leitura + visualização.

## Premissas

- **Sem schema novo** — todas as queries usam `agendamento`, `Sala`, `Filial`, `paciente`, `profissional`, `Procedimento`.
- **Multi-tenant + multi-filial** — todas as queries filtram por `tenantId`; quando há `filialAtiva` (ou usuário não-admin), filtra também por `filialId` da sala.
- **RBAC** — reaproveita o recurso `salas` (action `VIEW`). Não precisa de novo slug.
- **Status considerados como "ocupando" a sala**: `AGENDADO`, `CONFIRMADO`, `EM_ATENDIMENTO`, `REALIZADO`. Status `CANCELADO`/`FALTA` são exibidos só na visão histórica.
- **Performance** — a API agrupa por intervalo solicitado; o cliente nunca pede mais de 4 semanas de dados.

---

## Fase 0 — Setup e exploração

- [ ] Mapear arquivos envolvidos (já feito — ver "Arquivos afetados" abaixo)
- [ ] Confirmar enums de `StatusAgendamento` (`prisma/schema.prisma`)
- [ ] Confirmar campos de hora real (`hora_chegada`, `hora_inicio_real`, `hora_fim_real`) para uso na visão histórica

## Fase 1 — Backend: API de ocupação

- [ ] Criar `src/app/api/salas/ocupacao/route.ts` — GET com filtros:
  - `dataInicio` (obrigatório, ISO)
  - `dataFim` (obrigatório, ISO)
  - `filialId?` (string)
  - `salaId?` (string, opcional para focar em 1 sala)
  - `incluirCancelados?` (default `false`)
- [x] Resposta: `{ salas: [{ id, nome, cor, filial, capacidade, agendamentos: [{ id, data_hora, horario_fim, status, paciente:{id,nome}, profissional:{id,nome,especialidade}, procedimento:{id,nome,cor} }] }] }`
- [x] RBAC: `hasPermission(user, 'view_rooms')` (action-key existente)
- [x] Aplicar isolamento multi-tenant + filtro filial (usuário não-admin só vê sua filial)

## Fase 2 — Botão de entrada + página base

- [x] Adicionar botão "Mapa de Ocupação" em `src/app/salas/page.tsx` ao lado de "Nova Sala" (ícone `LayoutGrid`)
- [x] Criar `src/app/salas/mapa-ocupacao/page.tsx` com:
  - `<ProtectedRoute requiredPermission={{ resource: 'salas', action: 'VIEW' }}>`
  - `MainLayout` com breadcrumbs (`Dashboard › Salas › Mapa de Ocupação`)
  - Tabs: **Diário** · **Semanal** · **Dashboard** · **Mapa de Unidades**
  - Filtro de filial global (já vem do `FilialProvider`)

## Fase 3 — Visão Diária (timeline grid)

- [x] Componente `src/components/salas/mapa-diario.tsx`
  - Date picker para escolher o dia
  - Grid: eixo X = salas (cards no topo com nome/cor), eixo Y = horários (08:00 → 20:00, faixa configurável)
  - Cada agendamento renderiza como bloco colorido posicionado no slot correto, com tooltip (paciente, profissional, procedimento, horário)
  - Click no bloco → abre detalhes (link para agenda do dia já filtrado)
  - Indicador de "agora" (linha horizontal vermelha na hora atual)

## Fase 4 — Visão Semanal (Kanban por dia)

- [x] Componente `src/components/salas/mapa-semanal.tsx`
  - Date picker / seletor de semana (Dom → Sáb)
  - Colunas = dias da semana
  - Em cada coluna, grupos por sala (cards empilhados verticalmente)
  - Cada card mostra horário + paciente abreviado
  - Hover destaca todos os agendamentos da mesma sala na semana

## Fase 5 — Dashboard de ocupação

- [x] Componente `src/components/salas/dashboard-ocupacao.tsx`
- [x] Seletor de período (últimos 7d / 30d / mês atual)
- [x] Cards de KPI: taxa de ocupação, sala mais usada, horário de pico, total atendimentos
- [x] Gráficos recharts: barras por sala, linha por dia, barras por hora do dia (pico destacado em âmbar)

## Fase 6 — Mapa de Unidades (filiais)

- [x] Componente `src/components/salas/mapa-filiais.tsx`
- [x] Admin vê todos os cards de filiais; não-admin vê card único com suas salas
- [x] Cards com: nome+cor, total salas, % ocupação atual, barra de progresso colorida (verde/amarelo/vermelho)
- [x] Click no card filtra as demais tabs pela filial selecionada

## Fase 7 — Polimento, RBAC e validação

- [ ] Skeletons em todas as visões durante loading
- [ ] Empty states (sem agendamentos no período)
- [ ] Verificar acessibilidade básica (focus, contraste, aria-labels nos blocos da timeline)
- [ ] Confirmar que sidebar/navigation não precisa de novo item (entrada via página `/salas`)
- [ ] `npx next build` deve passar sem erros TS/ESLint

---

## Arquivos afetados

### Novos
- `src/app/api/salas/ocupacao/route.ts`
- `src/app/salas/mapa-ocupacao/page.tsx`
- `src/components/salas/mapa-diario.tsx`
- `src/components/salas/mapa-semanal.tsx`
- `src/components/salas/dashboard-ocupacao.tsx`
- `src/components/salas/mapa-filiais.tsx`
- `src/types/ocupacao-sala.ts` (tipos compartilhados)

### Modificados
- `src/app/salas/page.tsx` — botão "Mapa de Ocupação" ao lado de "Nova Sala"

### Não afetados (somente leitura)
- `prisma/schema.prisma`
- `src/lib/auth/action-map.ts`
- `prisma/seed-rbac.ts`

---

## Tipos compartilhados (`src/types/ocupacao-sala.ts`)

```typescript
export interface AgendamentoOcupacao {
  id: string
  data_hora: string
  horario_fim: string
  status: StatusAgendamento
  paciente: { id: string; nome: string } | null
  profissional: { id: string; nome: string; especialidade: string | null } | null
  procedimento: { id: string; nome: string; cor: string | null } | null
}

export interface SalaOcupacao {
  id: string
  nome: string
  cor: string | null
  capacidade: number | null
  filial: { id: string; nome: string; cor: string | null } | null
  agendamentos: AgendamentoOcupacao[]
}

export interface OcupacaoResponse {
  success: boolean
  data: SalaOcupacao[]
  total_salas: number
  total_agendamentos: number
  periodo: { inicio: string; fim: string }
}
```

---

## Checklist RBAC (skill `criar-feature`)

- [x] **`resource`**: `salas` (slug já existe em `prisma/seed-rbac.ts`)
- [x] **`action-key`**: `view_salas` (já existe em `action-map.ts`)
- [x] **Permission matrix**: `salas` já está em `permission-matrix.tsx`
- [x] **Sidebar**: não muda (entrada via `/salas`, mesma proteção)
- [x] **Bootstrap roles**: não muda

## Pendências para discussão

1. **Horário útil exibido na timeline diária** — usar 08:00–20:00 fixo ou tornar configurável por filial? (Sugestão: 07:00–21:00 fixo, com scroll se necessário)
2. **Gráficos** — confirmar se `recharts` está instalado; caso contrário decidir entre instalar ou usar SVG nativo
3. **Taxa de ocupação "atual"** — definir como "salas com agendamento ativo agora ÷ total de salas" para o card do mapa de filiais
