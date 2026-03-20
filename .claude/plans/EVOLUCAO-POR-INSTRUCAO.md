# Plano: Evolução por Instrução (ao invés de por Atividade)

## Resumo da Mudança

**ANTES**: Evolução (fases) controlada no nível da **Atividade**.
**DEPOIS**: Evolução (fases) controlada no nível da **Instrução**. Atividade vira apenas um "container" com barra de progresso agregada.

### Exemplo Visual (Depois)
```
Atividade "Apontar para objetos" .............. [====>     ] 33%
  Instrução "cor azul"      → Linha de Base
  Instrução "cor amarela"   → Manutenção
  Instrução "cor vermelha"  → Intervenção
```

---

## Progresso da Implementação

| # | Fase | Descrição | Status |
|---|------|-----------|--------|
| 1 | Schema | Novos models + campos | ✅ Concluído |
| 2 | Migração | Dados existentes → novo formato | ✅ Concluído |
| 3 | Clonagem | clone-atividade.ts criar critérios por instrução | ✅ Concluído |
| 4 | API Critérios | GET/PUT /evolucao/criterios para instruções | ✅ Concluído |
| 5 | API Sessão | Seleção de instruções na criação | ✅ Concluído |
| 6 | Cálculo Evolução | evolucao-fase.ts por instrução | ✅ Concluído |
| 7 | UI Início Sessão | Tela seleção de instruções | ✅ Concluído |
| 8 | UI Aplicar Sessão | Navegação plana por instrução | ✅ Concluído |
| 9 | UI Evolução | Barra progresso + fase por instrução | ✅ Concluído |
| 10 | UI Modal Resultado | Resultado por instrução | ✅ Concluído |
| 11 | Pontuações por Instrução/Fase | InstrucaoPontuacao model + API + UI | ✅ Concluído |
| 12 | Ver/Editar por Instrução | Modal atividade (Geral/Instruções) + Modal instrução (Evolução/Pontuação) | 🔲 Pendente |

---

## Detalhes por Fase

### Fase 1 — Schema (Prisma) ✅
- `AtividadeCloneInstrucao` ganhou `faseAtual`, `ativo`
- Novo model `InstrucaoFase` (critérios por instrução por fase)
- Novo model `InstrucaoFaseHistorico` (histórico de mudanças)
- Novo model `SessaoCurriculumInstrucao` (instruções selecionadas por sessão)
- Novo model `InstrucaoPontuacao` (pontuações por instrução por fase)
- `PacienteAtividadeClone.faseAtual` mantido como legado/cache

### Fase 2 — Migração ✅
- Script `scripts/migrate-instrucao-fases.ts` — cria InstrucaoFase para instruções existentes
- Script `scripts/migrate-instrucao-pontuacoes.ts` — cria InstrucaoPontuacao para instruções existentes
- Herdam critérios da AtividadeFase pai e pontuações da AtividadeClonePontuacao pai

### Fase 3 — Clonagem ✅
- `src/lib/clone-atividade.ts` cria InstrucaoFase (4 por instrução) + InstrucaoPontuacao (4 fases × pontuações)
- Mantém AtividadeFase por retrocompatibilidade

### Fase 4 — API Critérios ✅
- `GET/PUT /api/evolucao/criterios` suporta `instrucaoId` (novo) e `atividadeCloneId` (legado)
- Novo `GET/PUT /api/evolucao/pontuacoes` — CRUD pontuações por instrução por fase

### Fase 5 — API Sessão ✅
- `POST /api/sessoes-curriculum` aceita `instrucoesSelecionadas[]`
- Cria `SessaoCurriculumInstrucao` para cada instrução selecionada
- `GET /api/sessoes-curriculum?id=X` retorna `instrucoesSelecionadas` e `instrucoes.pontuacoes`
- `GET /api/sessoes-curriculum/instrucoes-disponiveis` — endpoint para o dialog de seleção

### Fase 6 — Cálculo Evolução ✅
- `src/lib/evolucao-fase.ts` calcula por instrução individual
- Cria `InstrucaoFaseHistorico` para cada mudança
- Calcula `progressoAtividade` (% instruções em GENERALIZAÇÃO)

### Fase 7 — UI Início Sessão ✅
- Dialog de seleção de instruções com checkboxes
- Cada instrução mostra FaseBadge
- Toggle por atividade (selecionar/deselecionar todas)

### Fase 8 — UI Aplicar Sessão ✅
- **Navegação plana**: lista de itens `{clone, instrução}` com índice único
- **Card de navegação**: mostra "Atividade - Instrução" por item com FaseBadge
- **Pontuações**: carregadas da instrução filtradas pela fase atual (InstrucaoPontuacao)
- "+" sempre posicionado por último automaticamente
- Progresso calculado com base nos itens selecionados

### Fase 9 — UI Evolução ✅
- Cards mostram barra de progresso (% em GENERALIZAÇÃO)
- Lista de instruções com fases individuais
- Critérios configuráveis por instrução
- Pontuações por instrução por fase com seletor de fase

### Fase 10 — Modal Resultado ✅
- Agrupado por atividade, expandido por instrução
- Cada instrução mostra: fase anterior → nova, % acerto, critério
- Contagem: avançaram / regrediram / mantiveram

### Fase 11 — Pontuações por Instrução/Fase ✅
- Model `InstrucaoPontuacao` (instrucaoId + fase + ordem + sigla + grau)
- API `GET/PUT /api/evolucao/pontuacoes`
- UI com seletor de fase no tab Pontuação
- Clone cria pontuações por instrução × fase automaticamente
- Adição de nova instrução herda pontuações da atividade pai

### Fase 12 — Ver/Editar por Instrução 🔲
- Atividade: modal com abas Geral e Instruções
- Instrução: modal com abas Evolução e Pontuação
- Cada instrução tem botão Ver/Editar independente

---

## Arquivos Modificados

| Arquivo | Tipo de Mudança |
|---------|----------------|
| `prisma/schema.prisma` | Novos models (InstrucaoFase, InstrucaoFaseHistorico, SessaoCurriculumInstrucao, InstrucaoPontuacao) |
| `src/lib/clone-atividade.ts` | Criar InstrucaoFase + InstrucaoPontuacao ao clonar |
| `src/lib/evolucao-fase.ts` | Cálculo por instrução |
| `src/app/api/sessoes-curriculum/route.ts` | Receber instrucões selecionadas + retornar pontuações |
| `src/app/api/sessoes-curriculum/finalizar/route.ts` | Validar por instruções selecionadas |
| `src/app/api/sessoes-curriculum/instrucoes-disponiveis/route.ts` | NOVO — endpoint seleção |
| `src/app/api/evolucao/criterios/route.ts` | Critérios por instrução |
| `src/app/api/evolucao/pontuacoes/route.ts` | NOVO — pontuações por instrução/fase |
| `src/app/api/evolucao/route.ts` | Retornar fases + pontuações por instrução |
| `src/app/api/evolucao/clone/route.ts` | Criar pontuações ao adicionar instrução |
| `src/app/aplicar-curriculum/[sessaoId]/page.tsx` | Navegação plana por instrução |
| `src/app/evolucao/page.tsx` | Barra progresso + instruções + critérios/pontuações por fase |
| `src/app/iniciar-sessao/page.tsx` | Dialog seleção de instruções |
| `scripts/migrate-instrucao-fases.ts` | NOVO — migração |
| `scripts/migrate-instrucao-pontuacoes.ts` | NOVO — migração |
