# Plano: Módulo 26 — Filial no Agendamento

> **Status**: Planejado — aguardando aprovação
> **Origem**: investigação do Módulo 25 revelou que agenda e relatórios respondem
> coisas diferentes para "de qual filial é este agendamento".

## O problema medido

O agendamento **não tem dono**: nenhum campo diz a qual unidade ele pertence.
Cada parte do sistema inventou a sua resposta, e as duas estão em uso:

```
AGENDAMENTOS (945) por filial

pela SALA  — o que os RELATÓRIOS usam:
   Bragança 605 · Extrema 286 · Vargem 54

pelo PERFIL do profissional — o que a AGENDA usa (resolverProfissionalIdsDaFilial):
   Bragança 944
```

**339 de 945 divergem (36%)**, porque os 4 profissionais que atendem têm todos
`UsuarioRole.filialId = Bragança` mas trabalham em três unidades:

| Profissional | Sala | Perfil | Qtd |
|---|---|---|---|
| Elisangela Da Silva Lima Neves | Extrema | Bragança | 137 |
| Tabata Vieira Bezerra | Extrema | Bragança | 122 |
| Claudia Sciola De Lima Sanchez | Vargem | Bragança | 53 |
| Jéssica Cristina Sanchez De Oliveira | Extrema | Bragança | 27 |

Consequência hoje: **filtrar a agenda por "Extrema" não mostra quase nada**,
enquanto o relatório filtrado por Extrema mostra 286. É a causa de raiz do bug
"escolho a filial e não aparece nenhum profissional".

Também encontrado: o `POST /api/agendamentos` valida apenas que a sala pertence
ao **tenant** — não valida filial nenhuma. Há um comentário no código afirmando
que "um profissional não pode, na criação, usar sala de outra filial", e isso
**não é verdade**. A restrição só existe nos dropdowns.

## Decisão de arquitetura

Quatro conceitos distintos, cada um com um único lar:

| Conceito | Onde mora | Responde |
|---|---|---|
| Unidades em que a **pessoa** trabalha | `ProfissionalFilial` (N:N, flag `principal`) | Onde ela pode operar |
| Unidades e horários em que o **clínico** atende | `GradeAtendimento.filialId` | Oferta de horário por unidade |
| Unidade do **atendimento** | `agendamento.filialId` | **Autoritativo** — onde aconteceu |
| Unidade da **sala** | `Sala.filialId` | Localização física; valida o agendamento |

`UsuarioRole.filialId` deixa de ser fonte de verdade e passa a ser
**compatibilidade** (unidade única legada, usada como fallback).

### Por que a grade, e não `ProfissionalFilial`, define onde o clínico atende

`GradeAtendimento.filialId` **já está preenchida**: 22 profissionais, 180 blocos,
4 unidades — e **7 profissionais já configurados em mais de uma**:

```
Ana Paula Borges Da Silva            Extrema + Vargem
Caroline Silva De Souza Oliveira     Extrema + QUALQUER FILIAL
João Vitor Murador Alves             Vargem + Extrema + Especialidades
Laura Ramalho Marques                Extrema + QUALQUER FILIAL
Lucas Rafael De Oliveira Strato      Vargem + QUALQUER FILIAL
Milene Caroline A. Couto De Morais   Vargem + Extrema
Silvio Adão De Oliveira Junior       Vargem + Extrema
```

`ProfissionalFilial` tem **0 linhas**. Usá-la para o clínico seria um segundo
cadastro dizendo o que a grade já diz — e alguém teria que preenchê-lo à mão.
A grade é mais precisa: diz *onde* **e** *quando*.

`ProfissionalFilial` fica com o que só ela resolve: **a pessoa administrativa**
(secretária, financeiro) vinculada a várias unidades. Ela não tem grade.

### Regra do dropdown de filial

```
filiais ofertadas = filiais da GRADE do profissional  ∩  filiais do USUÁRIO logado
```

- Bloco de grade com `filialId = null` ("qualquer filial") conta como **todas**.
- **Usuário sem vínculo em `ProfissionalFilial`** → sem restrição de filial. Isso
  preserva exatamente o comportamento atual (`UsuarioRole.filialId = null` já
  significa "sem restrição") e faz a restrição ser **opt-in** conforme a clínica
  cadastra os vínculos. Ninguém fica travado no deploy.
- Admin → todas as filiais do tenant.
- Filial sem sala ativa aparece no dropdown com aviso, mas o agendamento não
  conclui (decisão do usuário: "Especialidades" é unidade real, falta cadastrar sala).

### Ordem de preenchimento do formulário

```
profissional  →  filial  →  sala
                   ↓
            horários da grade daquela filial
```

Trocar o profissional reseta filial e sala. Trocar a filial reseta a sala. Assim
`agendamento.filialId` e `sala.filialId` **não podem divergir**.

---

## Fases

### Fase 0 — Pessoa vinculada a várias filiais (sem alteração de schema)

`ProfissionalFilial` já existe com a chave composta e a flag `principal`. Nada a
criar no banco.

| Arquivo | Mudança |
|---|---|
| `src/lib/filial-pessoa.ts` **(novo)** | `filiaisDoUsuario(tenantId, usuarioId)`: `ProfissionalFilial` ▸ `UsuarioRole.filialId` ▸ `[]` (= sem restrição) |
| `src/lib/filial-profissionais.ts` | `resolverProfissionalIdsDaFilial` passa a aceitar **lista** de filiais (assinatura atual mantida por compat) |
| `src/app/api/usuario-roles/route.ts` | `PATCH` aceita `filialIds: string[]`; grava `ProfissionalFilial` e mantém `UsuarioRole.filialId` com a principal (compat) |
| `src/app/usuarios/page.tsx` | Seletor de filial vira **multi-select** com marcação de principal |
| **Migração de dados** | Os `UsuarioRole.filialId` já existentes (4) viram linhas em `ProfissionalFilial` com `principal: true`. **Aditivo** — o campo antigo não é apagado |

RBAC: `manage_permissions` (já usado pelo `PATCH`). Nenhum recurso novo.

### Fase 1 — Filial escolhida no agendamento

| Arquivo | Mudança |
|---|---|
| `src/app/api/terapeutas/[id]/filiais/route.ts` **(novo)** | Filiais da grade do profissional ∩ filiais do usuário, cada uma com `temSalaAtiva` e `blocosNaGrade` |
| `src/components/forms/novo-agendamento-form.tsx` | Campo `filialId` entre profissional e sala; resets em cascata; grade filtrada pela filial; mensagem nomeando o que falta quando não há opção |
| `src/app/agenda/page.tsx` | Passa as salas já filtradas pela filial escolhida no formulário (hoje filtra pela filial do cabeçalho) |
| `src/app/api/agendamentos/route.ts` (POST) | Aceita `filialId`; **valida** `sala.filialId === filialId`; 400 com mensagem clara se divergir |
| `src/app/api/agendamentos/[id]/route.ts` (PUT) | Mesma validação; recarimba ao trocar filial/sala |
| `src/app/api/agendamentos/batch/route.ts` | Propaga a filial para toda a série |
| `src/lib/carimbo-agendamento.ts` | **Corrige o defeito da Fase 0 do Módulo 25**: o carimbo passa a gravar a filial **escolhida** (coerente com a sala), não a do perfil do profissional |

### Fase 2 — Backfill dos 945

`agendamento.filialId` ← `sala.filialId`, para os registros com carimbo nulo
(hoje: todos os 945). Nenhum registro é alterado em outro campo. Contagem antes
e depois, igual às fases anteriores.

Os 945 já têm sala com filial definida (**0 sem**), então o backfill cobre 100%.

### Fase 3 — Leitores passam a usar `agendamento.filialId`

| Arquivo | Mudança |
|---|---|
| `src/app/api/agendamentos/route.ts` (GET) | Filtro por filial deixa de ser `resolverProfissionalIdsDaFilial` e passa a ser `filialId` do agendamento |
| `src/app/api/agendamentos/check-in/route.ts` | Idem |
| `src/lib/relatorios/fonte-atendimentos.ts` | Precedência passa a `carimbo ▸ sala` (hoje é `carimbo do profissional ▸ sala`) |
| `src/app/api/salas/ocupacao/route.ts` | Conferir se o escopo de filial continua coerente |

**Resultado**: agenda, check-in e relatórios param de divergir — por construção,
não por coincidência.

### Fase 4 — Validação

- `npm run build`, `tsc`, lint
- `npm run verificar:tenant` (0 ALTO)
- Testes contra o banco: dropdown de filial por profissional, validação
  sala×filial, backfill com contagem, e a prova de que agenda e relatório passam
  a dar o mesmo número por filial

---

## Riscos e o que foi decidido

| Risco | Decisão |
|---|---|
| 4 profissionais têm grade só em Bragança mas atendem em Extrema/Vargem (339 agendamentos) | **A clínica acerta a grade manualmente.** Até lá eles só podem ser agendados em Bragança. Mitigação: a mensagem do formulário nomeia o profissional e a unidade que falta, com link para a Grade de Horários |
| Filial "Especialidades" sem sala cadastrada | **É unidade real.** Aparece no dropdown; o campo de sala mostra que a unidade ainda não tem salas |
| Nenhum usuário tem vínculo multi-filial hoje (0 linhas) | Ausência de vínculo = **sem restrição**, igual ao comportamento atual. A restrição vira opt-in |
| Backfill alterar dado | Só preenche coluna nula; contagem antes/depois em todas as tabelas tocadas |
| Agenda mudar de comportamento no deploy | A Fase 3 é a que muda o filtro da agenda. Hoje ele mostra 944 em Bragança; depois mostra a distribuição real (605/286/54). **É a correção, mas é uma mudança visível** — vale avisar a clínica |

## Fora de escopo

- Alterar grades de atendimento (decisão: a clínica faz)
- Taxa de ocupação e mapa de ocupação de salas (decisão: ficam como estão)
- Tornar `agendamento.filialId` obrigatório no schema — fica nullable, porque
  tornar `NOT NULL` exige que todo registro tenha valor e isso é irreversível

## Atualização de arquitetura (ao implementar)

- `CLAUDE.md` → tabela "Módulos do Sistema", linha 26
- `.claude/rules/api-patterns.md` → a seção "Permissão x vínculo" precisa de um
  terceiro eixo: **unidade** (`ProfissionalFilial` = onde opera, `GradeAtendimento`
  = onde e quando atende, `agendamento.filialId` = onde aconteceu)
- `.claude/rules/multi-tenant.md` → filial não é tenant; registrar que o escopo
  de filial é autorização, não isolamento
- `.claude/plans/MODULO-26-PROGRESS.md` → criar ao iniciar
