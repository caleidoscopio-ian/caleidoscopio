---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/page.tsx"
---

# Frontend — React, UI e Acessibilidade

## Stack UI

- **shadcn/ui** (estilo New York) — componentes base em `src/components/ui/`
- **Lucide React** — ícones
- **Tailwind CSS v4** — estilização
- **React Hook Form + Zod** — formulários e validação
- **Sonner** — toast notifications
- **date-fns** — manipulação de datas

## Estrutura de Componentes

```
src/components/
├── ui/              # shadcn/ui base (NÃO editar manualmente, usar `npx shadcn add`)
├── forms/           # Formulários de CRUD (novo-*, editar-*, excluir-*)
├── [módulo]/        # Componentes por feature (atividades/, curriculum/, avaliacoes/)
├── main-layout.tsx  # Layout principal
└── app-sidebar.tsx  # Sidebar com navegação role-based
```

## Padrões de Página

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MainLayout } from '@/components/main-layout';

export default function NomePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        {/* conteúdo */}
      </MainLayout>
    </ProtectedRoute>
  );
}
```

## Navegação

- Sidebar role-based definida em `src/lib/navigation.ts`
- Função `getSidebarItems(userRole)` retorna items por role
- Roles: patient, therapist, guardian, admin, super_admin

## Acessibilidade (WCAG 2.1 AA)

- Todos elementos interativos acessíveis via teclado
- ARIA labels para screen readers
- Contraste de cor > 4.5:1
- Indicadores de foco visíveis
- Respeitar prefers-reduced-motion

## Considerações TEA

- UI simples e clara, sem elementos que sobrecarreguem
- Padrões de navegação consistentes
- Indicadores visuais de progresso
- Níveis de dificuldade customizáveis
- Mecanismos de reforço positivo

## Formulários

- Sempre usar React Hook Form com resolver Zod
- Validação no client E no server (API route)
- Feedback visual de erros inline
- Loading states durante submissão

## Relatórios — não escrever tela nova

A Central de Relatórios (`/relatorios`) é dirigida por catálogo. Um relatório é
uma **declaração** em `@/lib/relatorios/definicoes`, não uma página:

```typescript
{
  slug: 'atendimentos',
  recurso: 'relatorios',          // RBAC: slug do seed
  acaoVisualizar: 'view_reports', // RBAC: action-key
  fonte: 'atendimentos',          // de onde vêm as linhas
  dimensoes: [...],               // o que dá para agrupar
  metricas: [...],                // o que dá para somar
  filtros: ['periodo', 'filialId', ...],
  agrupamentoPadrao: ['filial', 'especialidade'],
}
```

Quem renderiza é `src/app/relatorios/[slug]/page.tsx`, e quem responde é
`GET /api/relatorios/[slug]`. O índice se monta a partir do catálogo e esconde
os cartões cujo `recurso` o usuário não pode ver.

**Relatório novo = entrada no catálogo.** Criar página só se a tela não couber na
casca (filtros + agrupamento em até 3 níveis + tabela com subtotais). Relatório
que já existe fora da central entra com `fonte: 'externo'` e `hrefExterno` — o
catálogo indexa, não reimplementa.

Peças reaproveitáveis: `BarraFiltros`, `SeletorAgrupamento`, `TabelaAgrupada`
(em `@/components/relatorios`) e `formatarMetrica` (`@/lib/relatorios/formatacao`).

### Métrica derivada: dividir depois de somar

Métrica de razão (ticket médio) se declara com `agregacao: 'razao'` + `numerador`
e `denominador`, e o motor recalcula em **cada nível**. Somar os ticket-médios
dos filhos daria média de médias — errado sempre que os grupos têm tamanhos
diferentes (num caso real: R$ 258,34 em vez de R$ 150,00).

### `null` não é zero

Atendimento sem preço cadastrado grava `valor_cobrado = null` de propósito (não
trava o fluxo da recepção). Então **toda célula de relatório distingue "—" de
"R$ 0,00"**: um grupo em que nenhuma linha tem valor devolve `null`, e o campo
`semValor` conta quantas linhas ficaram fora do número, exibido como aviso.

### Gráfico: uma métrica, cores em ordem fixa

`GraficoRelatorio` plota **uma métrica por vez**. "Atendimentos" e "Valor total"
têm escalas diferentes; juntá-los exigiria dois eixos y, e aí a comparação visual
passa a depender de onde cada eixo foi ancorado. Quem quer outra métrica troca no
seletor — nunca adicionar um segundo eixo.

A paleta tem **6 slots em ordem fixa** (`--viz-serie-1..6` em `globals.css`), com
passos próprios para claro e escuro. **A ordem é o mecanismo de segurança para
daltonismo**, não escolha estética: foi validada com o validador da skill
`dataviz` contra as superfícies reais do projeto. Do 7º grupo em diante, agrupar
em "Outros" — nunca gerar cor nova nem ciclar a paleta.

Outras regras que valem para qualquer gráfico aqui:

- Empilhamento e pizza **só para métrica somável**. Fatiar uma razão (ticket
  médio, % de repasse) não significa nada.
- Grupo com valor nulo **sai do gráfico** e é contado numa nota. Barra zerada
  afirmaria algo que o dado não diz.
- Barra com no máximo 24px, ponta arredondada só no topo, vão de 2px na cor da
  superfície entre segmentos, grade só horizontal e hairline.
- Legenda a partir de 2 séries; série única não tem legenda (o título já diz).
- O gráfico entra por `next/dynamic` — o recharts pesa ~130 kB e só serve quando
  há gráfico na tela.

### Eixo do gráfico: evolução ou consolidado

O gráfico tem dois eixos x possíveis, escolhidos em Preferências (`eixo`):

- **`"tempo"` (padrão)** — uma barra por dia, semana ou mês. Pedir "últimos 3
  meses" rende 3 barras, não uma.
- **`"grupo"`** — o período inteiro somado, uma barra por grupo do primeiro
  nível. É o comportamento antigo.

A tabela **sempre** mostra o consolidado; o eixo só muda o gráfico.

A série vem pronta da API (`resultado.serie`), com a **mesma forma** de
`grupos` — por isso o componente só troca a fonte (`const fonte = noTempo ?
serie : grupos`) e nada mais abaixo precisa saber qual é qual.

O **passo** da série (`granularidade`) é escolha do usuário: Automático, Dia,
Semana ou Mês, em Preferências. "Automático" é a ausência de escolha, resolvida
no servidor — **até 30 dias corridos → dia, acima → mês**. Só dois degraus de
propósito: o padrão existe para a primeira abertura ficar legível, não para
adivinhar a intenção.

A escolha sai como `?granularidade=` e **custa uma consulta nova** (a série é
agregada no servidor). Devolver os três passos de uma vez evitaria o ida-e-volta,
mas um ano em passo diário são 365 grupos com subgrupos — payload grande para uma
preferência que quase ninguém troca. Valor desconhecido no parâmetro cai no
automático em vez de 400: a série que volta é correta e vem rotulada com o passo
real, e recusar quebraria o relatório por causa de uma preferência velha no
`localStorage`.

### Intervalo sem movimento entra zerado

`preencherLacunas` (`@/lib/relatorios/serie`) percorre o período inteiro e
completa o que a agregação não conhece — ela só vê intervalos que têm linha. Sem
isso todo fim de semana virava buraco no passo diário, e a distância entre as
barras deixava de significar tempo.

Parece contradizer "null não é zero", mas são casos diferentes:

| Situação | Célula |
|---|---|
| atendimento **sem preço** cadastrado | `null` → "—" (não sabemos quanto foi) |
| intervalo **sem atendimento** | `0` (não houve nada para cobrar) |

No primeiro falta dado; no segundo o dado existe e vale zero. Razão (ticket
médio) de intervalo vazio continua `null` — sem denominador não há média.

No eixo de tempo o empilhamento usa o **primeiro** nível do agrupamento (a API
monta a série como `[tempo, agrupamento[0]]`), não o segundo. E **pizza vira
barras**: fatiar o tempo responderia "qual fatia do período foi setembro", que
não é pergunta de composição.

Dimensão de tempo ordena **cronologicamente**, não alfabeticamente — daí
`Dimensao.cronologica`, que ordena pela chave crua (`2026-09`) em vez do rótulo
(`set/2026`, que colocava "out" antes de "set"). A ordenação vale também para a
tabela agrupada por Mês.

### Preferências de relatório

`usePreferenciasRelatorio` guarda colunas, agrupamento, tipo de gráfico e eixo em
`localStorage`, **com o id do usuário na chave** (computador de recepção é
compartilhado). O que vem do storage é sempre validado contra o catálogo atual
antes de ser usado: métrica renomeada ou dimensão removida é descartada, em vez
de deixar a tabela sem coluna nenhuma.

### Exportação

Sai do resultado **já carregado na tela**, não de uma nova consulta — assim o
arquivo e a tela não podem divergir. No CSV a hierarquia é dado (colunas de nível
preenchidas em cascata), não indentação, para a planilha conseguir filtrar;
vírgula decimal e BOM UTF-8 por causa do Excel pt-BR; e `null` vira célula vazia,
nunca zero.

## Filtro: controle discreto aplica na hora

Botão de período rápido ("7 dias", "30 dias", "Mês atual") e dropdown
(profissional, filial) **consultam no clique**. Guardar a escolha em estado e
esperar um "Filtrar" fazia a tela mostrar 30 dias depois de a pessoa pedir 7 —
e ninguém adivinha que o clique seguinte é obrigatório.

A exceção é o **intervalo customizado**: são dois campos, e consultar no meio da
escolha mostraria um período que ninguém pediu. Esse continua esperando o botão,
que também serve de recarregar. A Central de Relatórios segue a mesma lógica —
lá o período é sempre par de datas, então todo filtro espera o Aplicar.

## Taxa de ocupação — tabela e KPI do mesmo universo

`/taxa-ocupacao` mostra **apenas quem tem horário disponível no período
selecionado** (`minutos_disponiveis > 0`), e os KPIs somam exatamente as linhas
da tabela. O corte não é "tem grade cadastrada": pega também quem configurou a
grade mas não atende nos dias escolhidos (grade só de sábado num período de seg
a sex) e quem atende só em outra unidade quando há filtro de filial. Sem
denominador não existe taxa, e a linha só diria "—" em toda coluna.

Quem fica fora **não desaparece calado**: `resumo.profissionais_sem_grade` e
`resumo.agendamentos_fora` alimentam uma nota sob a tabela ("2 profissionais sem
grade nos dias selecionados não aparecem (3 agendamentos fora dos números
acima)"). KPI e tabela contando universos diferentes era a inconsistência
original da tela.

## Grade — um editor, duas grades, três telas

`GradeEditor` (`@/components/ocupacao-prof/grade-editor`) é a **única** tela de
grade semanal. Quem chama passa o endpoint; ele carrega, edita e salva:

```tsx
<GradeEditor endpoint={`/api/terapeutas/${id}/grade`} onSaved={recarregar} />
<GradeEditor endpoint={`/api/salas/${id}/grade`} ativo={open}
             permissao={{ recurso: "salas", acao: "MANAGE" }} />
```

Atende duas perguntas diferentes com a mesma tela:

| Grade | Responde | Rota |
|---|---|---|
| profissional | quando ele **atende** | `/api/terapeutas/[id]/grade` |
| sala | quando ela **funciona** | `/api/salas/[id]/grade` |

Aparece em modal (taxa de ocupação, salas) e em aba (ficha do profissional).
Duplicar a tela faria as duas divergirem, e **a filial escolhida no bloco é a
que alimenta o campo de filial do agendamento**: divergir aí sai caro.

O campo de filial aparece **só quando a resposta traz `filiais`** — a grade da
sala não tem esse campo, porque a sala já pertence a uma filial. Não é `if` de
tipo de recurso: o editor reage ao que a rota devolve.

## Capacidade de sala no mapa de ocupação

A aba **Dashboard** é a primeira de `/salas/mapa-ocupacao`: a tela abre na
pergunta de gestão, não na operação do dia.

O bloco `CapacidadeSalas` quebra o horário de cada sala em três parcelas que
somam a capacidade — **agendado**, **livre com profissional** (falta agendar) e
**livre sem profissional** (cabe contratar). Empilhar as três num gráfico é
legítimo porque são minutos e fecham a soma; a ordem das cores segue a paleta
validada (`--viz-serie-*`), como em qualquer gráfico aqui.

Logo abaixo vem o **teto vendável**, que é um número de natureza diferente e por
isso fica em cartão separado, com a explicação ao lado: as parcelas por sala
tratam cada sala isoladamente, então a hora livre de um profissional aparece em
todas as salas abertas. O teto aplica `mín(salas abertas, profissionais
escalados)` por unidade e responde "quanto ainda posso vender" — na Clinica A a
sobra caiu de 152,5h para 72,8h. **Não misturar os dois na mesma soma nem no
mesmo gráfico**: um é capacidade física por sala, o outro é limite da unidade.

> A "Taxa de ocupação" desse dashboard era calculada contra um denominador
> chutado: `(21h − 7h) × todos os dias do período × nº de salas`, isto é, toda
> sala aberta 14h por dia **inclusive sábado e domingo**. Agora vem de
> `/api/salas/capacidade`, contra o horário cadastrado. Nenhum número de
> ocupação deve usar janela fixa de novo.

Duas coisas que o editor resolve e que não são óbvias:

- **O dropdown de filial vem da rota da grade**, não do seletor global de
  filiais: são as unidades do vínculo do profissional (detalhes em
  `api-patterns.md`). Filial fora do vínculo que já está num bloco aparece
  marcada "(fora do vínculo)" em vez de desaparecer.
- **Quem só tem `agenda: VIEW` vê a grade em modo leitura** (`usePermissions`),
  sem botões de edição. O `PUT` exige `edit_schedule` de todo jeito; a tela
  apenas não oferece o que daria 403.

> Campo `salas_acesso` ("Salas de Acesso") **saiu da interface inteira** —
> criação, edição e as duas telas de detalhe. Nunca foi usado (0 de 57 registros
> preenchidos) e as salas oferecidas eram uma lista fixa escrita no arquivo
> (`sala-1`, `consultorio-2`…), não as salas do banco: ninguém conseguiria
> associar uma sala real por ali.
>
> O campo continua no schema e na API (nada foi apagado do banco), e os tipos do
> front que espelham a resposta ainda o declaram. Quem for mexer em acesso a
> sala começa do zero com as salas reais — não reaproveitar este campo.

## Convênio do atendimento — só os do paciente

O dropdown de Convênio no agendamento oferece **"Particular" + os convênios do
próprio paciente**, nunca a lista inteira da clínica.

Oferecer todos permitia marcar um atendimento num convênio que o paciente não
tem — e aconteceu: um paciente da unimed foi marcado como HAPVIDA. Como o
agendamento **não guarda** o convênio escolhido, tudo a jusante relê
`paciente.convenioId` (unimed), o preço era procurado na tabela da unimed (que
não tem aquele procedimento) e o relatório mostrava unimed como parceiro. Um
erro de digitação virava dois sintomas sem explicação.

A lista vem de `PacienteConvenio` (N:M) **com fallback para o campo legado
`paciente.convenioId`** — há pacientes com só o legado preenchido, e sem o
fallback eles ficariam restritos a Particular.

```typescript
const daTabela = pac.convenios?.map(...) ?? [];
const legado = pac.convenioId && !daTabela.some(c => c.id === pac.convenioId)
  ? [{ id: pac.convenioId, nome: ... }] : [];
const conveniosDoPaciente = [...daTabela, ...legado];
```

Pré-seleção: um convênio só é pré-selecionado quando o paciente tem **exatamente
um**. Com dois, a escolha é do atendimento e precisa ser explícita.

**Consequência desejada**: a restrição não esconde cadastro errado, ela o expõe.
Se o paciente está registrado num convênio cujo procedimento não tem preço, o
relatório mostra "sem valor" — e aí a correção é no cadastro (`/pacientes` ou
`/convenios`), não na marcação.

> O agendamento ainda não guarda o convênio escolhido. Com até um convênio por
> paciente a derivação atual está correta (`valor_particular` preenchido ⇒
> particular; senão ⇒ o convênio do paciente). Paciente com **dois** convênios
> torna isso ambíguo e exigirá `agendamento.convenioId` — o modelo já suporta
> via `PacienteConvenio`, nenhum paciente está nessa situação hoje.
