# Módulo 26 — Filial no Agendamento · Progresso

> Plano: `.claude/plans/MODULO-26-FILIAL-AGENDAMENTO.md`

## Fase 0 — Pessoa vinculada a várias filiais ✅ concluída (10/10/2026)

- [x] `src/lib/filial-pessoa.ts` — `escopoFilialDoUsuario`, `filialPermitida`, `intersecaoFilial`
- [x] `src/lib/filial-profissionais.ts` — aceita lista de filiais; comentário corrigido
- [x] `tools/migrar-vinculo-filial.mjs` — migração aditiva e idempotente, com modo simulação
- [x] Migração aplicada: **7 vínculos** criados em `ProfissionalFilial` (de 0)
- [x] `GET /api/usuario-roles` — devolve `filialIds`, `filialPrincipalId`, `filiais`
- [x] `PATCH /api/usuario-roles` — aceita `filialIds[]` + `filialPrincipalId`; `filialId` único ainda funciona
- [x] `SeletorFiliaisUsuario` — multi-select com estrela de principal
- [x] `/usuarios` usando o seletor novo; diálogo de confirmação antigo removido
- [x] Testes: 43 contra o banco real, estado restaurado
- [x] `tsc` exit 0 · `next build` ✓ · lint sem aviso · guarda de tenant 0 ALTO

**Sem alteração de schema.** `ProfissionalFilial` já existia com a chave composta
`(profissionalId, filialId)` e a flag `principal`.

### Decisões da Fase 0

- **Lista vazia = SEM RESTRIÇÃO**, não "nenhuma filial". É o que
  `UsuarioRole.filialId = null` sempre significou. O retorno é um objeto com
  `restrito`, não um array solto: um `includes()` sobre array vazio diria "não
  pode nada" e travaria a clínica.
- **A restrição é opt-in.** Quem não tem vínculo cadastrado continua sem
  restrição, então ninguém fica travado no deploy.
- **`UsuarioRole.filialId` continua sendo gravado** com a filial principal —
  compatibilidade e fallback. Nada foi apagado.
- **Esvaziar a lista amplia o acesso**, então essa transição específica pede
  confirmação na UI. Reduzir não pede.
- **Filial de outro tenant é recusada por inteiro**: uma lista com uma filial
  válida e uma de fora não grava nem a válida.
- Usuário sem registro em `profissional` não tem onde guardar a lista; nesse caso
  só a principal é gravada e a resposta devolve `multiFilialSalva: false`, que a
  tela informa em vez de mentir.

### Contagens (antes → depois)

```
profissionalFilial       0 → 7     (único que mudou, por desenho)
usuarioRole             40 → 40
usuarioRoleHistorico    31 → 31
profissionais           48 → 48
agendamentos          1245 → 1245
filiais                 10 → 10
salas                   50 → 50
grades                 212 → 212
glosas                   4 → 4
regrasRepasse            3 → 3
```

## Fase 1 — Filial escolhida no agendamento ✅ concluída (10/10/2026)

- [x] `GET /api/terapeutas/[id]/filiais` — grade do profissional ∩ escopo do usuário
- [x] `src/lib/validar-filial-agendamento.ts` — `validarFilialDaSala`, `profissionalAtendeNaFilial`
- [x] Campo filial no formulário (profissional → filial → sala), resets em cascata
- [x] Grade filtrada pela filial escolhida — horários disponíveis estreitam junto
- [x] `POST`, `PUT` e `batch` validando `sala.filialId === filialId`
- [x] Carimbo passa a receber a filial resolvida (corrige o defeito do Módulo 25 Fase 0)
- [x] Testes: 30 contra o banco real, baseline 1245 → 1245, resíduo 0
- [x] `npm run build` ✓ · `tsc` exit 0 · lint sem aviso · guarda de tenant 0 ALTO

### A validação que não existia

`POST /api/agendamentos` conferia apenas que a sala pertencia ao **tenant**.
Agora, no servidor:

| Situação | Resposta |
|---|---|
| Sala e filial concordando | cria, gravando a filial |
| Sala de Extrema com filial Bragança | **400**, nomeando as duas unidades |
| Sem filial informada | deriva **da sala** (nunca do perfil do profissional) |
| Filial fora do escopo do usuário | **403**, dizendo para pedir o vínculo |
| Sala de outro tenant | **404** |
| Profissional sem grade naquela filial | cria, com `aviso` no corpo da resposta |

A grade é **aviso, não bloqueio** — coerente com a validação de horário fora da
grade que já existia. Travar a recepção porque a grade de uma unidade não foi
configurada sairia mais caro que o furo no relatório.

### Decisões da Fase 1

- **Profissional sem grade nenhuma recebe todas as filiais do escopo do usuário.**
  26 dos 48 profissionais não têm grade; exigir grade para agendar os tornaria
  inagendáveis — uma regressão em cima de um fluxo que hoje funciona. O
  `diagnostico.temGrade` faz a tela avisar que a grade está faltando.
- **A troca de profissional NÃO muda a filial** no `PUT`: o atendimento continua
  na mesma unidade física. Só a especialidade acompanha.
- **Filial sem sala aparece no dropdown, desabilitada**, com o motivo. Esconder
  deixaria a clínica procurando uma unidade que existe e não aparece
  ("Especialidades" é o caso real).
- **Uma única filial disponível é preenchida sozinha** — uma opção não é escolha.
- **Na edição de agendamento antigo a filial é derivada da sala**, para quem só
  quer mudar o horário não precisar reescolher a unidade. A Fase 2 torna esse
  fallback desnecessário.
- **O vazio explica o que fazer**, e distingue os dois casos: "o profissional não
  tem grade em lugar nenhum" (configure a grade) x "tem, mas não onde você opera"
  (peça o vínculo ao administrador).

### Correção dentro da Fase 1 — a grade por filial abriu um furo

Ao recortar a grade pela filial escolhida, lista vazia passou a ter **dois
significados**, e os dois caíam no mesmo caminho:

| Lista vazia porque… | Significado correto | O que acontecia |
|---|---|---|
| grade não configurada | sem restrição (preservar) | ✔ liberava |
| tem grade, mas em outra unidade | **nenhum horário válido** | ✘ liberava também |

Elisangela tem grade só em Bragança. Escolher Extrema recortava a grade para
`[]`, e `temGrade([]) === false` liberava a agenda inteira — 05:00 às 22:00,
qualquer dia. O oposto do que a grade existe para fazer.

**Correção**: `gradeDaFilial()` em `@/lib/grade-agendamento` devolve
`{ blocos, semGradeNestaFilial }`. O sinal separa os dois casos, e o formulário
curto-circuita nele: zero horários na lista, bloqueio no submit e mensagem
própria ("Sem grade configurada em Extrema… configure em Agenda › Grade de
Horários, ou escolha outra filial").

Testado com 41 casos puros, incluindo a demonstração do furo e o bloco coringa
(`filialId = null`, que vale em qualquer unidade).

### Política de cadastro incompleto (decidida em 10/10/2026)

**Cadastro incompleto NÃO libera a agenda.** Antes, profissional sem grade
nenhuma ficava sem restrição — qualquer horário, qualquer dia. Para quem ainda
vai ser configurado, isso é o oposto do desejado.

Os dois casos agora bloqueiam, com mensagens diferentes porque a ação é diferente:

| Situação | Comportamento |
|---|---|
| Sem grade em nenhuma unidade | dropdown de filial vazio · zero horários · submit bloqueado |
| Tem grade, mas não nesta unidade | zero horários · submit bloqueado · "configure a grade desta filial" |

Custo medido: dos profissionais que aparecem no dropdown de agendamento
(`atende=true` ⇒ `PROFISSIONAL_CLINICO`), **1 de 20** está sem grade (Gabriel
Cosmo, Espaço Singular). Nas outras clínicas, 0.

> O número "26 de 48" usado antes para justificar o fallback estava com o
> denominador errado: contava administrativos e tenants de teste, e o dropdown
> já filtra por `atende=true`. O fallback foi removido.

**Pendência conhecida**: a grade nunca foi validada no servidor — nem antes do
Módulo 26. O bloqueio é do cliente. Quem chamar `POST /api/agendamentos` direto
pela API ainda fura a grade. Não é regressão; é um furo pré-existente a fechar
numa fase própria.

## Fase 2 — Backfill de `agendamento.filialId` ✅ concluída (10/10/2026)

- [x] `tools/backfill-filial-agendamento.mjs` — simulação por padrão, grava com `--aplicar`
- [x] Simulação conferida antes de aplicar
- [x] **1245 agendamentos preenchidos** · 0 ficaram sem filial
- [x] Snapshot dos 3 relatórios × 3 clínicas × por filial, **antes e depois**
- [x] `npm run build` ✓ · guarda de tenant 0 ALTO

### Prova de neutralidade

O backfill foi verificado comparando a saída dos relatórios antes e depois, em
**33 combinações** (3 clínicas × 3 relatórios × total e por filial):

```
NUMEROS IDENTICOS em todas as 33 combinacoes

Espaço Singular / atendimentos
  antes : 12 linhas  Bragança=11 Vargem=1  valor 993,14
  depois: 12 linhas  Bragança=11 Vargem=1  valor 993,14
```

A **única** diferença foi um aviso desaparecer em cada relatório — justamente o
"X de Y agendamentos não têm filial carimbada; para eles a filial foi derivada
da sala". Era o aviso sobre a lacuna que o backfill fechou.

Isso era esperado por construção: a precedência dos relatórios é
`carimbo ▸ sala`, e o backfill gravou exatamente `sala.filialId`. Os filtros da
agenda e do check-in não leem esse campo (ainda usam o perfil do profissional),
então não mudaram — é a Fase 3 que os move.

### Distribuição gravada

```
Bragança 605 · Extrema 347 · Única 140 · Filial Bragança 99 · Vargem 54

Por status:  AGENDADO 1028 · CANCELADO 118 · ATENDIDO 56 · CONFIRMADO 30
             FALTOU 12 · EM_ATENDIMENTO 1
Por clínica: Espaço Singular 945 · Clinica A 160 · Terceiro 140
Período:     2026-01-22 a 2027-02-01
```

### Contagens (antes → depois)

```
agendamentos         1245 → 1245
  com filial            0 → 1245   (único que mudou, por desenho)
  sem filial         1245 → 0
pacientes             268 → 268
profissionais          48 → 48
profissionalFilial      7 → 7
salas                  50 → 50
grades                212 → 212
glosas                  4 → 4
regrasRepasse           3 → 3
coerência filial×sala        0 divergências
```

## Fase 3 — Leitores usando `agendamento.filialId` ✅ concluída (10/10/2026)

- [x] `GET /api/agendamentos` — filtro por filial deixa de derivar do perfil do profissional
- [x] `GET /api/agendamentos/check-in` — idem; filial e profissional voltam a ser filtros independentes
- [x] `GET /api/relatorios/[slug]` + `fonte-atendimentos` — aceita lista de filiais
- [x] `GET /api/relatorios/opcoes` — `podeTrocarFilial` passa a considerar vínculo múltiplo
- [x] `GET /api/relatorios/historico-atendimentos` — filtra pela filial gravada, com a sala como rede
- [x] `GET /api/relatorios/ocupacao-profissionais` + `calcularMinutosDisponiveis` — aceitam lista
- [x] `GET /api/salas`, `GET /api/salas/ocupacao`, `GET /api/terapeutas` — escopo multi-filial
- [x] Snapshot de 102 combinações (2 usuários × 4 relatórios × 4 filiais + agenda/check-in/salas/terapeutas), antes e depois
- [x] `next build` ✓ · lint sem aviso · guarda de tenant 0 ALTO

### A correção, medida

```
FILTRO POR FILIAL NA AGENDA
  filial            antigo    novo
  Bragança            944     605
  Extrema               0     286
  Vargem                0      54
  Especialidades        0       0
  TODAS               945     945
```

Antes, filtrar a agenda por Extrema não mostrava nada, porque o filtro perguntava
"quais profissionais pertencem a esta filial" e os 4 que atendem têm todos perfil
em Bragança. Agora pergunta "quais agendamentos são desta filial", que é a
pergunta certa.

### Bug de segurança encontrado pelo snapshot

Ao passar a fonte dos relatórios para lista, `montarWhere` ficou com
`f.filiais && f.filiais.length > 0`. Isso tratou `[]` como "não filtrar":

```
relatorio|naoAdmin|atendimentos|Extrema
   antes : 11 linhas   (via Bragança — o parâmetro era ignorado)
   depois: 12 linhas   (TUDO — o escopo foi ignorado!)
```

Um não-admin de Bragança pedindo "Extrema" passava a ver **mais** do que o escopo
dele. É a terceira vez na sessão que o `[]` ambíguo morde: `intersecaoFilial`
devolve `[]` justamente para dizer "nenhuma filial permitida", e a condição
precisa ser `f.filiais ? ... : ...` (nulo = não filtrar). Corrigido e registrado
em comentário no ponto da decisão.

### Resultado do snapshot depois da correção

```
identicas: 87 | diferentes: 15

ADMIN:                                   NENHUMA diferença
NÃO-ADMIN na própria filial:             IDÊNTICO
NÃO-ADMIN sem filtro:                    IDÊNTICO
NÃO-ADMIN pedindo filial fora do escopo: 15 de 30 mudaram → agora devolve 0
```

As 15 diferenças são todas a mesma coisa e são intencionais: antes, pedir uma
filial fora do escopo devolvia **os dados da própria filial rotulados como a
pedida**; agora devolve zero. A UI nunca oferece essa opção (o `opcoes` filtra a
lista), então só acontece com URL montada à mão.

## Fase 3.1 — Quem vê a agenda dos outros ✅ concluída (11/10/2026)

Não estava no plano original. Apareceu ao medir a Fase 3: o portão da agenda era
`isAdmin`, e **uma secretária não-admin abria a agenda e via vazio** — enquanto o
check-in, que nunca teve essa restrição, mostrava a recepção inteira. As duas
telas da recepção discordavam.

Decisão (11/10/2026): **é permissão, não cargo.** Nova ação RBAC `VIEW_ALL` no
recurso `agenda`, action-key `view_all_schedules`.

- [x] `prisma/seed-rbac.ts` + `src/lib/auth/bootstrap-roles.ts` — ação `VIEW_ALL`
- [x] `src/lib/auth/action-map.ts` — `view_all_schedules`
- [x] `src/components/rbac/permission-matrix.tsx` — checkbox "Ver de todos"
- [x] `GET /api/agendamentos` — portão passa de `isAdmin` para `view_all_schedules`
- [x] `GET /api/agendamentos/check-in` — ganha o MESMO portão (antes mostrava tudo a todos)
- [x] Testes: 13 contra o banco real, com perfil "Recepção" temporário criado e removido

### Comportamento medido

| Perfil | Agenda | Check-in |
|---|---|---|
| ADMIN (`MANAGE`) | 945 — todo o tenant | 12 |
| USER / terapeuta | 591 — **só os dele** | 11 — só os dele |
| Recepção (`VIEW_ALL`) | **605** — todo Bragança, a filial do vínculo | amplia |

O 605 é o resultado que importa: com `VIEW_ALL` a pessoa vê a agenda **toda**,
mas ainda **dentro das filiais do vínculo dela** — não os 945 do admin. Os dois
escopos se compõem.

Também verificado: um terapeuta pedindo `?profissionalId=<outro>` não amplia nada.

### Por que não `tipo_vinculo`

Resolveria hoje e sem mexer no RBAC, mas contraria a regra do próprio projeto
(permissão e vínculo são eixos independentes) e **não expressa um coordenador
clínico que precisa ver os outros**. Cargo não é permissão.

### Nota operacional

`GET /api/agendamentos` exige `view_patients` e o `POST` exige `create_patients`
— o recurso é `pacientes`, não `agenda`. Um perfil de recepção precisa dos dois:
marcar só "Agenda: ver de todos" não basta. Descoberto no teste, registrado em
`.claude/rules/api-patterns.md`.

A linha `VIEW_ALL` na tabela `acao` já existe no banco (o `bootstrap-roles`
cria no login de qualquer forma — é `upsert` aditivo).

## Fase 4 — Validação ✅ concluída (11/10/2026)

- [x] `npm run build` ✓ · `tsc` exit 0
- [x] Lint: só os 10 arquivos com aviso pré-existente, nenhum dos tocados
- [x] Guarda de isolamento de tenant: **0 ALTO**
- [x] Backfill idempotente: 2ª execução encontra 0 para preencher
- [x] `.claude/rules/api-patterns.md` — terceiro eixo (unidade), armadilha `null` x `[]`,
      filial como campo, "ver de todos" é permissão, nota do `view_patients`
- [x] `.claude/rules/multi-tenant.md` — filial é autorização, tenant é isolamento
- [x] `CLAUDE.md` — módulo 26 na tabela

### Contagens finais

```
agendamentos         1246   (1245 + 1 criado por você testando a interface)
  com filial         1246   100%
pacientes             268
profissionais          48
profissionalFilial      7
roles                  20   (perfil de teste criado e removido)
rolePermissao         415   (idêntico antes/depois)
salas                  50
grades                212
glosas                  4
regrasRepasse           4   (3 + 1 criada por você testando)
```

Resíduo dos testes: **0** em todas as tabelas.

## Fase 5 — Grade conferida no servidor (aviso) ✅ concluída (11/10/2026)

A grade era validada **só no formulário**. Demonstrado chamando a API direto:
a Claudia tem grade seg–sex, e um `POST` criou um agendamento de **domingo às
04:00** com status 201. Contraprova no mesmo teste: a validação sala×filial, que
é do servidor, recusou com 400 — ou seja, não era o servidor estar "aberto".

Decisão (11/10/2026): **avisar primeiro, observar, depois decidir se bloqueia.**
Travar agora faria uma importação em uso falhar, e a clínica ainda vai configurar
a grade de vários profissionais.

- [x] `relogioNoFuso` em `@/lib/datas-fuso` — dia da semana e hora no fuso da clínica
- [x] `src/lib/avisos-agendamento.ts` — conferência que avisa, não bloqueia
- [x] `POST /api/agendamentos` e `batch` devolvem `avisos: string[]` no corpo
- [x] `profissionalAtendeNaFilial` removido (ficou coberto pelo módulo novo)
- [x] Testes: 5 do fuso + 14 contra o banco real, baseline 1246 → 1246, resíduo 0

### Os três avisos

| Situação | Aviso |
|---|---|
| Sem grade em nenhuma unidade | "…não tem grade configurada em nenhuma unidade. Foi salvo, mas vale configurar…" |
| Tem grade, mas não nesta filial | "…tem grade em outra unidade, mas não nesta. Foi salvo, mas confira…" |
| Horário fora do bloco | "O horário 04:00 está fora da grade… Foi salvo, mas confira…" |
| Recorrência | "2 de 4 ocorrências estão fora da grade… Foram salvas, mas confira…" |

### O cuidado que não é óbvio

O aviso cita **04:00**, não 07:00. O instante é `2027-06-06T07:00:00Z`, e
`getHours()` no servidor (UTC em produção) daria 07:00 — além de errar o dia da
semana em agendamentos de fim de tarde. `relogioNoFuso` converte antes, e o dia
da semana sai de `Date.UTC` sobre a data já convertida, sem fuso em nenhum passo.

A conferência reusa `foraDaGrade` e `gradeDaFilial` — as **mesmas** funções puras
que o formulário usa. Tela e API não podem divergir na regra.

### Quando virar bloqueio

Trocar o retorno de `avisosDoAgendamento` por um `return 400` na rota. A
conferência já está pronta; só a decisão muda.

### O que fica em aberto

1. ~~A grade nunca foi validada no servidor~~ — **fechado como aviso na Fase 5.**
   Virar bloqueio é uma linha, quando a clínica estiver com as grades em ordem.
2. **A clínica precisa acertar a grade de 4 profissionais** (Elisangela, Tabata e
   Jéssica em Extrema; Claudia em Vargem — 339 agendamentos). Até lá, eles só
   podem ser agendados em Bragança. O formulário diz exatamente o que falta.
3. **Criar o perfil "Recepção"** em Gestão de Permissões, com `agenda`
   (VIEW/CREATE/UPDATE/VIEW_ALL) e `pacientes` (VIEW/CREATE), e atribuí-lo às
   secretárias. Sem isso elas continuam vendo a agenda vazia.
4. **Gabriel Cosmo** não tem grade e por isso não pode ser agendado.
