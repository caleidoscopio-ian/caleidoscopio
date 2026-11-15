---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/page.tsx"
---

# Frontend — React, UI e Acessibilidade

## Stack UI

- **Design system v2** — tokens em `src/styles/`, kit em `src/components/kit/`
- **shadcn/ui** (estilo New York) — componentes base em `src/components/ui/`
- **Lucide React** — ícones
- **Tailwind CSS v4** — estilização
- **next-themes** — modo noite (classe `.dark` no html)
- **React Hook Form + Zod** — formulários e validação
- **Sonner** — toast notifications
- **date-fns** — manipulação de datas

## Design system v2 — nada de cor crua

A identidade visual vem do Caleidoscópio v2 e mora em três camadas:

| Camada | Arquivo | Editar? |
|---|---|---|
| Tokens | `src/styles/tokens-v2.css` | **não** — é gerado de `design/origem/v2-producao.css` |
| Divergências | `src/styles/tokens-ajustes.css` | sim, com o motivo escrito |
| Ponte e base | `src/app/globals.css` | sim |

**Toda cor sai de token.** `text-gray-600`, `bg-blue-50` e `text-red-500` foram
migrados (965 trocas em 108 arquivos) e não devem voltar: além de não
acompanharem a paleta, eles **não trocam no modo noite** — `bg-white` continua
branco no escuro. Use:

| Em vez de | Use |
|---|---|
| `text-gray-900/800` · `bg-white` | `text-ink` · `bg-surface` |
| `text-gray-600` · `text-gray-500` | `text-ink-2` · `text-ink-3` |
| `bg-gray-50/100` | `bg-surface-sunken` · `bg-surface-muted` |
| `text-blue-600` · `bg-blue-600` | `text-brand` · `bg-brand` |
| `text-green-*` · `bg-green-50` | `text-success-ink` · `bg-success-soft` |
| `text-red-*` · `bg-red-50` | `text-danger-ink` · `bg-danger-soft` |
| `text-amber-*` | `text-warning-ink` |
| `border-gray-200` | `border-hairline` (divisória) · `border-rim` (borda de cartão) |

`tools/migrar-cores-v2.mjs` faz a troca em lote (simula por padrão) se aparecer
código novo com cor crua.

### Texto de status usa `-ink`, preenchimento usa a cor

O v2 usa o mesmo token para preencher (ícone, ponto, gráfico) e para texto
sobre o fundo `-soft`. Como texto isso reprova no contraste — 2.47:1 no
`warning`, onde o mínimo é 4.5:1. Aqui existe `--success-ink`, `--warning-ink`
e `--danger-ink`, escurecidos só o suficiente para passar. **Texto sempre no
`-ink`; fundo e ícone na cor cheia.**

### Kit v2 x shadcn

`@/components/kit` é a camada de identidade: `ActionButton`, `IconButton`,
`Panel`, `StatCard`, `StatusPill`, `IconTile`, `PersonAvatar`, `SearchField`,
`Segmented`, `PageHeader`, `Trilha`. `@/components/ui` (shadcn) continua servindo
formulário, tabela e diálogo — e foi **ajustado** para a linguagem do v2
(pílula, raio 28px no `Card`, foco em `brand-ring`).

> Re-adicionar um componente com `npx shadcn add` apaga esse ajuste. Os
> arquivos tocados têm aviso no topo; comparar com o git antes de aceitar a
> versão nova.

Tela nova começa com `PageHeader`, ritmo vertical `space-y-7`, conteúdo em
`Panel`, KPI em `StatCard` (`grid gap-4 sm:grid-cols-2 xl:grid-cols-4`) e no
máximo **um** `Panel variant="night"` por tela.

`/design-system` é o guia visual vivo: paleta, os 17 papéis tipográficos e cada
peça do kit, nos dois temas. Abrir lá antes de inventar componente.

### Cabeçalho: uma peça, quatro formas

Antes do kit, o botão "Voltar" aparecia em três posições diferentes e o badge
de status em duas. `PageHeader` cobre as quatro formas que as 57 telas usam:

| Prop | Para quê |
|---|---|
| `titulo` + `subtitulo` + `acoes` | listagem |
| `icone` | tela com identidade própria (chip `brand-soft`) |
| `voltar={{ href }}` ou `{{ onClick }}` | detalhe — seta, não migalha |
| `meta` | linha de badges sob o título (status, vínculo, código, CNPJ) |
| `avatar` | peça **sem** moldura: avatar de pessoa, chip na cor do procedimento |

`avatar` tem precedência sobre `icone`: quando a cor é dado (a cor do
procedimento, do pacote), o fundo da marca a falsificaria.

### Painel ou indicador

A escolha não é de forma, é de intenção — e o codemod não sabe distinguir:

- **`Panel`** quando o conteúdo é o assunto: formulário, tabela, gráfico, lista.
  Cabeçalho com `icone` em chip de 40px e título de 1.3rem.
- **`StatCard`** quando o número é o assunto. `size="sm"` (152px) nas fileiras
  de 3 a 6 colunas; o tamanho cheio (208px) é só a fileira de quatro do
  dashboard.

**Gradiente pastel é o padrão, não a exceção.** Conferido no clone navegável
do v2: a fileira pastel aparece em toda tela de listagem, não só no dashboard.

| nº de cartões | grade | tons | tamanho |
|---|---|---|---|
| 4 | `sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]` | blue · lavender · mint · peach | 1º `hero`, resto `md` |
| 3 | `sm:grid-cols-3` | blue · mint · peach | `md` |
| 5+ | a grade da tela | ciclo dos quatro | `sm` |

O destaque do primeiro cartão vem do **grid** (`1.25fr`), não só do corpo da
fonte — sem isso a fileira fica parecida com a do v2 em tudo menos na
proporção. `tools/tonalizar-kpi-v2.mjs` aplica isso em lote.

> Esta regra **substituiu** a anterior ("pastel só no dashboard"), que vinha de
> uma leitura minha sobre sobrecarga visual em TEA. O sistema é operado pela
> clínica, não pelo paciente; a decisão é fidelidade ao v2.

**A cor vive onde significa.** Limiar (ocupação acima de 100%, taxa de glosa)
vai no número, como `<span>` dentro de `valor` — a classe do filho vence a do
`StatCard`. Categoria (confirmado, falta, cancelado) vai no ícone:
`icone={<Clock className="text-success-ink" />}`.

### Trilha (migalhas) em toda tela

`PageHeader` renderiza a trilha sozinho. Precedência:

1. `migalhas` passado ao próprio `PageHeader`;
2. `breadcrumbs` passado ao `MainLayout` (o que as páginas já faziam);
3. **derivado da rota**, com os rótulos de `@/lib/navigation`.

Por isso nenhuma tela precisa de edição para ganhar trilha. Segmento que é id
(cuid/uuid) é descartado — "Paciente › cmo0h6yky0001" não orienta ninguém, e o
título da tela já diz de quem é a ficha.

`semTrilha` só na tela que não tem pai (dashboard, login). No v2 a trilha
aparece em 9 das 31 telas, porque lá cada página decide; aqui é padrão, porque
trilha que some em metade do produto faz o título saltar 20px entre telas.

### Casca: as medidas que vieram do clone

| Peça | Classe |
|---|---|
| invólucro | `min-h-dvh p-3 md:p-4` → `flex gap-3 md:gap-4` |
| sidebar | 264px (88px recolhida), `glass sticky top-4 rounded-[1.75rem]` |
| main | `rounded-[1.75rem] md:rounded-[2rem] bg-panel/80 backdrop-blur-xl` |
| conteúdo | `mx-auto w-full max-w-[1480px] px-4 py-5 md:px-7 md:py-6` |
| abaixo da topbar | `mt-6 md:mt-7` → `space-y-7` |

O `max-w-[1480px]` é o que impede a tabela de esticar até a borda em monitor
largo. Era a maior diferença estrutural que faltava.

`CascaV2` (`@/components/shell/casca`) é a composição **sem** o
`ProtectedRoute`; `MainLayout` é a casca mais a proteção. A separação existe
para `/design-system` mostrar a casca de verdade sem o Sistema 1 no ar — cópia
divergiria na primeira mudança.

O botão de recolher fica na topbar e guarda a escolha em `localStorage`. Com
88px saem os rótulos, os de seção e o seletor de filial (um gatilho sem rótulo
não diz qual unidade está ativa, que é a única coisa que ele faz).

### Painel: o recuo é do corpo, não da moldura

`Panel` não tem padding na `section`; quem tem é o cabeçalho (`px-5 pt-5
md:px-6 md:pt-6`) e o corpo (`p-5 md:p-6`). É isso que permite `semPadding`
numa tabela ou gráfico que precisa encostar na borda, sem perder o recuo do
cabeçalho.

### Marca: ícone do navegador e tela de espera

Os dois saem dos mesmos arquivos de `public/` e são gerados por
`node tools/gerar-icones.mjs` — rodar de novo quando a marca mudar.

| Peça | Arquivo |
|---|---|
| aba do navegador (claro) | `public/icon.png` |
| aba do navegador (escuro) | `public/icon-dark.png` |
| atalho no iPhone | `public/apple-icon.png` (fundo branco: o iOS pinta o vazio de preto) |
| pedido direto do navegador | `src/app/favicon.ico` (16/32/48) |
| tela de espera | `PageLoader`, com `caleido_logox.png` / `_dark.png` |

Dois detalhes que custaram tentativa:

- **Declarar `icons` no `metadata` substitui as tags da convenção de arquivo.**
  Misturar os dois mecanismos fez o `apple-touch-icon` sumir. Ou tudo no
  metadata (é o caso aqui, porque a versão de aba escura precisa de `media`),
  ou tudo em `src/app`.
- **O símbolo tem duas cores por tema.** O azul-marinho some em aba escura;
  por isso existe a versão clara com `media="(prefers-color-scheme: dark)"`.

`PageLoader` é a **única** tela de espera de página — o `ProtectedRoute` usa
a mesma peça com `telaCheia`. Antes eram dois desenhos e nenhum era a marca:
um quadrado com a letra "C" e um quadradinho azul com um ponto branco.

### Estado vazio e espera: uma peça, não um cartão

`EstadoVazio` e `Carregando` (`@/components/kit`). Antes cada tela inventava:
`Card` com texto cinza no meio, `div.text-center.py-8`, ou um spinner solto.

```tsx
{carregando ? <Carregando texto="Carregando anamneses..." />
 : lista.length === 0 ? <EstadoVazio icone={<FileText />} titulo="Nenhuma anamnese" texto="…" />
 : <ol>…</ol>}
```

**Cartão vazio dentro de painel é moldura dupla** — por isso a peça não tem
fundo nem borda: quem desenha a caixa é o `Panel` em volta.

### Data sem hora não passa por `new Date()`

`formatarDataCivil` e `idadeEmAnos` (`@/lib/datas-fuso`). `new Date("2015-10-15")`
é meia-noite **em UTC**; renderizada no Brasil vira 14/10. Nascimento, validade
e competência são **dia civil**, não instante — a string é lida como texto.

Para data **com hora** (agendamento, check-in) continue com `Date`: ali o
instante é o dado, e a conversão de fuso está certa.

### Abas: o primitivo já tem o visual do v2

`@/components/ui/tabs` foi ajustado para o mesmo trilho do `Segmented`
(`bg-surface-sunken`, pílula branca na ativa). **Nenhuma tela precisa de classe
no `TabsList`** — e as que tinham `grid w-full grid-cols-N` perderam: esticar
as abas na largura toda é o oposto do v2, onde o trilho tem a largura do
conteúdo e rola na horizontal quando não cabe (o prontuário tem nove).

| Quando | Use |
|---|---|
| abas de verdade, com painel de conteúdo | `Tabs` do `@/components/ui/tabs` |
| filtro de 2-4 opções (período, modo de visualização) | `Segmented` do kit |

Os dois têm o mesmo desenho. A diferença é semântica: `Tabs` liga aba e painel
por `aria-controls`; `Segmented` é controle de filtro. A única diferença visual
é o marcador, que desliza só no `Segmented`.

### Ficha de dados: seção com chip, campo com microetiqueta

Para tela de detalhe (prontuário, convênio, procedimento, ficha do
profissional), três peças do kit:

```tsx
<SecaoInfo icone={<User />} titulo="Informações Pessoais">
  <GradeCampos>                       {/* 1 / 2 / 3 colunas */}
    <CampoInfo rotulo="Nome completo" valor={p.name} />
    <CampoInfo rotulo="Endereço" valor={p.address} larguraTotal />
  </GradeCampos>
</SecaoInfo>
```

- O rótulo é a **mesma microetiqueta do cabeçalho de tabela** (0.72rem,
  maiúscula, `ink-4`). É o que separa rótulo de conteúdo sem dois pesos de
  fonte competindo.
- **Campo vazio é `—` em `ink-4`**, não "Não informado" repetido oito vezes.
  Quem precisa da frase passa `vazio="Particular"`.
- A régua é `border-b border-hairline` no cabeçalho da seção, não um `<hr>`
  solto.

### Tela com abas: um painel só, não três blocos

Conferido na agenda do v2. A barra de controle **mora dentro do painel**, em
duas linhas, e o conteúdo da aba vem logo abaixo:

```tsx
<Panel>
  <div className="space-y-5">
    {/* 1. navegação de período */}
    <div className="flex flex-wrap items-center gap-3">
      <IconButton …><ChevronLeft /></IconButton>
      <h2 className="text-[1.25rem] font-semibold text-ink capitalize">…</h2>
      <IconButton …><ChevronRight /></IconButton>
      <ActionButton variant="secondary" size="sm">Hoje</ActionButton>
    </div>

    {/* 2. abas à esquerda, filtros e período à direita */}
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <Segmented opcoes={[…]} … />            {/* com ícone */}
      <div className="flex flex-wrap items-center gap-2">
        <SelectTrigger className="h-9 w-[12rem] rounded-full border-hairline bg-surface-muted text-[0.8rem]" />
        <Segmented opcoes={[dia, semana, mês]} … />
      </div>
    </div>

    {/* 3. conteúdo */}
  </div>
</Panel>
```

O que isso substitui: `TabsList` solta fora do painel, um `Card` só para a
barra de datas e outro `Card` para o conteúdo. Três molduras empilhadas onde
o v2 tem uma.

- **Aba é `Segmented`, não `TabsList`** — mesmo trilho `bg-surface-sunken` com
  marcador branco que desliza. O `Segmented` aceita `icone` por opção.
- **Alternância de período também é `Segmented`**, nunca três botões com um
  deles sólido: o botão cheio é a ação principal da tela, e usá-lo para
  "estou vendo o dia" compete com ela.
- **Filtro em pílula de 36px**: `h-9 rounded-full border-hairline
  bg-surface-muted text-[0.8rem]`, largura fixa (`w-[12rem]`, `w-[13rem]`).
- Conteúdo que precisa de moldura própria (uma grade de horários, uma tabela
  que rola) usa caixa interna `rounded-[1.25rem] border border-hairline
  bg-surface`. Lista de faixas (acordeão de profissional) **não usa caixa** —
  vai direto no painel.

> Ainda em `TabsList`: 16 telas (`check-in`, `glosas`, `evolucao`,
> `convenios/[id]`, `pacotes/[id]`, as de avaliação e currículo…). Não são
> todas iguais à agenda — formulário em abas é outro caso —, então a conversão
> é tela a tela, não codemod.

### Tabela: a linha é uma faixa, não uma linha com borda

Conferido no clone do v2 (`/usuarios`, `/pacientes`, `/salas`) e já embutido em
`@/components/ui/table` — **nenhuma tela precisa repetir essas classes**:

| Peça | Classe |
|---|---|
| `table` | `w-full border-separate border-spacing-y-1.5 text-sm` |
| `th` | `px-4 pb-1 text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase` |
| `tr` (corpo) | `bg-surface-muted`, pontas em `rounded-l-2xl` / `rounded-r-2xl` |
| `td` | `px-4 py-3.5 align-middle text-ink-2` |

Três decisões que vêm junto:

- **A faixa mora no `tbody`**, não no `TableRow`: a mesma peça serve de linha de
  cabeçalho em quase toda tela, e no v2 o cabeçalho não tem fundo. Quem passava
  `className="bg-muted/40"` no `<TableRow>` do `<TableHeader>` para tingir o
  cabeçalho pode parar — já não é o padrão.
- **Sem moldura em volta.** A tabela mora direto no `Panel`. Caixa de
  `rounded-lg border` contendo faixas de raio 16px era o que fazia a tabela
  parecer colada por cima da tela.
- **Sem `whitespace-nowrap` nas células.** No v2 a coluna estreita quebra em
  duas linhas em vez de empurrar tudo para o scroll horizontal.

**Lista de pessoas começa com avatar**: `PersonAvatar` de 36px + nome em
`font-semibold text-ink` na primeira coluna (usuários, pacientes, profissionais).
Sala tem ponto na cor da sala, que é identidade dela; procedimento não é pessoa
e fica em texto.

**Chip de status é sempre suave** (`StatusPill`, ou `Badge` com
`bg-*-soft text-*-ink`). Cor cheia fica para ação (botão) e para marcador de
seleção — dizer "está ativo" com um bloco sólido de cor puxa o olho para o
estado em vez do dado.

> Exceção registrada: `TabelaAgrupada` (Central de Relatórios) **mantém
> divisória de 1px** em vez de faixas. São linhas hierárquicas que abrem e
> fecham em três níveis, e 6px de respiro entre elas desmancha a leitura de
> pai e filho. A tipografia do cabeçalho é a mesma das outras.

### Lista dentro de painel: hairline, não caixa por item

O padrão antigo (`<div className="p-3 border rounded-lg">` por item) era o que
fazia duas janelas da mesma tela parecerem de sistemas diferentes: raio de
16px dentro de um painel de 28px, borda cinza crua e um retângulo competindo
com a moldura. A anatomia do v2, conferida no clone (`/dashboard`):

```tsx
<ol className="scrollbar-none max-h-[30rem] space-y-1 overflow-y-auto pr-1">
  <li className="grid grid-cols-[3.75rem_auto_1fr] items-center gap-3
                 border-b border-hairline py-3 last:border-none md:gap-4">
    {/* hora: tabular 1.25rem + duração 0.7rem */}
    <PersonAvatar nome={...} />
    <div className="min-w-0 rounded-2xl bg-surface-muted px-4 py-3">
      {/* nome + StatusPill · meta em 0.75rem text-ink-3 */}
    </div>
  </li>
</ol>
```

Três regras que vêm daí:

- **a separação é uma hairline**, e o único retângulo da tela é o painel;
- **o bloco de conteúdo é `bg-surface-muted rounded-2xl`**, não uma borda;
- **a coluna da hora só existe quando há hora** — sem ela a grade é
  `[auto_1fr]`, e a lista continua alinhada com a de cima.

Status vai em `StatusPill` (nunca `Badge` do shadcn, que não conhece a paleta)
e ação de linha em `ActionButton size="sm"`.

**Estado vazio é parte do painel**, não um `Card` solto: ícone em chip de
48px, título em 0.95rem semibold, uma linha de apoio em `text-ink-3` e, no
máximo, um botão. Painel que some quando a lista está vazia deixa buraco no
grid — o painel fica e diz que está vazio.

> Hoje essas peças (`ItemLista`, `MetaItem`, `Vazio`) vivem no topo de
> `src/app/dashboard/page.tsx`. Quando a segunda tela precisar delas, promover
> para `@/components/kit` em vez de copiar.

### Movimento: `motion` só onde o CSS não chega

`motion` (v14) entra em três lugares, e `src/components/kit/movimento.tsx` é o
único que o importa no kit:

1. **marcador que desliza** entre dois elementos diferentes — item ativo da
   sidebar e seletor segmentado. É animação de layout compartilhado
   (`layoutId`, mola 380/32), a única coisa aqui que CSS não sabe fazer. Pintar
   `bg-brand` em cada item fazia o destaque **piscar de lugar**;
2. **mola no ícone ao pairar**, com a variante propagando do pai (o hover está
   no item, o movimento está no ícone);
3. **transição entre rotas**, só na entrada.

O `layoutId` precisa ser único por instância montada — daí `React.useId()` em
quem usa. No mobile a sidebar existe duas vezes ao mesmo tempo (fixa + gaveta),
e com o id repetido o motion interpolaria entre as duas cascas.

Entrada de painel e de KPI continua em **CSS** (`.anim-entrada` e
`.anim-escalonada` no globals): um elemento, sem estado, custo zero de
JavaScript.

> Nada pulsa e nada se move sem o usuário ter agido — animação ociosa compete
> com o dado na tela, que é o que a recepção está lendo. `ProvedorMovimento`
> passa `reducedMotion="user"`, que estende ao JavaScript o que a media query
> do CSS já fazia: quem desliga animação no sistema recebe a troca de cor e
> nada deslizando.

### Escala de raio

`--radius: 1rem` → `sm` 10 · `md` 12 · `lg` 16 · `xl` 20 · `2xl` 24 · `3xl`
28px, e `rounded-full` nas pílulas (o raio dominante do v2). O projeto estava em
`--radius: 8px`, metade disso. Não redeclarar a escala fora de `tokens-v2.css`.

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

## Falha em lote precisa dizer o motivo

Toast com contagem (“0 criados, 11 falhas”) não é feedback: a pessoa não sabe o
que fazer com isso. `ResultadoLoteDialog`
(`@/components/agenda/resultado-lote-dialog`) recebe o `resultados[]` da rota de
lote e mostra os motivos **agrupados**, com as datas de cada um — numa
recorrência o mesmo motivo se repete, e 11 linhas iguais escondem a informação
em vez de mostrá-la.

Caso real que originou isso: 11 sessões recusadas por "Profissional já possui
agendamento neste horário", porque o paciente já tinha a série idêntica em outra
unidade. O motivo vinha na resposta e morria num `console.warn`.

Lote em que tudo deu certo continua em toast — aí a contagem basta.

## Evolução: o plano pode estar atrás do currículo

`/evolucao` mostra os **clones** do plano do paciente, não as atividades do
currículo — o plano é um snapshot da atribuição (ver `api-patterns.md`). Quando
o currículo recebe atividade nova, o plano de quem já estava atribuído continua
sem ela.

A tela diz isso em vez de deixar a pessoa procurando: `GET /api/evolucao`
devolve `faltando` por atribuição, e um aviso âmbar nomeia as atividades com um
botão **"Adicionar ao plano"**. O botão é aditivo — nunca mexe no que já existe
—, é idempotente (clicar duas vezes não duplica) e some sozinho quando não há
diferença.

Não propagar automático ao salvar o currículo foi decisão de 18/10/2026: um
currículo serve vários pacientes, e alterar o plano de quem está em atendimento
sem ninguém pedir é pior que exigir um clique.

Ao lado do seletor de plano há o botão de **desassociar** (ícone de elo
partido), com confirmação que diz o que acontece: o plano sai da lista do
paciente, **nada é apagado**, e reatribuir devolve tudo como estava. A promessa
no texto é exatamente o que o backend faz (`ativa = false`, e o `POST` reativa
em vez de recriar) — mensagem de confirmação que promete diferente do código é
pior que não ter mensagem. Só aparece para quem tem `atividades: UPDATE`, que é
o que o `DELETE` exige.

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
