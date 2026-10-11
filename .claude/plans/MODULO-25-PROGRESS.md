# Módulo 25 — Central de Relatórios · Progresso

> Plano completo: `.claude/plans/MODULO-25-CENTRAL-RELATORIOS.md`
> Atualizar os checkboxes conforme avança.

## Fase 0 — Carimbo histórico ✅ concluída (09/10/2026)

- [x] Schema: `filialId`, `especialidade_snapshot`, `valor_cobrado` em `agendamento` (nullable, aditivo)
- [x] Índices `@@index([filialId])` e `@@index([status, data_hora])` para as agregações
- [x] `prisma generate` + `db push` — contagens idênticas (1245 agendamentos, 268 pacientes, 4 glosas)
- [x] `src/lib/carimbo-agendamento.ts` — `resolverFilialDoProfissional`, `montarCarimboCriacao`, `resolverValorCobrado`
- [x] Carimbo na criação avulsa (`POST /api/agendamentos`)
- [x] Carimbo na recorrência (`POST /api/agendamentos/batch`) — mesmo carimbo para todas as ocorrências
- [x] Recarimbo ao trocar o profissional (`PUT /api/agendamentos/[id]`)
- [x] `valor_cobrado` na transição para ATENDIDO — no `PUT` e no `finalizar` do check-in
- [x] Testes contra o banco: 6 casos, todos passando, sem resíduo
- [x] `tsc` exit 0 · build `✓ Compiled successfully` · guarda de tenant 0 ALTO
- [ ] **Pendência operacional**: só 4 de 26 profissionais têm filial atribuída (ver abaixo)

### Decisões aplicadas

- **Sem backfill.** Os 1245 agendamentos existentes ficam com os três campos `null`.
  Boa parte é dado de teste da fase de construção; carimbar a configuração de hoje
  criaria precisão falsa. Os relatórios caem na derivação antiga quando o carimbo
  é nulo.
- **`valor_cobrado` nulo é estado normal**, não erro. Procedimento fora da tabela
  do convênio e sem valor particular grava `null` e o relatório mostra "sem valor".
  Travar o fluxo operacional por falta de cadastro de preço sairia mais caro.
- **`filialId` sem relação com `Filial`** de propósito: um snapshot não pode ser
  apagado por `onDelete` quando a filial for removida.
- **Falha ao carimbar nunca impede o agendamento.** `montarCarimboCriacao` captura
  o erro e devolve nulos.

### Pendência que bloqueia o valor da Fase 0

Na Espaço Singular, **apenas 4 de 26 profissionais ativos têm filial atribuída**
(4 via `UsuarioRole.filialId`, 0 via `ProfissionalFilial`), embora existam 4 filiais
cadastradas. O carimbo de filial vai gravar `null` para os outros 22.

O código está certo — falta dado. Enquanto não atribuírem filial aos profissionais,
o Relatório 1 (atendimentos por filial) não terá como separar por unidade.

## Fase 1 — Casca da central ✅ concluída (09/10/2026)

- [x] `src/types/relatorio.ts` — tipos serializáveis (catálogo atravessa cliente/servidor)
- [x] `src/lib/relatorios/definicoes.ts` — catálogo com 8 entradas
- [x] `src/lib/relatorios/agregacao.ts` — motor: 3 níveis, subtotais, total geral
- [x] `src/lib/relatorios/formatacao.ts` — moeda, contagem, percentual, duração
- [x] `src/lib/relatorios/fonte-atendimentos.ts` — linhas-fonte com precedência carimbo ▸ derivação
- [x] `GET /api/relatorios/[slug]` — rota genérica resolvida pelo catálogo
- [x] `GET /api/relatorios/opcoes` — dropdowns da barra em uma chamada
- [x] `BarraFiltros`, `SeletorAgrupamento`, `TabelaAgrupada`
- [x] `/relatorios/[slug]` — casca única
- [x] `/relatorios` — índice reescrito a partir do catálogo, com filtro por recurso RBAC
- [x] RBAC: recurso `relatorios` já existia completo (seed, bootstrap, action-map, matrix, sidebar) — nada a migrar
- [x] Testes: 26 do motor (puro) + 28 da fonte (banco real) + 38 da rota (RBAC real) = 92
- [x] `tsc` exit 0 · build `✓ Compiled successfully` · lint sem aviso novo · guarda de tenant 0 ALTO

### Escopo entregue da Fase 1

O relatório **1 (atendimentos)** está funcional de ponta a ponta — era o mínimo
para a casca ser verificável em vez de só compilar. Os relatórios 2, 3 e 6 entram
nas fases seguintes reusando este motor.

Catálogo atual:

| Slug | Estado |
|---|---|
| `atendimentos` | funcional |
| `repasse` | declarado, Fase 2 |
| `parceiro-negocio` | declarado, Fase 3 |
| `faltas` | declarado, Fase 6 |
| `produtividade-profissionais` | externo → `/taxa-ocupacao` |
| `ocupacao-salas` | externo → `/salas/mapa-ocupacao` |
| `historico-atendimentos` | externo → `/historico-atendimentos` |
| `profissionais-pdf` | externo → `/relatorios/profissionais` |

### Decisões da Fase 1

- **Agregação no servidor**, não no cliente: a tela, a exportação (Fase 4) e o
  CSV precisam mostrar o mesmo número. `agregacao.ts` fica puro (sem Prisma, sem
  React) para rodar nos dois lados e ser testável sem banco.
- **Métrica derivada divide depois de somar.** Ticket médio é declarado como
  `razao` e recalculado em cada nível. Somar os tickets dos grupos daria média de
  médias: no dado real daria R$ 258,34 em vez dos R$ 150,00 corretos.
- **Filial de não-admin é imposta no servidor**, não escondida na tela: a rota
  ignora o `filialId` recebido e usa o do vínculo. Testado pedindo outra filial.
- **Carimbo com fallback.** Onde o carimbo é nulo (base anterior à Fase 0), a
  filial vem da sala e o valor é recalculado — com aviso na tela dizendo quantos
  registros estão nessa situação, para ninguém confundir derivado com congelado.
- **Teto de 20.000 linhas** por consulta. Acima disso responde 400 pedindo
  período menor, em vez de agregar em memória até cair.
- **Especialidade filtra pela dimensão já resolvida**, não por coluna do banco:
  é texto que vem do carimbo ou do cadastro, e filtrar de outro jeito deixaria de
  casar com agrupar por especialidade.

### Números medidos (tenant Espaço Singular, 09/10/2026)

```
ATENDIDO no período de 2026:   12
valor total:                   R$ 993,14
ticket médio:                  R$ 82,76
pacientes distintos:           5
sem valor cadastrado:          1  (aparece "—", não R$ 0,00)
valor carimbado:               0/12  (base anterior à Fase 0)
filial resolvida:              12/12 (toda via sala, nenhuma via carimbo)
dimensões disponíveis:         4 filiais · 26 profissionais · 5 convênios · 5 procedimentos · 8 especialidades
```

Como o plano previa, o relatório nasce quase vazio: o gargalo é a recepção não
fechar o ciclo `check-in → atendido`, não o código.

## Fase 2 — Relatório de Repasse ✅ concluída (10/10/2026)

- [x] `src/lib/relatorios/repasse.ts` — resolvedor puro: vigência, compatibilidade, precedência, cálculo
- [x] `src/lib/relatorios/fonte-repasse.ts` — aplica a regra sobre as linhas de atendimento
- [x] Dimensão `regra` — agrupar por ela separa coberto de descoberto numa coluna
- [x] Métricas: bruto, a pagar ao profissional, líquido da clínica, % de repasse
- [x] Detalhamento linha a linha com a regra aplicada
- [x] Testes: 65 do resolvedor (puro) + 40 da fonte (banco real) + rota

### Regra de precedência implementada

1. Descarta o que não está vigente na **data do atendimento** e o que não casa
   com convênio/procedimento daquela linha.
2. Ordena por `prioridade` desc — o schema define "maior prevalece", então ela
   vence até a especificidade.
3. Empate: especificidade (convênio+procedimento ▸ convênio ▸ procedimento ▸ geral).
4. Empate ainda: vigência mais recente, depois `id`. O resultado **não depende
   da ordem em que o banco devolveu as linhas** — testado com 4 permutações.

### Decisões da Fase 2

- **Particular é `convenioId = null`**, então regra de convênio nunca pega
  atendimento particular, e regra geral pega. Testado nos dois sentidos.
- **`VALOR_FIXO` e `VALOR_HORA` rendem repasse mesmo sem preço cadastrado** — não
  dependem do bruto. Nesse caso o líquido fica `null`, não o bruto inteiro.
  `PERCENTUAL` sem bruto devolve `null`: não há sobre o que incidir.
- **Repasse acima do bruto não é clampeado.** Líquido negativo aparece em
  vermelho e gera aviso. Esconder faria o fechamento fechar errado em silêncio.
- **Sem regra ⇒ `null`, nunca zero.** Zero diria "não se deve nada"; `null` diz
  "não sabemos", que é a verdade e o que precisa de ação.

## Fase 3 — Parceiro de Negócio ✅ concluída (10/10/2026)

- [x] `parceiro-negocio` ativado sobre a **fonte de repasse**, não a de atendimentos
- [x] Agrupamento padrão `parceiro > procedimento`; Particular como entrada própria
- [x] Relatório 1 (atendimentos) já estava completo desde a Fase 1

O plano pedia quantidade, bruto, repasse e líquido por parceiro — isso é a fonte
de repasse com outra ordem de agrupamento. Custo marginal quase zero, como
previsto.

## Fase 4 — Exportação CSV/PDF ✅ concluída (10/10/2026)

- [x] `src/lib/relatorios/exportacao.ts` — resumo CSV, detalhe CSV, PDF
- [x] `BotoesExportacao` no topo (relatório inteiro) e em cada grupo (recorte)
- [x] Testes: 27 sobre o conteúdo gerado

### Decisões da Fase 4

- **Exporta do resultado que está na tela**, sem refazer a consulta. Não é
  economia de requisição: é garantia de que o arquivo e a tela não divergem.
- **No CSV a hierarquia é dado, não indentação**: as colunas de nível vêm
  preenchidas em cascata, para a planilha conseguir filtrar e subtotalizar.
- **Vírgula decimal e BOM UTF-8** — é o que o Excel pt-BR entende. Null vira
  célula vazia, nunca zero, para a planilha não somar o que não existe.
- **Sem gate de permissão `EXPORT`.** O dado já está na tela de quem clica;
  bloquear o download seria teatro. (Além disso nenhum perfil tem `EXPORT` no
  `bootstrap-roles`, então o gate deixaria todos de fora.)
- A exportação respeita as colunas que o usuário ligou/desligou.

## Fase 5 — Preferências e gráfico ✅ concluída (10/10/2026)

- [x] `src/hooks/usePreferenciasRelatorio.ts` — colunas, agrupamento e gráfico
- [x] `PreferenciasRelatorioPainel` — seletor de colunas e tipo de gráfico
- [x] `GraficoRelatorio` — barras, barras empilhadas e pizza (recharts)
- [x] Paleta validada e tokens em `globals.css`
- [x] Chart carregado via `next/dynamic`: first load de `/relatorios/[slug]` caiu de **343 kB → 225 kB**

### Decisões da Fase 5

- **Persistência em `localStorage`, com a chave incluindo o id do usuário.** Num
  computador de recepção compartilhado, o layout de uma pessoa não aparece para
  a seguinte. Guardar no banco exigiria tabela nova, e o CLAUDE.md trata schema
  como passo manual — para preferência de layout não se justifica. **Se a
  clínica quiser o mesmo layout em qualquer máquina, aí vale a tabela.**
- **Preferência salva é validada contra o catálogo atual** (`sanear`): métrica
  renomeada ou dimensão removida é descartada em vez de deixar a tabela sem
  coluna nenhuma.
- **Uma métrica por gráfico, nunca dois eixos y.** "Atendimentos" e "Valor
  total" têm escalas diferentes; plotar juntos faria a comparação visual
  depender de onde cada eixo foi ancorado. Há um seletor de métrica.
- **Seis cores em ordem fixa, "Outros" a partir da 7ª.** A ordem dos slots é o
  mecanismo de segurança para daltonismo, não escolha estética — validada com o
  validador da skill `dataviz` contra as superfícies reais do projeto (card
  branco e `#171717`): pior par adjacente ΔE 9.1 protan no claro, 8.4 no escuro.
- **Empilhamento e pizza só para métrica somável.** Empilhar ou fatiar uma razão
  (ticket médio, % de repasse) não significa nada; nesses casos cai em barras.
- **Grupo sem valor sai do gráfico** e é contado numa nota. Barra zerada
  afirmaria algo que o dado não diz.

## Fase 6 — Faltas ✅ concluída (10/10/2026)

- [x] `src/lib/relatorios/fonte-faltas.ts` — carrega ATENDIDO + FALTOU + CANCELADO
- [x] Métricas: esperados, compareceu, faltas, % de falta, cancelados, % de cancelamento
- [x] Detalhe com desfecho e motivo da falta (`motivo_falta` acrescentado à fonte base)
- [x] Testes: 31, com registros FALTOU temporários criados e removidos (baseline 1245 → 1245)

### A decisão que define o número

```
taxa de falta        = faltas / (atendidos + faltas)
taxa de cancelamento = cancelados / total agendado
```

**Cancelamento não entra no denominador da taxa de falta**: o paciente avisou e
o horário pôde ser reaproveitado. Misturar as duas coisas afunda a taxa de falta
e esconde exatamente o problema que o relatório existe para mostrar.

Contadores de desfecho são `0`/`1`, nunca `null` — "zero faltas" é informação,
e "—" diria que não sabemos. Já a **taxa** sem denominador é `null`, não `0%`.

## Fase 7 — Trazer 3 e 4 para dentro da central ⬜ avaliado, não recomendado agora

`/taxa-ocupacao` e `/salas/mapa-ocupacao` **não cabem na casca** sem perder o que
têm de melhor:

- A taxa de ocupação compara **grade configurada x agenda**, e a grade não é uma
  linha de agendamento — não existe como linha-fonte para o motor de agregação.
- O mapa de salas é uma **timeline por faixa de horário** e um kanban semanal;
  a casca sabe fazer árvore com subtotal, não grade temporal.

Reescrever os dois para caber custaria mais do que ganham, e o ganho real
(filtros e exportação unificados) é pequeno porque ambos já têm filtro próprio.
**Ficam indexados no catálogo como `fonte: "externo"`**, que é o que o usuário
precisa: encontrar tudo em um lugar. Revisitar se e quando a grade virar linha
de dado por outro motivo.
