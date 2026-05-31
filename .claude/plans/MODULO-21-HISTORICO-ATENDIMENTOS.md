# Módulo 21 — Histórico de Atendimentos

> **Objetivo**: Um "livro-razão" operacional/financeiro de todos os atendimentos que saíram da agenda (realizados, faltas e cancelamentos), com data, paciente, profissional, procedimento, valor (regra de convênio) e convênio. Visualização em tabela com filtros, KPIs e exportação CSV/PDF.

## Contexto

Hoje os dados de atendimento estão dispersos na agenda (visão calendário) e na taxa de ocupação (visão gerencial). Falta uma **lista tabular consolidada** — pensada para recepção/faturamento/contabilidade — que mostre cada atendimento como uma linha, com o valor efetivo do procedimento e o convênio aplicado. É puramente leitura sobre `agendamento` (sem schema novo).

> **Não confundir com `/historico-sessoes`** (Módulo existente): aquele lista **sessões clínicas** (atividades, currículo, avaliações aplicadas) — foco pedagógico/clínico. Este aqui lista **agendamentos** — foco operacional/financeiro.

## Decisões (confirmadas com o usuário)

- **Escopo de status**: realizados + faltas/cancelamentos → default exibe `ATENDIDO`, `FALTOU`, `CANCELADO`. Ignora `AGENDADO`/`CONFIRMADO`/`EM_ATENDIMENTO` (ainda em aberto). Filtro de status permite ajustar.
- **RBAC**: reusa recurso `relatorios` (action `VIEW`, action-key `view_reports`). Sem novo slug.
- **Exportação**: CSV (nativo) + PDF (`jspdf` + `jspdf-autotable`).

## Premissas

- **Sem schema novo** — leitura de `agendamento`, `paciente`, `profissional`, `Procedimento`, `Convenio`, `ConvenioTabela`, `Sala`, `Filial`.
- **Multi-tenant + multi-filial** — query filtra por `tenantId` (via paciente/profissional); não-admin só vê sua filial.
- **Valor** — reaproveita `calcularPrecoProcedimento` (regra convênio → particular → padrão) e `formatBRL` de `src/lib/preco-procedimento.ts`. Batch query em `ConvenioTabela` (mesmo padrão de `/api/agendamentos`).
- **Paginação server-side** — pode haver milhares de registros. `page` + `pageSize` (default 50). KPIs calculados sobre o conjunto **filtrado inteiro**, não só a página atual.
- **Performance** — período máximo de 12 meses por consulta.

---

## Campos exibidos (o "PENSE")

**Colunas principais da tabela:**
| Campo | Origem |
|-------|--------|
| Data | `agendamento.data_hora` |
| Horário (início–fim) | `data_hora` / `horario_fim` |
| Duração | calculado |
| Paciente | `paciente.nome` |
| Profissional | `profissional.nome` + especialidade |
| Procedimento | `procedimento.nome` (+ código) |
| Valor | `calcularPrecoProcedimento` (convênio do paciente) |
| Convênio | `paciente.convenio.nome_fantasia` ou "Particular" |
| Status | `agendamento.status` (badge colorido) |

**Detalhe expandível / colunas opcionais (auditoria e faturamento):**
- Sala (`salaRelacao.nome`)
- Filial (`salaRelacao.filial.nome`)
- Tempos reais do check-in: `hora_chegada`, `hora_inicio_real`, `hora_fim_real`
- Tempo de espera (chegada → início real) e duração real (início → fim real)
- Motivo da falta (`motivo_falta`) / observações

---

## Fase 0 — Setup

- [ ] Instalar libs de PDF: `npm i jspdf jspdf-autotable`
- [ ] Confirmar action-key `view_reports` (`action-map.ts`) — OK
- [ ] Confirmar campos de check-in no `agendamento` (`hora_chegada`, `hora_inicio_real`, `hora_fim_real`, `motivo_falta`) — OK

## Fase 1 — Tipos compartilhados

- [ ] `src/types/historico-atendimento.ts`:
  - `AtendimentoHistorico` (linha da tabela)
  - `HistoricoResumo` (KPIs)
  - `HistoricoResponse` (`{ success, data, total, page, pageSize, resumo, periodo }`)
  - `HistoricoFiltros`

## Fase 2 — Backend: API

- [ ] `src/app/api/relatorios/historico-atendimentos/route.ts` — GET com filtros:
  - `dataInicio`, `dataFim` (obrigatórios, máx 12 meses)
  - `status?` (csv de status; default `ATENDIDO,FALTOU,CANCELADO`)
  - `profissionalId?`, `pacienteId?`, `convenioId?`, `procedimentoId?`, `filialId?`
  - `busca?` (nome do paciente)
  - `page?` (default 1), `pageSize?` (default 50, máx 200)
  - `incluirResumo?` (default true)
  - Lógica:
    1. Montar `where` com tenantId + filtros + range de data
    2. `count` total (para paginação)
    3. `findMany` paginado com includes (paciente+convenio, profissional, procedimento, salaRelacao+filial)
    4. Batch query `ConvenioTabela` para os pares (convenioId, procedimentoId) presentes → calcular valor de cada linha
    5. Resumo agregado: total atendimentos, valor total (só ATENDIDO), ticket médio, faltas, cancelamentos
  - RBAC: `hasPermission(user, 'view_reports')`
  - Isolamento multi-tenant + filtro filial (não-admin → sua filial)

## Fase 3 — Helpers de exportação

- [ ] `src/lib/export-historico.ts`:
  - `exportarCSV(linhas)` — gera CSV (com BOM p/ Excel pt-BR), download via Blob
  - `exportarPDF(linhas, periodo, resumo)` — `jspdf` + `autotable`, cabeçalho com período e totais

## Fase 4 — Componentes

- [ ] `src/components/historico-atend/resumo-historico.tsx` — KPI cards (total, valor faturado, ticket médio, absenteísmo)
- [ ] `src/components/historico-atend/filtros-historico.tsx` — período, status (multi), profissional, convênio, procedimento, filial, busca por paciente
- [ ] `src/components/historico-atend/tabela-historico.tsx` — tabela paginada, ordenável, badge de status, valor formatado, badge de convênio, linha expansível com tempos reais

## Fase 5 — Página + sidebar

- [ ] `src/app/historico-atendimentos/page.tsx`
  - `<ProtectedRoute requiredPermission={{ resource: 'relatorios', action: 'VIEW' }}>`
  - `MainLayout` + breadcrumbs (`Dashboard › Histórico de Atendimentos`)
  - Layout: filtros → KPI cards → barra de ações (Exportar CSV / PDF) → tabela paginada
- [ ] Sidebar (`src/lib/navigation.ts`): item "Histórico de Atendimentos" no grupo **Administração** (próximo de "Relatórios"), ícone `ReceiptText` ou `ClipboardList`, `requiredPermission: { resource: 'relatorios', action: 'VIEW' }`

## Fase 6 — Validação

- [ ] `npx next build` sem erros TS/ESLint
- [ ] Verificar isolamento multi-tenant e filtro de filial
- [ ] Empty state (nenhum atendimento no período) + skeletons
- [ ] Acessibilidade (aria nos botões de export, foco, contraste dos badges)
- [ ] Atualizar tabela "Módulos do Sistema" no `CLAUDE.md` (Módulo 21)

---

## Arquivos afetados

### Novos
- `src/app/api/relatorios/historico-atendimentos/route.ts`
- `src/app/historico-atendimentos/page.tsx`
- `src/components/historico-atend/resumo-historico.tsx`
- `src/components/historico-atend/filtros-historico.tsx`
- `src/components/historico-atend/tabela-historico.tsx`
- `src/lib/export-historico.ts`
- `src/types/historico-atendimento.ts`

### Modificados
- `src/lib/navigation.ts` — item no sidebar (grupo Administração)
- `CLAUDE.md` — tabela de módulos (Módulo 21)
- `package.json` — `jspdf`, `jspdf-autotable`

### Reaproveitados (sem mudança)
- `src/lib/preco-procedimento.ts` — `calcularPrecoProcedimento`, `formatBRL`
- `src/types/agendamento.ts` — `StatusAgendamento`, `STATUS_AGENDAMENTO_LABELS`, `STATUS_AGENDAMENTO_BADGE`

---

## Tipos (`src/types/historico-atendimento.ts`)

```typescript
import { StatusAgendamento } from "./agendamento"

export interface AtendimentoHistorico {
  id: string
  data_hora: string
  horario_fim: string
  duracao_minutos: number
  status: StatusAgendamento
  paciente: { id: string; nome: string }
  profissional: { id: string; nome: string; especialidade: string | null }
  procedimento: { id: string; nome: string; codigo: string | null } | null
  convenio: { id: string; nome: string } | null
  valor: number | null
  origem_valor: "convenio" | "particular" | "padrao" | null
  sala: string | null
  filial: string | null
  hora_chegada: string | null
  hora_inicio_real: string | null
  hora_fim_real: string | null
  motivo_falta: string | null
  observacoes: string | null
}

export interface HistoricoResumo {
  total_atendimentos: number   // realizados (ATENDIDO)
  valor_total: number          // soma dos ATENDIDO
  ticket_medio: number
  faltas: number
  cancelamentos: number
  total_registros: number      // todos os status exibidos
}

export interface HistoricoResponse {
  success: boolean
  data: AtendimentoHistorico[]
  total: number
  page: number
  pageSize: number
  resumo: HistoricoResumo
  periodo: { inicio: string; fim: string }
}
```

---

## KPIs (resumo)

- **Total de atendimentos realizados** (status `ATENDIDO`)
- **Valor total faturado** (Σ valor dos `ATENDIDO`)
- **Ticket médio** (valor total ÷ atendimentos realizados)
- **Absenteísmo** (faltas + cancelamentos, e % sobre o total)

---

## Checklist RBAC (skill `criar-feature`)

- [ ] **`resource`**: `relatorios` (slug já existe no seed)
- [ ] **`action-key`**: `view_reports` (já em `action-map.ts`)
- [ ] **Permission matrix**: `relatorios` já presente
- [ ] **Sidebar**: item novo com `requiredPermission: { resource: 'relatorios', action: 'VIEW' }`
- [ ] **Bootstrap roles**: não muda

## Pendências para discussão

1. **Colocação no sidebar** — grupo "Administração" (perto de Relatórios) por usar RBAC `relatorios`; alternativa seria "Clínica" (perto de Agenda). Sugestão: Administração.
2. **Valor de faltas/cancelamentos** — exibir valor "perdido" com faltas? (Sugestão: mostrar valor só em `ATENDIDO` no faturamento; faltas entram só na contagem de absenteísmo.)
3. **PDF** — usar `jspdf-autotable` (arquivo real para download). Confirmar se aceita instalar as 2 libs.
```
