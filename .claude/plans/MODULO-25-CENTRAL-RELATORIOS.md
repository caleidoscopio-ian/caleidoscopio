# Plano: Módulo 25 — Central de Relatórios

> **Status**: Planejado — não iniciado
> **Referência de UX**: central de relatórios do Feegow (filtros + agrupamentos + preferências + exportação)

## Contexto

A página `/relatorios` hoje é uma vitrine com 4 cards, dos quais só um aponta para algo real
(`/relatorios/profissionais`). Os outros três estão marcados como `disponivel: false`.

O objetivo é substituir isso por uma **central** no modelo do Feegow: uma casca única com barra de
filtros, agrupamento em até 3 níveis, preferências de colunas/gráfico e exportação — onde cada
relatório é uma *lente* declarada num catálogo, e não uma página escrita do zero.

## Decisões já tomadas

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | O que é "parceiro de negócio"? | **Convênio e/ou Particular**. Não há entidade nova a criar — a dimensão é `Convenio` com "Particular" como valor sintético para `convenioId = null`. |
| 2 | O que conta como "atendimento feito"? | **Somente `status = ATENDIDO`**. |
| 3 | Relatórios 3 e 4 (produtividade e salas) | **Ficam onde estão** (`/taxa-ocupacao` e `/salas/mapa-ocupacao`). Depois avaliamos reaproveitar as mesmas APIs dentro da central. |
| 4 | Carimbar filial e especialidade no agendamento | **Sim** — ver Fase 0, é pré-requisito. |

---

## Estado real dos dados (medido em 03/10/2026, clínica Espaço Singular)

Isto é o que mais afeta o cronograma. Os relatórios dependem de dados operacionais que hoje quase
não são preenchidos:

| Dado | Hoje | Consequência |
|---|---|---|
| Agendamentos | 945 | — |
| Com procedimento vinculado | 894 | base boa para valor |
| **Status `ATENDIDO`** | **12** | Relatórios 1 e 6 nascem quase vazios |
| **Status `FALTOU`** | **0** | Relatório 5 nasce **totalmente vazio** |
| Regras de repasse | 2 regras, **1 profissional de 20** | Relatório 2 cobriria 1 pessoa |
| Linhas de tabela de convênio | 11 (todas com procedimento) | base de preço existe, é pequena |
| Dimensões | 4 filiais · 34 salas · 5 convênios · 5 procedimentos | ok |

**Leitura**: o gargalo não é técnico, é de processo. O ciclo `check-in → atendido/faltou` não está
sendo fechado na operação. Construir os seis relatórios sem resolver isso entrega telas corretas e
vazias. A recomendação é construir assim mesmo (o dado histórico vai se acumular), mas **com a
expectativa alinhada** de que o número só aparece quando a recepção fechar o ciclo.

---

## Fase 0 — Carimbo histórico (pré-requisito, bloqueante)

### O problema

`filial` e `especialidade` **não estão gravadas no agendamento**. São derivadas do profissional no
momento da consulta:

- filial → `UsuarioRole.filialId` ou `ProfissionalFilial` (ver `src/lib/filial-profissionais.ts`)
- especialidade → `profissional.especialidade_clinica` (ou `especialidadeCustomizada`)

Se um terapeuta muda de filial ou de especialidade, **todo o histórico financeiro dele migra junto,
retroativamente**. Um fechamento de setembro feito hoje dá outro número em dezembro. Para relatório
gerencial — e principalmente para repasse — isso é inaceitável.

O mesmo vale para o **valor**: hoje o preço do convênio é lido de `ConvenioTabela` em tempo de
consulta. Se a tabela for renegociada, o faturamento do passado muda sozinho.

### A correção (aditiva, sem risco de perda)

Três colunas novas e nullable em `agendamento`:

```prisma
model agendamento {
  // ... campos existentes
  filialId              String?    // carimbo: filial do profissional no momento da criação
  especialidade_snapshot String?   // carimbo: especialidade do profissional na criação
  valor_cobrado         Decimal?   @db.Decimal(10, 2)  // carimbo: valor no momento do atendimento
}
```

**Quando carimbar:**

| Campo | Momento | Motivo |
|---|---|---|
| `filialId` | criação do agendamento | descreve *onde* foi marcado |
| `especialidade_snapshot` | criação do agendamento | descreve *o que* foi marcado |
| `valor_cobrado` | transição para `ATENDIDO` | é quando o atendimento vira receita |

`valor_particular` (já existente) continua sendo a entrada manual para pacientes particulares;
`valor_cobrado` é o valor **efetivado**, resolvido na hora do atendimento a partir da tabela do
convênio ou do valor particular.

**Backfill**: os 945 agendamentos existentes ficam com os três campos `null`. Os relatórios devem
cair na derivação atual quando o carimbo não existir — assim o histórico antigo continua aparecendo,
só sem a garantia de imutabilidade. Alternativa a decidir: rodar um backfill único com os valores
atuais, aceitando que eles refletem a configuração de hoje, não a da época.

---

## Arquitetura

### Estrutura de arquivos

```
src/app/relatorios/
   page.tsx                      ← índice (reescrito a partir do catálogo)
   [slug]/page.tsx               ← casca única: filtros + agrupamento + tabela/gráfico + export

src/lib/relatorios/
   definicoes.ts                 ← catálogo: cada relatório declara dimensões, métricas, filtros
   agregacao.ts                  ← motor de agrupamento em até 3 níveis
   formatacao.ts                 ← moeda, percentual, duração

src/app/api/relatorios/
   [slug]/route.ts               ← resolve pela definição do catálogo
```

### O catálogo

Cada relatório é uma declaração, não uma página:

```typescript
interface DefinicaoRelatorio {
  slug: string;
  titulo: string;
  descricao: string;
  recurso: string;                       // RBAC: slug do recurso em seed-rbac.ts
  dimensoes: Dimensao[];                 // o que dá para agrupar
  metricas: Metrica[];                   // o que dá para somar/contar
  filtros: FiltroDisponivel[];           // além dos comuns
  agrupamentoPadrao: string[];
}
```

Adicionar o 7º relatório passa a ser **uma entrada no catálogo**, não uma tela nova.

### Filtros comuns (barra compartilhada)

Período (obrigatório) · Filial · Profissional · Convênio/Particular · Especialidade · Procedimento ·
Status. Datas usando **`@/lib/datas-fuso`** (`parseInicioPeriodo` / `parseFimPeriodo`) — a regra de
fuso já registrada em `.claude/rules/api-patterns.md`.

### Agrupamento e preferências

Espelhando o Feegow: até **3 níveis** de agrupamento escolhidos pelo usuário, com subtotais por
nível e total geral. "Preferências" controla colunas visíveis, agrupamento e tipo de gráfico.
Persistência da preferência por usuário fica para uma fase posterior (começa em `localStorage`).

### Exportação

CSV e PDF por nível de agrupamento, como nos prints do Feegow (botão "Exportar" em cada grupo).

---

## Os seis relatórios

### 1. Atendimentos por especialidade e filial

- **Métricas**: quantidade de atendimentos, valor total, ticket médio
- **Dimensões**: filial, especialidade, profissional, convênio/particular, procedimento, mês
- **Filtro**: `status = ATENDIDO` fixo
- **Observação**: é a base do futuro pedido de venda. Valor vem de `valor_cobrado` (carimbo) com
  fallback para `ConvenioTabela` / `valor_particular`.

### 2. A pagar ao terapeuta (repasse) — **começar por este**

- **Métricas**: quantidade de procedimentos, valor bruto, **valor de repasse**, valor líquido da clínica
- **Dimensões**: profissional, procedimento, convênio/particular, paciente, mês
- **Detalhamento**: linha a linha — qual procedimento, para qual paciente, em que data, qual regra aplicada

**Regra de resolução do repasse** (a partir de `RegraRepasse`):

1. Filtrar por `profissionalId`, `ativo = true` e vigência cobrindo a data do atendimento
   (`vigencia_inicio <= data` e `vigencia_fim >= data` ou nulo)
2. Ordenar por `prioridade` desc; em empate, pela especificidade:
   `convênio + procedimento` > `convênio` > `procedimento` > geral
3. Aplicar conforme `TipoRepasse`:
   - `PERCENTUAL` → `valor_cobrado × (valor / 100)`
   - `VALOR_FIXO` → `valor` por atendimento
   - `VALOR_HORA` → `valor × (duracao_minutos / 60)`
4. Sem regra aplicável → linha aparece com repasse `null` e marcação visível de "sem regra"

A marcação do passo 4 é importante: é ela que expõe os 19 profissionais sem regra cadastrada.

### 3. Produtividade e ranking de terapeutas

Já existe em `/taxa-ocupacao`. **Não reconstruir agora** — a central apenas indexa. Reavaliar depois
se vale consumir a mesma API dentro da casca para ganhar filtros e exportação unificados.

### 4. Ocupação por sala

Já existe em `/salas/mapa-ocupacao`. Mesmo tratamento do item 3.

### 5. Faltas de pacientes (micro e macro)

- **Micro**: por paciente — total de agendamentos, faltas, % de falta
- **Macro**: consolidado da clínica, por filial, por profissional, por convênio
- **Bloqueado na prática**: 0 registros `FALTOU` hoje. Fazer por último.

### 6. Produção por parceiro de negócio

- **Dimensão principal**: convênio, com "Particular" como entrada sintética (`convenioId = null`)
- **Métricas**: quantidade, valor bruto, repasse, líquido
- Compartilha o motor de agregação com o relatório 1 — custo marginal baixo se feito na sequência

---

## Fases de implementação

| Fase | Entrega | Depende de |
|---|---|---|
| **0** | Carimbo de `filialId`, `especialidade_snapshot`, `valor_cobrado` + preenchimento na criação e no atendimento | — |
| **1** | Casca da central: catálogo, motor de agregação, barra de filtros, rota API genérica, índice reescrito | Fase 0 |
| **2** | Relatório 2 — repasse (inclui resolução de regra e detalhamento) | Fase 1 |
| **3** | Relatórios 1 e 6 (compartilham agregação) | Fase 1 |
| **4** | Exportação CSV/PDF por nível de agrupamento | Fase 1 |
| **5** | Preferências persistidas por usuário | Fase 4 |
| **6** | Relatório 5 — faltas | fluxo de falta em uso na operação |
| **7** | Avaliar trazer 3 e 4 para dentro da central | Fases 1 e 4 |

**Por que começar pelo repasse e não pelo item 1**: é o de maior valor financeiro imediato, a
estrutura de dados (`RegraRepasse`) já está pronta e completa, e ele força o cadastro das regras —
que é um gargalo real hoje. O relatório 1 depende de volume de `ATENDIDO`, que ainda não existe.

---

## RBAC

Recurso novo `relatorios` (ou reaproveitar o existente, a verificar em `prisma/seed-rbac.ts`).
Checklist obrigatório do skill `criar-feature`:

- [ ] `ProtectedRoute` com `resource` correto
- [ ] Recurso em `prisma/seed-rbac.ts` e em `src/lib/auth/bootstrap-roles.ts`
- [ ] API usando `hasPermission` com action-key de `src/lib/auth/action-map.ts`
- [ ] Recurso em `src/components/rbac/permission-matrix.tsx`
- [ ] Item no sidebar com `requiredPermission` em `src/lib/navigation.ts`

**Atenção multi-tenant**: todo relatório agrega dado sensível de várias tabelas. Cada query precisa
de `tenantId`, e as que passam por `agendamento` devem filtrar via `paciente: { tenantId }`, que é o
caminho usado no resto do sistema.

---

## Riscos e pontos em aberto

| Risco | Mitigação |
|---|---|
| Relatórios nascem vazios por falta de `ATENDIDO`/`FALTOU` | Alinhar expectativa; priorizar o repasse, que depende menos de volume |
| Backfill dos carimbos reflete a configuração de hoje, não a da época | Decidir: deixar `null` e derivar, ou carimbar aceitando a imprecisão |
| Agregação pesada com o crescimento da base | Começar com agregação em memória; migrar para SQL agregado se passar de ~10k linhas por consulta |
| Duplicação com `/taxa-ocupacao` e `/salas/mapa-ocupacao` | Decisão 3: ficam separados por ora |

### Decidido

1. **Backfill dos carimbos**: **não fazer**. Os 945 agendamentos existentes ficam com os carimbos
   `null` e os relatórios caem na derivação atual. A maior parte dessa base é dado de teste da fase
   de construção da ferramenta, então carimbar a configuração de hoje só criaria precisão falsa.
2. **`valor_cobrado` sem preço disponível**: **gravar `null`** e exibir "sem valor" no relatório.
   Não bloquear a marcação de atendido — travar o fluxo operacional por falta de cadastro de preço
   sairia mais caro que o buraco no relatório.

Consequência das duas: todo relatório precisa tratar `null` como estado normal, não como erro, e
distinguir visualmente "sem valor" de "valor zero".

---

## Atualização de arquitetura (ao implementar)

Conforme a "Regra de Manutenção da Arquitetura" do `CLAUDE.md`:

- Tabela "Módulos do Sistema" → adicionar linha 25 (`/relatorios`)
- `.claude/rules/typescript-prisma.md` → se surgir enum novo
- `.claude/rules/frontend.md` → se a casca virar componente padrão reutilizável
- Criar `.claude/plans/MODULO-25-PROGRESS.md` ao iniciar
