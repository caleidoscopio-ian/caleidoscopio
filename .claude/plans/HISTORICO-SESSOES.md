# Plano: Atualização do Histórico de Sessões

## Resumo

A página `/historico-sessoes` precisa refletir o novo formato de sessões por instrução, com pontuações por fase, tentativas por instrução e evolução individual.

---

## Estado Atual (Como está hoje)

### Página: `src/app/historico-sessoes/page.tsx` (~900 linhas)

**Listagem (tabela):**
- Busca sessões de 2 APIs: `/api/sessoes-curriculum` e `/api/sessoes-avaliacao`
- Combina e ordena por data
- Colunas: Paciente, Tipo, Curriculum/Avaliação, Terapeuta, Data, Duração, Status, Ações
- Filtros: busca texto, paciente, status
- Cards de estatísticas: total, finalizadas, em andamento, pacientes atendidos

**Modal de Detalhes (dialog ao clicar "Ver"):**
- Informações gerais: paciente, terapeuta, curriculum/avaliação, status, datas
- **Sessão CURRICULUM** — mostra:
  - Atividades do curriculum (da tabela `curriculum.atividades`) — **NÃO** das atividades clone da sessão
  - Estatísticas com "Média Geral (de 4.0)", "Acertos (nota ≥ 3)", "Com Ajuda", "Total avaliações"
  - Distribuição de notas (0-4) com barras percentuais
  - Tabela de avaliações: Instrução | Tentativa | Nota | Ajuda | Observação
- **Sessão AVALIAÇÃO** — mostra respostas da avaliação ABA+

### Problemas com o formato atual:
1. **Estatísticas usam nota numérica 0-4** — agora temos pontuações customizáveis por instrução/fase (siglas como "-", "P", "A", "+")
2. **Mostra atividades do curriculum original** — deveria mostrar as atividades clone com suas instruções selecionadas
3. **Não mostra instruções selecionadas** — a sessão agora seleciona instruções específicas
4. **Não mostra fase de cada instrução** — cada instrução tem sua fase independente
5. **Não mostra evolução** — se a instrução avançou/regrediu de fase após a sessão
6. **Não mostra tentativas por instrução** — cada instrução pode ter qtd diferente de tentativas
7. **Não mostra pontuações customizáveis** — usa nota 0-4 fixa

---

## O Que Precisa Mudar

### 1. API — Enriquecer dados retornados para sessão CURRICULUM

**Arquivo**: `src/app/api/sessoes-curriculum/route.ts` (GET por id)

Atualmente retorna:
- `sessao` (básico) + `pacienteCurriculum.atividadesClone` (com instruções e pontuações)
- `instrucoesSelecionadas` (lista de {instrucaoId, atividadeCloneId})

**Precisa adicionar**:
- `InstrucaoFaseHistorico` para cada instrução (mudanças de fase feitas NESTA sessão)
- Avaliações já vêm (`sessao.avaliacoes`) — OK

### 2. Modal de Detalhes — Sessão CURRICULUM (reescrever)

**Seção "Instruções da Sessão"** (substitui "Atividades do Curriculum"):
- Listar instruções selecionadas agrupadas por atividade
- Cada instrução mostra:
  - Texto da instrução
  - Fase no momento da sessão (ou fase anterior → fase nova se houve mudança)
  - FaseBadge
  - Nº tentativas configuradas
  - Resultado das avaliações (siglas selecionadas por tentativa)

**Seção "Resumo do Desempenho"** (reescrever):
- Total de instruções avaliadas
- Instruções que avançaram de fase (count + %)
- Instruções que regrediram (count + %)
- Instruções que mantiveram (count + %)
- % de acerto geral (tentativas corretas / total)

**Seção "Detalhes por Instrução"** (nova):
- Para cada instrução selecionada:
  - Nome da atividade + texto da instrução
  - Fase: badge com "Fase Anterior → Fase Nova" se mudou
  - Tabela de tentativas: Tentativa | Resposta (sigla) | Descrição
  - % de acerto da instrução
  - Critério que estava configurado

### 3. Funções de Estatística (reescrever)

**`calcularEstatisticas`** — substituir:
- Antes: média de nota 0-4, acertos nota ≥ 3
- Depois: % acerto (última pontuação = correto), total instruções, avançaram/regrediram

### 4. Tabela da Listagem (ajuste menor)

Na tabela principal, para sessões CURRICULUM, mostrar:
- Coluna "Curriculum" — já existe, OK
- Considerar adicionar indicador visual de quantas instruções avançaram

---

## Fases de Implementação

| # | Fase | Descrição | Status |
|---|------|-----------|--------|
| 1 | API | Enriquecer GET sessão com histórico de fase por instrução | 🔲 Pendente |
| 2 | Interfaces | Atualizar tipos TypeScript para novo formato | 🔲 Pendente |
| 3 | Modal Curriculum | Reescrever seção de detalhes da sessão curriculum | 🔲 Pendente |
| 4 | Estatísticas | Reescrever cálculo de estatísticas para formato novo | 🔲 Pendente |
| 5 | Build/Teste | Verificar build e testar | 🔲 Pendente |

---

## Arquivos Impactados

| Arquivo | Tipo de Mudança |
|---------|----------------|
| `src/app/api/sessoes-curriculum/route.ts` | Incluir histórico de fases no GET por id |
| `src/app/historico-sessoes/page.tsx` | Reescrever modal de detalhes curriculum + estatísticas |

---

## Dados Disponíveis para o Modal

Quando o usuário clica "Ver" numa sessão CURRICULUM, temos acesso a:

1. **`sessao.avaliacoes[]`** — cada com: `instrucaoId`, `atividadeCloneId`, `nota` (índice), `tentativa`, `observacao`
2. **`atividadesClone[]`** — cada com:
   - `instrucoes[]` com `faseAtual`, `qtd_tentativas_alvo`, `pontuacoes[]` (InstrucaoPontuacao por fase)
   - `fases[]` (InstrucaoFase — critérios)
3. **`instrucoesSelecionadas[]`** — {instrucaoId, atividadeCloneId}
4. **`InstrucaoFaseHistorico`** — precisa ser incluído na query (mudanças de fase desta sessão)

Com esses dados é possível:
- Mapear `nota` (índice) → sigla da pontuação (ex: nota 2 → "+")
- Identificar se instrução avançou/regrediu (via histórico filtrado por sessaoId)
- Calcular % acerto (nota === última posição da pontuação)
- Mostrar fase anterior → nova

---

## Exemplo Visual (Modal Após Implementação)

```
┌─────────────────────────────────────────────────────────┐
│ Detalhes da Sessão                                       │
│                                                          │
│ Paciente: João       Terapeuta: Dra. Maria               │
│ Curriculum: Apontar  Status: Finalizada                  │
│ Início: 20/03/2026   Duração: 15 min                    │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │  4 instruções  │  2 avançaram  │  0 regrediram  │    │ │
│ │  67% acerto    │  1 manteve    │  1 s/ mudança  │    │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Atividade: Apontar Objetos                               │
│ ┌────────────────────────────────────────────────────┐   │
│ │ cor azul        [Linha Base] → [Intervenção] ✅     │   │
│ │ Tentativas: - | P | +                              │   │
│ │ Acerto: 33% (critério: 80%)                        │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ cor amarela     [Intervenção] → [Manutenção] ✅     │   │
│ │ Tentativas: + | + | +                              │   │
│ │ Acerto: 100% (critério: 80%)                       │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ cor vermelha    [Linha Base] (manteve)              │   │
│ │ Tentativas: - | +                                  │   │
│ │ Acerto: 50% (critério: 80%)                        │   │
│ └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```
