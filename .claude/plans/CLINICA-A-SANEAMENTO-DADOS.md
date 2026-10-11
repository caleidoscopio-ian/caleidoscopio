# Saneamento de dados — Clinica A

> **Status**: ✅ **aplicado em 11/10/2026** via `tools/sanear-clinica-a.mjs --aplicar`
> 303 operações · 0 deletes · outros tenants intactos
> **Tenant**: `cmo0h6yky000txal4htlrr3h2`
> **Escopo**: somente a Clinica A. Espaço Singular e os demais ficam intactos.
> **Regra**: não apagar nada — apenas ajustar para refletir a operação real.
> **Objetivo**: ter dado coerente para testar os 4 relatórios da central.

## Retrato atual

```
3 filiais · 4 salas · 5 "profissionais" · 6 pacientes
3 procedimentos · 2 convênios · 1 linha de preço · 2 regras de repasse
163 agendamentos (76 passados · 87 futuros), de 19/04/2026 a 01/02/2027

por status:  CANCELADO 75 · AGENDADO 55 · ATENDIDO 17 · CONFIRMADO 12 · FALTOU 4
por filial:  Filial Bragança 99 · Extrema 64 · SJC 0
```

---

## O que trava cada relatório hoje

| Relatório | Estado | Trava principal |
|---|---|---|
| 1 · Atendimentos | 17 atendidos, **só 4 com preço** | matriz de preço quase vazia |
| 2 · Repasse | 1 de 5 "profissionais" tem regra | falta regra + buraco de vigência |
| 3 · Parceiro | HAPVIDA 8 · unimed 5 · Particular 4 | mesmo preço do nº 1 |
| 6 · Faltas | 17 atendidos · 4 faltas · 75 cancelados | 46% de cancelamento é irreal; faltas sem motivo |

---

## Achados

### A. Preço — o bloqueio número 1

A matriz convênio × procedimento tem **1 célula preenchida de 6**:

| | unimed | HAPVIDA |
|---|---|---|
| **Procedimento 2** | — | 200 |
| **Procedimento Inicial** | — | — |
| **teste** | — | — |

Por isso 13 dos 17 atendidos aparecem sem valor. Os procedimentos têm
`valor` (200) e `valor_particular` (250) cadastrados, mas o cálculo para paciente
com convênio só olha a tabela do convênio — o campo `valor` do procedimento não
é usado nesse caminho.

**Ação**: preencher as células que fazem sentido. *Preciso dos valores.*

### B. Quem atende x quem não deveria

| Pessoa | Vínculo | Agendamentos | Problema |
|---|---|---|---|
| Profissional Bragança | PROFISSIONAL_CLINICO · Psicologia | 110 | ok |
| Profissional Extrema | PROFISSIONAL_CLINICO · Psicologia | 16 | ok |
| Profissional Clinica A | PROFISSIONAL_CLINICO · T.O. | 12 | ok |
| **Admin Clinica A** | **sem vínculo**, especialidade "Administrador" | **15** | admin atendendo |
| **Usuario Novo** | FUNCIONARIO_ADMINISTRATIVO · RECEPÇÃO | **10** | recepção atendendo |

São **25 agendamentos** (4 deles ATENDIDO) marcados para pessoas que não são
atendentes. Isso contamina os relatórios 1, 2 e 3 — e a taxa de ocupação.

**Ação**: reatribuir esses 25 para um dos 3 clínicos. *Preciso saber para quem.*

### C. Repasse — cobertura e buraco de vigência

Só **Profissional Clinica A** tem regra, e são duas que **não se sobrepõem**:

```
PERCENTUAL 50%  vigência 16/04/2026 → 30/04/2026
PERCENTUAL 20%  vigência 10/10/2026 → sem fim
                        ↑ buraco de 01/05 a 09/10/2026
```

A trava de conflito do sistema agiu corretamente (as vigências não colidem), mas
**13 dos 17 atendidos caem no buraco** (agosto/2026) e ficam sem repasse mesmo
para quem tem regra.

**Ação**: criar regra para os outros 2 clínicos e fechar o buraco. *Preciso dos %.*

### D. Carimbos nunca gravados

| Campo | Faltando |
|---|---|
| `valor_cobrado` | **163 de 163** |
| `especialidade_snapshot` | **160 de 163** |
| `filialId` | 0 — ok, o backfill cobriu |

Os carimbos só são gravados na criação (especialidade) e na transição para
ATENDIDO (valor). Esses agendamentos são anteriores ao Módulo 25.

**Ação**: recarimbar os existentes — derivando a especialidade do profissional e
o valor pela tabela (depois de A e B resolvidos). Aditivo, só preenche nulo.

### E. Pacientes

| Paciente | Ativo | Convênio | N:M | Filial | Agend. | Observação |
|---|---|---|---|---|---|---|
| Paciente 1 | sim | HAPVIDA | 1 | **—** | 61 | ok, falta filial |
| Paciente Braganca | sim | unimed | **0** | **—** | 78 | só campo legado |
| paciente extrema | sim | **—** | 0 | Extrema | 24 | sem convênio → 24 particulares sem valor |
| joao teste | sim | HAPVIDA | 1 | **—** | 0 | nunca usado |
| Paciente extrema | **não** | — | 0 | — | 0 | quase homônimo do ativo |
| 312312dwsqdas | **não** | — | 0 | — | 0 | nome lixo |

- **5 de 6 sem filial** — o relatório por filial do paciente fica vazio.
- **Paciente Braganca** sem linha em `PacienteConvenio`: com o dropdown restrito
  ele depende do fallback do campo legado (que já funciona).
- **paciente extrema** sem convênio: os 24 agendamentos dele são particulares, e
  nenhum tem `valor_particular` digitado → sempre "sem valor".
- Os 2 inativos não aparecem em lugar nenhum. Como não se apaga, ficam como estão
  (sugiro só renomear o "312312dwsqdas" para algo legível).

### F. Procedimentos

| Nome | Código | valor | particular | duração | especialidade |
|---|---|---|---|---|---|
| Procedimento 2 | 22.02.02.02-04 | 200 | 250 | 45 | Fonoaudiologia |
| Procedimento Inicial | 22.01.01.04-02 | 200 | 250 | 45 | Outros |
| **teste** | **—** | **—** | **—** | 30 | Fonoaudiologia |

- **"teste"** não tem código nem valor. Nunca foi usado em agendamento.
- A **especialidade dos procedimentos é "Fonoaudiologia"**, mas nenhum
  profissional da clínica é fonoaudiólogo (são 2 Psicologia + 1 T.O.).

### G. Estrutura

- **Filial SJC não tem nenhuma sala** → impossível agendar lá. Ou cadastra sala,
  ou desativa a filial.
- As 3 grades estão com `filialId = NULL` ("vale em qualquer filial"). Funciona,
  mas não exercita a grade por unidade do Módulo 26.
- **Admin Clinica A** e **Usuario Novo** não têm vínculo em `ProfissionalFilial`.

### H. Qualidade dos desfechos

- **4 FALTOU, todas sem motivo** — o relatório de faltas mostra "sem motivo registrado".
- **15 de 17 ATENDIDO sem `hora_chegada`** — o ciclo de check-in não foi usado,
  então não há tempo de espera nem duração real.
- **75 CANCELADO de 163 (46%)** — desproporcional para teste; a taxa de
  cancelamento do relatório sai irreal.

---

## Decisões necessárias

| # | Pergunta | Afeta |
|---|---|---|
| 1 | Valores de cada célula da matriz de preço (5 vazias) | Relatórios 1, 2, 3 |
| 2 | Os 25 agendamentos de "Admin Clinica A" e "Usuario Novo" vão para qual clínico? | Relatórios 1, 2, 3 + taxa de ocupação |
| 3 | % de repasse de cada um dos 3 clínicos, e desde quando | Relatório 2 |
| 4 | Filial de cada paciente | Quebra por filial |
| 5 | "paciente extrema" ganha convênio ou os 24 viram particular com valor? | Preço |
| 6 | SJC: cadastrar sala ou desativar? | Estrutura |
| 7 | Converter parte dos 75 cancelados em ATENDIDO/FALTOU? | Relatório 6 |
| 8 | Motivo das 4 faltas | Relatório 6 |
| 9 | Grades por filial em vez de "qualquer"? | Testar Módulo 26 |

## Como pretendo executar (depois de aprovado)

1. Script único em `tools/`, **simulação por padrão**, grava só com `--aplicar`.
2. Escopo travado no `tenantId` da Clinica A — nenhuma query sem esse filtro.
3. Contagem antes/depois de todas as tabelas tocadas, e verificação de que as
   outras clínicas não mudaram.
4. **Nenhum `delete`.** Só `update` e `create` de linhas que faltam (preço, repasse).
5. Registro de cada alteração neste arquivo, para ficar rastreável.


---

# EXECUTADO — 11/10/2026

`tools/sanear-clinica-a.mjs` · **303 operações · 0 deletes**

```
agendamento.update          281
convenioTabela.create         5
filial.update                 1
paciente.update               7
procedimento.update           1
profissional.update           1
profissionalFilial.create     2
regraRepasse.create           3
regraRepasse.update           2
```

## Valores aplicados

| Decisão | Valor |
|---|---|
| 1 · Preços (150–200) | unimed×Proc.2 = 180 · unimed×Proc.Inicial = 160 · HAPVIDA×Proc.Inicial = 190 · unimed×teste = 150 · HAPVIDA×teste = 170 |
| 2 · Reatribuição | 25 agendamentos divididos: Clinica A 10 · Extrema 8 · Bragança 7 — **0 choques de horário** |
| 3 · Repasse | 15% PERCENTUAL para os 3 clínicos, desde 01/01/2026, sem fim. As 2 regras antigas foram **desativadas**, não apagadas |
| 4 · Filial dos pacientes | 3 em Extrema, 3 em Filial Bragança |
| 5 · "paciente extrema" | continua particular; 23 agendamentos ganharam `valor_particular` |
| 6 · SJC | **desativada** (0 salas, 0 agendamentos, 0 pacientes, 0 grades) |
| 7 · Desfechos | 44 passados em aberto + 14 cancelados passados → ATENDIDO 34 · FALTOU 15 · CANCELADO 5 |
| 8 · Motivo das faltas | "Desistiu de última hora" |
| 9 · Grades por filial | **não mexi** — ver abaixo |

Também: procedimento "teste" ganhou código `22.03.03.03-01`, valor 150 e
particular 180; paciente `312312dwsqdas` renomeado para "Paciente Teste
(inativo)"; `Usuario Novo` (recepção) vinculado às **duas** filiais ativas;
`Admin Clinica A` classificado como `FUNCIONARIO_ADMINISTRATIVO`/`GESTAO`.

### Por que não mexi nas grades (decisão 9)

Os 3 clínicos têm grade com `filialId = null` ("qualquer filial"), e todos
atendem nas duas unidades. Dividir a grade por filial exigiria duplicar blocos e
arriscaria bloquear agendamento numa unidade por erro de configuração — ganho
pequeno, risco real. A grade **por filial já é exercitada** no Espaço Singular
(83 blocos em Extrema, 60 em Vargem, 28 em Bragança).

## Resultado

```
ANTES                              DEPOIS
CANCELADO 75 · AGENDADO 55         ATENDIDO 51 · CANCELADO 70
ATENDIDO 17 · CONFIRMADO 12        FALTOU 19 · AGENDADO 23
FALTOU 4
```

Todos os nulos que importavam foram fechados:

```
agendamento sem filial:         0
agendamento sem especialidade:  0
ATENDIDO sem valor_cobrado:     0
FALTOU sem motivo:              0
paciente sem filial:            0
```

### Os 4 relatórios com dado real

```
ATENDIMENTOS por filial
  TOTAL              51   R$ 10.350,00   ticket R$ 202,94   3 pacientes
  Extrema            32    R$ 6.670,00          R$ 208,44
  Filial Bragança    19    R$ 3.680,00          R$ 193,68

ATENDIMENTOS por especialidade
  Psicologia         36    R$ 7.320,00          R$ 203,33
  Terapia Ocupacional 15   R$ 3.030,00          R$ 202,00

REPASSE por profissional
  TOTAL              51   bruto R$ 10.350,00   a pagar R$ 1.552,50   líquido R$ 8.797,50
  Prof. Bragança     21         R$ 3.960,00            R$ 594,00          R$ 3.366,00
  Prof. Clinica A    15         R$ 3.030,00            R$ 454,50          R$ 2.575,50
  Prof. Extrema      15         R$ 3.360,00            R$ 504,00          R$ 2.856,00

PARCEIRO DE NEGÓCIO
  HAPVIDA            19         R$ 3.710,00            R$ 556,50
  Particular         15         R$ 3.750,00            R$ 562,50
  unimed             17         R$ 2.890,00            R$ 433,50

FALTAS por paciente
  TOTAL     esperados 70 · compareceu 51 · faltas 19 · 27,1%
  Paciente 1          27 · 19 · 8 · 29,6%
  Paciente Braganca   22 · 17 · 5 · 22,7%
  paciente extrema    21 · 15 · 6 · 28,6%
```

Nenhum relatório tem aviso de dado faltando.

## Contagens — escopo respeitado

```
                        antes  depois
Clinica A
  agendamentos            163     163   (nenhum criado ou apagado)
  pacientes                 6       6
  profissionais             5       5
  salas                     4       4
  filiais                   3       3
  convenioTabela            1       6   (+5 preços)
  regraRepasse              2       5   (+3 novas, 2 desativadas)
  profissionalFilial        3       5   (+2 da recepção)

Outros tenants
  agendamentos           1085    1085
  pacientes               262     262
  profissionais            43      43
  convenioTabela           12      12
  regraRepasse              2       2
  salas                    46      46
```

## Para reverter, se precisar

Nada foi apagado, então tudo é recuperável:
- regras de repasse antigas: `ativo: false` → `true`
- SJC: `ativo: false` → `true`
- paciente renomeado: nome original era `312312dwsqdas`
- status dos agendamentos: não há histórico do valor anterior; se precisar
  reverter, o critério foi "passados em aberto → 70/15/15" e "cancelados
  passados → terços", com semente fixa (42) no script


---

# POPULAÇÃO DE ATENDIMENTOS — 11/10/2026

`tools/gerar-atendimentos-clinica-a.ts` · **161 agendamentos criados**, nenhum
registro existente alterado ou apagado. Período: **12/09 a 11/10/2026**.

Ids gravados em `tools/gerados-clinica-a.json` — para reverter, basta apagar
esses ids.

## O que o gerador respeita

- **Grade de cada profissional** (dia da semana + faixa). 26 tentativas foram
  recusadas por não caberem num bloco.
- **Sem choque de horário**: por profissional, por sala **e por paciente**
  (ninguém em dois lugares ao mesmo tempo). 31 recusas.
- **Filial vem da sala**, nunca do perfil do profissional.
- **Preço pela tabela do convênio do paciente**, ou valor particular.
- **Carimbos preenchidos**: `filialId`, `especialidade_snapshot`, `valor_cobrado`.
- **Ciclo fechado**: ATENDIDO com check-in completo (chegada, início e fim reais);
  FALTOU com motivo.
- Horas de parede montadas com `instanteNoFuso` — nunca `new Date(a,m,d,h)`.

## Distribuição gerada

```
status:        ATENDIDO 106 · FALTOU 29 · CANCELADO 26
profissional:  Clinica A 67 · Bragança 57 · Extrema 37
sala:          Sala 4 (Extrema) 52 · Sala 2 (Extrema) 44 · Sala 1 (Bragança) 36 · Sala 3 (Extrema) 29
paciente:      joao teste 45 · Paciente Braganca 42 · paciente extrema 39 · Paciente 1 35
procedimento:  Proc. Inicial 66 · teste 50 · Proc. 2 45
mês:           set/2026 106 · out/2026 55
```

`joao teste` passou a ter atendimentos — antes tinha zero.

## Os relatórios no período 12/09–11/10

```
ATENDIMENTOS por filial › especialidade
  TOTAL                   111   R$ 21.250,00   R$ 191,44   4 pacientes
  Extrema                  77   R$ 14.730,00   R$ 191,30
     Psicologia            51    R$ 9.820,00   R$ 192,55
     Terapia Ocupacional   26    R$ 4.910,00   R$ 188,85
  Filial Bragança          34    R$ 6.520,00   R$ 191,76
     Psicologia            21    R$ 4.010,00   R$ 190,95
     Terapia Ocupacional   13    R$ 2.510,00   R$ 193,08

REPASSE por profissional
  TOTAL              bruto R$ 21.250,00 · a pagar R$ 3.187,50 · líquido R$ 18.062,50
  Prof. Bragança  45       R$ 8.340,00         R$ 1.251,00        R$ 7.089,00
  Prof. Clinica A 39       R$ 7.420,00         R$ 1.113,00        R$ 6.307,00
  Prof. Extrema   27       R$ 5.490,00           R$ 823,50        R$ 4.666,50

PARCEIRO DE NEGÓCIO
  HAPVIDA     56   R$ 10.420,00   R$ 1.563,00   R$ 8.857,00
  Particular  28    R$ 6.440,00     R$ 966,00   R$ 5.474,00
  unimed      27    R$ 4.390,00     R$ 658,50   R$ 3.731,50

FALTAS por paciente
  TOTAL              esperados 145 · compareceu 111 · faltas 34 · 23,5%
  Paciente Braganca   40 · 27 · 13 · 32,5%
  Paciente 1          34 · 27 ·  7 · 20,6%
  paciente extrema    35 · 28 ·  7 · 20,0%
  joao teste          36 · 29 ·  7 · 19,4%
```

Nenhum relatório tem aviso de dado faltando. Agendamentos da Clinica A:
**163 → 324**. Outros tenants: 1085 → 1085.
