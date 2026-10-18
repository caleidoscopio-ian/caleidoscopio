# Módulo 27 — Grade de Horário da Sala e Capacidade

**Status**: implementado (17/10/2026)

## Pergunta que o módulo responde

> "Se eu tenho salas livres em vários horários, eu posso colocar mais
> profissionais na clínica?"

Para responder, é preciso saber **quando a sala está aberta** — informação que o
sistema não tinha. O dashboard do mapa de ocupação usava uma janela fixa de
07h–21h em todos os dias da semana como denominador, e portanto subestimava a
ocupação de qualquer clínica que não funcione 14h por dia nos sete dias.

## O que foi feito

### Schema — `GradeSala`

Espelha `GradeAtendimento` (dia da semana + hora início/fim + ativo), **sem
`filialId`**: a sala já pertence a uma filial, e repetir a escolha no bloco só
criaria oportunidade de divergir.

Mudança puramente aditiva. Antes do `db push`, o SQL foi conferido com
`prisma migrate diff --script`: só `CREATE TABLE grades_sala` + índices + FK,
nenhum `DROP` ou `ALTER` em tabela existente. Contagem de linhas de todas as 72
tabelas antes e depois: idêntica (4387 linhas), 73ª tabela nova e vazia.

### Grade inicial das salas existentes

Decisão da clínica: as **57 salas que já estavam cadastradas** receberam
seg–sex 08:00–18:00 (`tools/semear-grade-salas.mjs`, 285 blocos); sala criada
daqui pra frente fica fora dos números com aviso até alguém preencher. Sem isso
o dashboard nasceria vazio, porque o model é novo.

O script simula por padrão, só grava com `--aplicar`, e **ignora** sala que já
tenha qualquer bloco — nunca apaga.

### Cálculo — `@/lib/capacidade-sala`

```
capacidade        = horas em que a SALA está aberta
capacidade atendível = capacidade ∩ grade dos PROFISSIONAIS da unidade
agendado          = capacidade ∩ atendimentos
livre c/ profissional = atendível − agendado      → falta agendar (comercial)
livre s/ profissional = (capacidade − atendível) − agendado → cabe contratar
```

As três últimas somam exatamente a capacidade.

**Álgebra de intervalos, não slots.** A grade é de meia em meia hora, mas sessão
de 50 minutos é comum: marcar slots de 30min arredondaria cada uma para 60 e
inflaria a ocupação em 20%. `unir`/`intersectar`/`subtrair` em minutos do dia.

**Dia e hora no fuso da clínica** (`diasDoPeriodo`, `relogioNoFuso`). Iterar com
`getDay()` erraria o extremo do período em produção (UTC) — o mesmo bug que
inflava a taxa de ocupação do profissional em 20%.

### API

| Rota | Papel |
|---|---|
| `GET/PUT /api/salas/[id]/grade` | horário de funcionamento (`view_rooms`/`manage_rooms`) |
| `GET /api/salas/capacidade` | agregados por sala, por filial e total |

`/api/salas/capacidade` é separada de `/api/salas/ocupacao` porque aquela
devolve a lista completa de agendamentos (a timeline precisa) e esta devolve
números. Juntar faria o dashboard baixar centenas de agendamentos para mostrar
seis cartões.

### Frontend

- Botão de relógio em cada linha de `/salas` → `GradeSalaDialog`, que reaproveita
  o `GradeEditor` da grade do profissional (agora parametrizado por `endpoint` e
  por permissão RBAC).
- Aba **Dashboard** passou a ser a **primeira** de `/salas/mapa-ocupacao`.
- Bloco `CapacidadeSalas`: 4 cartões (capacidade, utilizado, livre com
  profissional, livre sem profissional), gráfico empilhado por sala, tabela por
  unidade e as notas do que ficou fora.
- A "Taxa de ocupação" do dashboard passou a sair da capacidade real.

## Decisões

| Decisão | Por quê |
|---|---|
| Sala sem grade fica **fora** dos números | Sem denominador não existe taxa; zero daria taxa infinita e um horário presumido inventaria capacidade que a clínica não confirmou. |
| Duas sobras separadas (com/sem profissional) | Pedem ações opostas: agendar x contratar. Somar perderia a informação que motivou o módulo. |
| Atendimento com sala fechada em campo próprio | `minutos_agendados_fora` é sinal de grade incompleta ou marcação errada; somado ao uso, desaparecia. |
| Capacidade atendível usa a grade do profissional, não o vínculo | O vínculo (`ProfissionalFilial`) é administrativo; a grade diz onde **e quando**. Bloco coringa (`filialId` nulo) vale em qualquer unidade. |

## Semântica exata de cada número

Confirmado com a clínica em 17/10/2026:

- **Sábado e domingo só contam se estiverem na grade** — tanto nas horas
  disponíveis do profissional quanto na capacidade da sala. O cálculo percorre
  os dias do período e só soma blocos cujo `diaSemana` casa; dia sem bloco vale
  zero.
- **Agendado** = `agendamento.salaId` (a sala escolhida na marcação), status
  AGENDADO/CONFIRMADO/EM_ATENDIMENTO/ATENDIDO, **na parte que cai dentro do
  horário da sala**. Falta e cancelamento não ocupam; o que cai fora do horário
  vai para `minutos_agendados_fora`.
- **Livre com profissional** = sala aberta ∩ grade de **qualquer** profissional
  clínico daquela filial, menos o agendado. Não exige que o profissional tenha
  escolhido aquela sala — grade de profissional não aponta para sala.
- **Livre sem profissional** = sala aberta, **nenhum** profissional da unidade
  com grade naquele horário, nada agendado.

### Teto vendável: uma pessoa atende uma sala por vez

Grade de profissional não aponta para sala, então a mesma hora livre de uma
pessoa seria contada como "livre com profissional" em **todas** as salas abertas
naquele horário. Três salas abertas 08–12 com um único profissional somariam 12h
de sobra, quando só 4h são vendáveis.

`calcularSimultaneidade` corrige isso contando, **minuto a minuto e por
unidade**, `mín(salas abertas, profissionais escalados)`:

| Medida | O que é |
|---|---|
| `minutos_efetivos` | o teto vendável do período |
| `minutos_agendados_efetivos` | do teto, o que já está agendado |
| `minutos_livres_efetivos` | do teto, o que **ainda dá para vender** |
| `minutos_limitados_por_pessoa` | sala aberta sem ninguém para ocupar → contratar |
| `minutos_limitados_por_sala` | profissional escalado sem sala livre → abrir sala |

Decisões do cálculo:

- **Por filial, somado depois.** Profissional de uma unidade não preenche sala de
  outra, então o `mín` é aplicado dentro do grupo e os grupos são somados.
- **Grade separada por pessoa.** Unir os blocos de todos antes perderia quantas
  pessoas existem no mesmo horário, que é exatamente o que limita.
- **Cada sala contribui com no máximo 1 atendimento simultâneo** (o agendado de
  uma sala já vem unido), e só dentro do horário da sala.
- **Agendado é limitado pelo teto.** Atendimento feito fora da grade de quem
  atendeu poderia estourar o `mín`; o excesso é ignorado em vez de virar sobra
  negativa — é inconsistência de cadastro, não resultado.
- **Vetor de diferenças por minuto** (1440 posições por dia/unidade): exato na
  mesma granularidade do resto e mais simples que varrer fronteiras.

As medidas por sala continuam existindo e **não** levam esse corte: o `mín` é da
unidade, não atribuível a uma sala. A tela mostra os dois, com a diferença dita
em texto.

Medido na Clinica A (7 dias): 200h de sala aberta, 174h com profissional
escalado, **93h de teto vendável** — e a sobra cai de 152,5h (somando salas) para
**72,8h** de fato vendáveis. 107h são sala aberta sem ninguém, 25h são
profissional sem sala.

## Validação

42 asserções, rodadas com `TZ=UTC` **e** `TZ=America/Sao_Paulo` com assinatura
numérica idêntica:

```
álgebra: unir/intersectar/subtrair, inclusive vazio e invertido
cruzamento: sala 08–18 + profissional 08–12 → 10h capacidade, 4h atendível,
            4h livre c/ prof, 6h livre s/ prof, as três somando 10h
sessão de 50min conta 50min (não 60) · atendimento 19h vira "fora"
sábado sem grade → capacidade 0, nenhuma medida negativa
banco real (Clinica A, 7 dias): 200h capacidade = 21,5h agendado +
            152,5h livre c/ prof + 26h livre s/ prof · atendível 174h · taxa 10,8%
30 dias = 20 dias úteis × 10h × salas = 800h
filtro de filial reduz 4 → 3 salas
rota da grade: hora inválida/invertida/dia fora de 0-6 → 400 sem apagar nada
sala de outra clínica → 404
grade esvaziada → sala sai dos números e entra no aviso; restaurada → 200h de novo
total de blocos no banco intacto: 285
```

## Pendente / próximos passos

- A clínica revisar o 08:00–18:00 sala por sala (é ponto de partida, não verdade).
- Sábado não entrou na grade semeada; quem atende sábado precisa adicionar.
- Assimetria com a taxa do profissional: lá o agendado fora da grade entra no
  numerador sem aumentar o denominador (taxa pode passar de 100%); na sala, o
  equivalente é separado em `minutos_agendados_fora`. Unificar exigiria decidir
  se a taxa do profissional deve ou não passar de 100%.
- `MAX_DIAS = 35` na capacidade, como em `/api/salas/ocupacao`. Período maior
  exigiria agregação no banco em vez de em memória.
