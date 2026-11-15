# Módulo 28 — Design System v2

**Status**: implementado (04/11/2026), com o acabamento tela a tela e o
movimento concluídos na mesma data · só UI, nenhuma mudança de backend ou de
regra de negócio

## Objetivo

Deixar a aplicação visualmente idêntica ao Caleidoscópio v2
(https://caleidoscopio-v2.vercel.app), a partir de duas auditorias do front-end
publicado — uma com spec curado (`DESIGN.md`, 41 tokens, 17 papéis
tipográficos, anatomia de 10 componentes, contraste calculado) e outra com
evidência em escala (39 páginas, 35 capturas, 271 tokens com os dois temas,
classes Tailwind reais, 305 ícones SVG).

Não havia `DESIGN-GUIDE.md` nem código-fonte do kit: tudo foi reconstruído a
partir de token, classe capturada, estilo computado e captura de tela.

## Como ficou organizado

```
design/origem/v2-producao.css      CSS publicado do v2 (md5 cff8721a…)
tools/extrair-tokens-v2.mjs        gera os tokens a partir dele
tools/migrar-cores-v2.mjs          troca cor crua por token em lote
src/styles/tokens-v2.css           GERADO — :root, .dark, @theme
src/styles/tokens-ajustes.css      divergências deliberadas, com motivo
src/app/globals.css                ponte com shadcn, base, utilitárias
src/components/kit/                ActionButton, Panel, StatCard, StatusPill…
src/components/shell/              sidebar-v2, topbar-v2
src/app/design-system/             guia visual vivo
```

## O que foi feito

| Fase | Entrega |
|---|---|
| 1 | 81 tokens claros + 57 escuros extraídos por script, com a escala de raio lida das classes compiladas |
| 2 | Kit de 10 primitivos conferido contra as classes capturadas e os estilos computados |
| 3 | Ponte shadcn (as 39 telas herdam a paleta), fonte do sistema, modo noite com `next-themes`, casca nova |
| 4 | 965 trocas de cor crua por token em 108 arquivos; primitivos shadcn alinhados ao v2 |
| 5 | `motion` v14: marcador deslizante na sidebar e no segmentado, mola no ícone ao pairar, transição de rota |
| 6 | Acabamento tela a tela: 55 `PageHeader`, 84 `Card` → `Panel`, 79 `Card` → `StatCard`, por codemod |
| 7 | Clone navegável do v2 como referência: casca, trilha, fileira pastel e logomarca noturna acertadas contra o original |
| 8 | Dashboard recomposto na anatomia do v2: uma linha de lista para as três janelas, painel noturno, conferido logado |
| 9 | Tabela padronizada no primitivo (`ui/table`), 39 arquivos de uma vez, e o módulo de relatórios trazido para o kit |
| 10 | Agenda recomposta: barra de controle e abas dentro de um painel só, grade com avatar e faixa |
| 11 | Abas no primitivo (17 telas de uma vez), cabeçalho com voltar na linha da trilha, ficha de dados do prontuário |
| 12 | Varredura final: `Card` restantes, estados vazios, KPIs disfarçados e a data civil |
| 13 | Taxa de Ocupação: tabela na anatomia do v2 (painel, faixa, avatar, barra, ações em círculo) |
| 14 | Convênios no padrão + varredura automática das telas fora do desenho (`tools/varrer-design-v2.mjs`) |
| 15 | Varredura resolvida: de 74 para 18 marcadores, com as três telas de peso alto |
| 16 | Varredura zerada e Avaliações conferida à vista — o que o scanner não vê |
| 17 | Anatomia das tabelas: scanner próprio, peso do nome, avatar e chip do painel |
| 18 | Histórico de Atendimentos + as cores cruas que sobreviveram em arquivos `.ts` |

## Decisões

| Decisão | Por quê |
|---|---|
| **Corrigir os 8 pares de contraste** em vez de copiar | Três deles são o `StatusPill`, presente em quase toda tela, a 2.47:1 (mínimo 4.5:1). Texto que a clínica não lê não é fidelidade, é defeito copiado. Divergência mora em `tokens-ajustes.css`, calculada, não estimada. |
| **Manter `lucide-react`** em vez de importar os 305 SVGs | São geometria Lucide; o desenho é o mesmo. Os SVGs vêm nomeados por hash e identificá-los um a um seria trabalho sem ganho. Perde-se a animação de hover do `animate-ui`. |
| **Trocar Mulish pela pilha do sistema** | O v2 não carrega webfont. A pilha (SF Pro → Inter → Helvetica) é parte do desenho, não economia de request. |
| **Ajustar os primitivos shadcn** em vez de migrar 39 telas à mão | `Card`, `Button`, `Badge`, `Input`, `Select`, `Dialog` são usados em 24 telas; ajustá-los propaga a linguagem do v2 sem reescrever página. |
| **Manter `--viz-serie-1..6`** ao lado de `--chart-1..5` | A paleta de relatórios tem ordem validada para daltonismo; a do v2 tem 5 cores e outra ordem. Convivem: `--chart-*` para o kit, `--viz-*` para a Central de Relatórios. |
| **Breadcrumbs fora** | O v2 não tem. Quem localiza é o item ativo na sidebar e o `PageHeader`. A prop continua aceita para não quebrar as chamadas das páginas. |
| **Busca da topbar desabilitada** | No v2 ela filtra a clínica inteira — isso é funcionalidade, não design. Melhor desabilitada e honesta do que prometendo o que não faz. |

## A armadilha que o script pegou

A escala de raio **não existe no `:root`** do v2. O Tailwind v4 com `@theme
inline` substitui a variável pelo valor ao compilar, então `--radius-2xl` e
`--radius-3xl` só aparecem dentro de `.rounded-2xl{border-radius:1.5rem}`.

Extraindo só as variáveis, a migração teria trazido a escala do Tailwind:

| classe | v2 | projeto antes | padrão TW |
|---|---|---|---|
| `rounded-sm` | 10px | 4px | |
| `rounded-md` | 12px | 6px | |
| `rounded-lg` | 16px | 8px | |
| `rounded-xl` | 20px | 12px | |
| `rounded-2xl` | 24px | 16px | 1rem |
| `rounded-3xl` | **28px** | 24px | 1.5rem |

O projeto estava com `--radius: 8px`, metade do v2 — a diferença mais visível
entre as duas telas depois da cor.

## Verificação

- `tsc` limpo · `next lint` 0 erro (8 avisos pré-existentes) · `next build` passa
- guarda multi-tenant: 0 ALTO (nada de backend foi tocado)
- `/design-system` capturado nos dois temas e comparado com
  `capturas/dashboard_01_desktop.png` do v2: KPI em gradiente, painel noturno,
  pílulas, escala tipográfica e raios conferem
- `/login` capturado: canvas com halos, cartão de raio 32px, botão em pílula

Telas internas não puderam ser capturadas automaticamente: `useAuth` valida o
token no Sistema 1, que não roda no ambiente de build. A conferência delas é
manual, com a clínica logada.

## Os codemods

O acabamento foi feito por ferramenta, não a dedo, porque eram ~220
transformações em 100 arquivos. Todas simulam por padrão e **recusam o que não
casa exatamente**, imprimindo a lista — o recusado vai para a mão.

| Ferramenta | O que faz | Feitos / recusados |
|---|---|---|
| `tools/lib/jsx-mini.mjs` | casador de tags compartilhado (conta profundidade) | — |
| `migrar-pageheader-v2.mjs` | cabeçalho artesanal → `PageHeader` | 42 / 9 |
| `migrar-panel-v2.mjs` | `Card`+`CardHeader`+`CardTitle` → `Panel` com ícone | 84 / 134 |
| `migrar-statcard-v2.mjs` | cartão de indicador → `StatCard` | 79 / 56 |
| `recuperar-cor-icone-kpi.mjs` | devolve a cor do ícone lendo o cartão no `HEAD` | 41 |
| `limpar-import-card.mjs` | tira de `ui/card` o que deixou de ser usado | 30 |

As recusas são, em sua maioria, cabeçalho com badge ou botão "Voltar" (telas de
detalhe) e `Card` que é container de conteúdo, não painel nem indicador. As 16
telas de detalhe foram convertidas à mão; foi delas que saíram as props
`voltar`, `meta` e `avatar` do `PageHeader`.

### O erro que custou 29 arquivos

A primeira execução de `migrar-panel-v2.mjs` somava um índice **absoluto** a um
**relativo** (`saida.slice(card + corpoCard.fim)`), apagando `card` caracteres
de conteúdo depois de cada cartão convertido. 29 páginas foram escritas assim
antes de o script abortar por outro motivo.

A recuperação não veio de backup: veio de o trabalho ser **reproduzível**.
Restaurar do `HEAD` e reexecutar a cadeia (cores → h1 → `PageHeader`) devolveu
os arquivos ao estado correto; o que era de mão (8 telas de detalhe) foi
reaplicado por script. A fidelidade da cadeia foi **verificada antes**, num
arquivo de controle intacto (`glosas/page.tsx`): restaurado do `HEAD`,
reprocessado e comparado byte a byte com a versão boa.

> A lição para o próximo codemod: índice absoluto e relativo na mesma função
> são um acidente esperando acontecer, e `--arquivo <um>` antes de `--aplicar`
> em 100 arquivos custa dois minutos.

## Fase 7 — o clone navegável mudou o que dava para conferir

Até aqui a referência era o CSS publicado mais 35 capturas. A pasta
`E:\caleidoscopio-v2.vercel_app` trouxe o v2 **rodando**: 31 páginas, os
chunks de JS e um `clone/` que substitui o backend. O CSS dela é byte a byte o
que já estava versionado — a camada de token estava certa. O que faltava era
composição, e com o DOM renderizado em mãos apareceram seis divergências que
nenhuma captura mostrava:

| O que estava diferente | Como era aqui | Como é no v2 |
|---|---|---|
| **Trilha** | removida | existe (`nav aria-label="Trilha"`) |
| **Largura do conteúdo** | estica até a borda | `mx-auto max-w-[1480px]` |
| **Fileira de KPI** | branca fora do dashboard | pastel em toda listagem, 1º em `1.25fr` |
| **Cabeçalho** | `items-start`, botão `md` | `md:items-end`, botão `lg`, subtítulo 0.95rem |
| **Logomarca noturna** | `dark:brightness-0 dark:invert` | arquivo próprio (`caleido_logox_dark.png`) |
| **Recolher a sidebar** | não existia | botão na topbar, 264px → 88px |

A trilha foi o erro mais caro: eu a removi por ter conferido só a captura do
dashboard, que é a raiz e por isso não tem trilha nenhuma. Amostra de uma tela
só, generalizada para 57.

Aqui ela ficou **em todas** as telas, não nas 9 do v2: `PageHeader` deriva da
rota quando a página não passa nada. Trilha que some em metade do produto faz
o título saltar 20px entre telas, e isso é pior que não ter.

### Como conferir de novo

```bash
node tools/clone-v2/servir.mjs "E:/caleidoscopio-v2.vercel_app" 4173
node tools/clone-v2/esqueleto.mjs http://localhost:4173/agenda.html 4 main
```

`esqueleto.mjs` imprime o DOM renderizado (tag + classes). Foi dele que saíram
todas as medidas acima — o HTML salvo em disco é só a casca pré-hidratação, o
conteúdo só existe depois de o JS rodar.

### Decisão revista: gradiente pastel em toda listagem

A regra anterior ("pastel só no dashboard") vinha de uma leitura minha sobre
sobrecarga visual em TEA. O sistema é operado pela clínica, não pelo paciente,
e a decisão passou a ser fidelidade ao v2: `blue · lavender · mint · peach`,
primeiro cartão em `hero` dentro de `xl:grid-cols-[1.25fr_1fr_1fr_1fr]`.

Os três tokens de contraste (`--success-ink`, `--warning-ink`, `--danger-ink`)
**continuam divergindo** do v2. Não é estética: é o texto do `StatusPill`, que
no original fica em 2.47:1 onde o mínimo legível é 4.5:1.

## Fase 8 — o dashboard tinha três janelas com marcação própria

Relato do usuário: "tem algumas janelas diferentes, deixe no mesmo layout".
Procedia. As três janelas da tela usavam composições distintas:

| Janela | Como estava |
|---|---|
| Agenda de Hoje | itens em `div p-3 border rounded-lg`, `Badge` do shadcn, botão de largura cheia no fim da lista |
| Sessões Pendentes | `flex` com botão à direita, some da tela quando vazia |
| Sem sessões | `Card` do shadcn (outra moldura), centralizado |

Além disso o grid era `md:grid-cols-2` com três painéis: o terceiro sobrava
sozinho em meia largura. O v2 resolve isso com `xl:grid-cols-[1.45fr_1fr]` —
lista larga à esquerda, coluna de apoio à direita (painel noturno + dois KPIs
`sm` brancos). Foi o que passou a valer aqui, com **uma** anatomia de linha nas
três janelas (ver `.claude/rules/frontend.md`, "Lista dentro de painel").

Dois achados de passagem:

- `EM_ATENDIMENTO` não estava no mapa de rótulos do dashboard (o enum
  `StatusAgendamento` tem seis valores, o mapa tinha cinco): a consulta em
  atendimento aparecia escrita "Agendado".
- `.scrollbar-none` é utilidade do v2 e não existia no `globals.css`. A barra
  do sistema cortava o raio de 28px da lista alta da agenda.

### Conferência logada, enfim

`scratchpad/ver-dashboard.mjs` abre `/dashboard` no build de produção com
cookie de sessão, SSO, RBAC e as rotas de dados interceptados no Playwright. É
o que faltava para ver uma tela interna sem o Sistema 1 no ar — e é
reaproveitável para as outras.

Um detalhe que custou duas tentativas: **no Playwright a rota registrada depois
vence**, então o catch-all de `**/api/**` tem de ser o primeiro. Registrado por
último, ele engolia a validação do SSO e a tela voltava para o login. E um 401
solto em qualquer chamada (foi `/api/me/filial`) dispara o auto-logout — numa
captura isso aparece como "sessão expirou", não como erro de layout.

## Fase 9 — a tabela era a última peça fora do padrão

A tabela do shadcn (linha com `border-b`, cabeçalho com borda, `p-2` nas
células) convivia com painéis de raio 28px. No v2 a linha é uma **faixa
arredondada** separada por 6px, sem borda nenhuma. Como o desenho inteiro mora
no primitivo, trocar `src/components/ui/table.tsx` arrumou **39 arquivos** de
uma vez.

O detalhe que exigiu cuidado: a faixa foi para o `tbody`, não para o
`TableRow`. O mesmo `TableRow` serve de linha de cabeçalho em quase toda tela,
e no v2 o `thead` não tem fundo — colocar a faixa na linha teria tingido todos
os cabeçalhos. Saíram junto os cinco `bg-muted/40` que tingiam cabeçalho à mão
e oito molduras `rounded-lg border` em volta de tabelas.

Também entrou aqui o que faltava por tela:

- **avatar + nome semibold** na primeira coluna das listas de pessoas
  (usuários, pacientes, profissionais), como em toda lista de pessoas do v2;
- **perfil e status em pílula suave** — `Admin` era um bloco sólido da marca no
  meio da tabela, e oito outros chips de status usavam cor cheia;
- **módulo de relatórios trazido para o kit**: era a última família ainda em
  `rounded-lg border bg-card`. Os indicadores viraram `StatCard` na fileira
  pastel, e filtros, gráfico e tabela ganharam raio 28px, borda `rim` e
  `shadow-card`.

`TabelaAgrupada` ficou de fora das faixas de propósito: são linhas
hierárquicas de três níveis, e o respiro entre faixas desmancha a leitura de
pai e filho. Só a tipografia do cabeçalho foi alinhada.

> `text-muted-foreground` aparece 1024 vezes no código e **não é divergência
> visual**: `--muted-foreground` é alias de `--ink-3` em `tokens-v2.css`, assim
> como `bg-card` é `--surface`. É nome legado, não cor crua — trocar em massa
> seria ruído de diff sem um pixel de diferença.

## Fase 10 — a agenda tinha três molduras onde o v2 tem uma

| O que estava diferente | Aqui | No v2 |
|---|---|---|
| Estrutura | abas soltas + `Card` da data + `Card` do conteúdo | **um `Panel`** com tudo dentro |
| Abas | `TabsList` do shadcn | `Segmented` com ícone |
| Dia/Semana/Mês | três botões, o ativo sólido | `Segmented` no trilho |
| Filtros | `SelectTrigger` retangular de 180/200px | pílula `h-9` em `surface-muted` |
| "Novo Agendamento" | botão `outline` | ação sólida da marca, `lg` |
| KPIs | blue · lavender · mint · peach, ícones de pessoa e calendário | blue · **mint** · **lavender** · peach, com check e x |
| Linha do profissional | cartão `rounded-lg border`, sem avatar | faixa `rounded-2xl bg-surface-muted` com avatar |
| Legenda | quadrado com borda cheia, "Agendado" na cor da marca | `size-3 rounded-[0.3rem]` com anel a 40%, "Agendado" em `info` |

A fileira de KPI da agenda **inverte** os dois tons do meio em relação ao
dashboard, e isso é do v2: verde em "Confirmados" é semântico, não decorativo.
Vale a pena divergir da ordem padrão quando o tom carrega significado.

A aba de grade **não ganhou caixa interna** — no v2 as faixas ficam direto no
painel. A aba "Agenda Geral" ganhou, porque a grade de horas rola na
horizontal e precisa de borda para o conteúdo não parecer solto.

> Radix `Tabs` saiu desta tela. Com `Segmented` fazendo o papel de `TabsList`,
> manter `TabsContent` deixaria `aria-labelledby` apontando para um gatilho
> que não existe mais — ARIA quebrada é pior que ARIA ausente. O conteúdo
> agora é condicional (`activeTab === "geral" && …`), e o `Segmented` já
> carrega `role="tablist"` e `aria-selected`.

## Fase 11 — abas pelo primitivo, e o prontuário como referência

Em vez de converter 17 telas à mão, o desenho das abas foi para
`src/components/ui/tabs.tsx`: mesmo trilho do `Segmented`, pílula branca na
ativa, rolagem horizontal quando não cabe. Saíram também as classes que as
telas passavam para esticar o trilho (`grid w-full grid-cols-N` em 17 lugares,
`mb-4` em 5) — no v2 o trilho tem a largura do conteúdo.

Manter o Radix em vez de trocar por `Segmented` foi deliberado: aqui são abas
com painel associado, e o `Segmented` não liga um ao outro por `aria-controls`.
O preço é o marcador não deslizar nestas telas.

### Cabeçalho: o voltar mudou de lugar

No v2 a pílula "← Voltar" fica **na linha da trilha**, e o avatar fica ao lado
do título. Aqui o voltar era um botão circular à esquerda de tudo, o que
empurrava as migalhas para dentro. Agora a linha da trilha começa na margem.

### Peças novas no kit

`SecaoInfo`, `GradeCampos` e `CampoInfo` (`@/components/kit/dados`) — a ficha
de dados do prontuário. Servem para toda tela de detalhe; convênio,
procedimento e ficha do profissional ainda estão na forma antiga.

### Dois achados de passagem

- **Abrir o prontuário por link direto (ou dar F5) caía no dashboard.** A
  página empurrava para `/login` enquanto a sessão ainda era restaurada do
  `localStorage`, e o login, com sessão válida, devolvia ao dashboard.
  Corrigido esperando `loading` do `useAuth`. Era a única página com esse
  `if (!isAuthenticated) router.push` solto no efeito.
- **Data de nascimento sai um dia antes.** `new Date("2015-10-15")` é
  meia-noite em UTC; renderizada em `pt-BR` (UTC−3) vira 14/10. O v2 mostra
  15/10. São 9 lugares com data só-dia vinda do banco. **Não corrigido** — é
  dado, não layout, e merece um helper único.

## Fase 12 — a varredura final

De 77 `Card` restantes para 31, e os que ficaram são **item de lista** — ali o
`Card` é a peça certa, e desde o ajuste dos primitivos ele já tem raio 28px,
borda `rim` e `shadow-card`.

O que mudou de verdade:

| Achado | Onde | Virou |
|---|---|---|
| KPI disfarçado de `Card` (`CardTitle` pequeno + número grande) | evolução, encaminhamento e anexos do prontuário, dashboard de ocupação | `StatCard` na fileira pastel |
| Cartão com título + descrição + botão | 7 abas de formulário (atividade, currículo, avaliação) | `Panel` com ícone e `acoes` |
| Estado vazio e espera | 15 lugares | `EstadoVazio` / `Carregando` |
| Caixa `p-3 border rounded-lg` por item | convênio, histórico de sessões, profissionais | faixa `rounded-2xl bg-surface-muted` |
| Grade de campos à mão | pacote, procedimento, ficha do profissional | `GradeCampos` + `CampoInfo` |

### A data civil

`formatarDataCivil` e `idadeEmAnos` em `@/lib/datas-fuso`, e **seis cópias**
do mesmo cálculo de idade (todas com o mesmo erro de fuso) passaram a chamar o
helper. O prontuário mostrava 14/10/2015 onde o v2 mostra 15/10.

### Verificação

Varredura de renderização em 20 telas no build de produção, com SSO, RBAC e
dados interceptados: **19 passaram** e a vigésima (`/curriculum/novo`) parou em
"Acesso Negado" por falta do recurso na lista de permissões do próprio teste,
não por erro de tela.

## Fase 13 — a última tabela fora do padrão

`/taxa-ocupacao` tinha ficado para trás: a tabela morava num
`div.rounded-md.border` com um `<h2>` "PROFISSIONAIS" em microetiqueta solta
por cima, sem painel. O primitivo já dava as faixas, mas a moldura antiga em
volta e a falta de cabeçalho denunciavam a tela.

| Peça | Antes | Agora (v2) |
|---|---|---|
| moldura | `rounded-md border` + `<h2>` solto | `Panel` com ícone, título e subtítulo |
| nome | texto simples | `PersonAvatar` 36px + nome semibold + especialidade |
| barra de taxa | trilho `bg-muted`, 120px | `bg-surface-sunken`, `min-w-[9rem]`, número de largura fixa |
| faltas | número em `warning-ink` | `--kpi-peach-ink` + "(N canc.)" em `ink-3` |
| ações | `Button ghost` quadrado | círculo de 32px que só acende no hover |
| horas | sempre visíveis | `hidden md:table-cell` |
| "grade não configurada" | `Badge` com borda | `StatusPill` âmbar |

Uma divergência consciente: **o v2 pinta o número da taxa com a cor cheia da
barra** (`text-success` em cima de `52%`). Aqui o número usa o token `-ink`.
É a mesma regra dos status — cor cheia como texto reprova no contraste.

## Fase 14 — convênios, e um mapa do que falta

Convênios repetia a mesma lista de desvios de `/taxa-ocupacao`: quatro `Panel`
com número dentro no lugar da fileira pastel, busca solta acima da tabela,
painel sem cabeçalho, status em pílula sólida azul e ações sem moldura. Tudo
corrigido contra o clone — inclusive a busca, que no v2 mora **no cabeçalho do
painel** (e desce para o corpo no telefone, onde espremeria o título).

### A varredura

`tools/varrer-design-v2.mjs` procura os marcadores que, nas telas já
corrigidas, sempre apareceram juntos:

| Marcador | Peso |
|---|---|
| moldura `rounded-md/lg border` em volta de tabela | 3 |
| `Card` + `CardContent p-0` segurando tabela | 3 |
| KPI escrito à mão (`text-2xl/3xl font-bold`) | 3 |
| status em pílula sólida | 2 |
| ação de linha como `Button ghost size=icon` | 2 |
| busca solta fora do painel | 2 |
| `<h2>` em microetiqueta maiúscula solta | 2 |

**Não é lint — é um mapa de onde olhar.** O marcador de KPI, por exemplo, dá
falso positivo no resumo de desempenho do histórico de sessões: ali os números
vivem num bloco denso de quatro colunas dentro de um diálogo, e `StatCard`
(13rem de altura) estragaria. Foi o que aconteceu ao investigar os 8 achados
daquela tela — viraram ajuste de moldura, não troca de componente.

Corrigido em lote nesta passada:

- **ação de linha de 28px → 36px** em 7 arquivos. A forma já estava certa (o
  `Button` do kit é redondo desde o ajuste dos primitivos); o que destoava era
  o alvo de toque pequeno demais.
- **molduras `rounded-lg border`** dos blocos de resumo do histórico de sessões.

Restam **39 arquivos com 68 marcadores**, a maioria de peso 2 (detalhe, não
tela inteira). Os de peso alto: `historico-sessoes`, `evolucao` e
`visualizar-atividade-dialog`.

## Fase 15 — a varredura levada até o fim

De **74 marcadores para 18**. O que mudou, por tipo:

| Correção | Onde |
|---|---|
| Filtros soltos entram no painel que filtram | histórico de sessões (busca + 2 selects), evolução |
| Ação de linha 44px → 36px | 10 arquivos |
| Pílula sólida → suave | prescrição, anamnese, encaminhamento, relatórios, diagnóstico, ficha do profissional |
| Número de resumo ganha `tabular` + rótulo em microetiqueta | histórico de sessões (8), diálogos de atividade, currículo, paciente e profissional |
| Moldura `rounded-lg border` → raio e borda de token | aviso de sincronia da evolução, resumos do histórico |

### O marcador não é o remédio

Três vezes o scanner apontou "KPI escrito à mão" e a resposta **não** foi
`StatCard`: nos diálogos e nos resumos de sessão os números vivem em blocos
densos de quatro colunas, e um cartão de 13rem estouraria a tela. O ajuste
certo foi tipográfico — `tabular` no número, microetiqueta no rótulo.

Por isso o scanner agora ignora quem já tem `tabular` (número de resumo
tratado) e quem já está em `size-9` (ação de linha no tamanho do v2): o que
sobra é o que realmente falta olhar.

### O que restou

18 marcadores, sendo **16 de "busca fora do painel"** em telas de listagem
(anamnese, atividades clínicas, avaliações, pacientes, salas, terapeutas,
usuários…). São todas o mesmo gesto — mover o campo para o cabeçalho do
`Panel`, como em convênios — e cada uma precisa que a tabela já esteja num
painel com cabeçalho, o que nem todas têm.

### Verificação

Varredura de renderização em 24 telas: **20 passaram**. As quatro restantes
(`taxa-ocupacao`, `historico-atendimentos`, `glosas`, `permissoes`) param no
mock genérico do teste, que devolve `data: []` onde a página espera um objeto
`resumo` — é a mesma falha de antes das mudanças, não regressão.

## Fase 16 — zero marcadores, e o que o scanner não via

Os 18 restantes caíram para **0**. Dezesseis eram o mesmo campo de busca, e a
conferência no clone mudou o remédio:

> **A posição da busca varia no v2.** Em `/convenios` ela mora no cabeçalho do
> painel; em `/avaliacoes` fica solta acima da lista, com `max-w-xl`. O que
> **não** varia é a forma: é sempre a pílula (`SearchField`), nunca um `Input`
> retangular com a lupa posicionada por cima.

Então a troca foi de forma, mantendo a posição de cada tela — 17 campos em 16
arquivos, a maioria por codemod e quatro à mão (tinham `onKeyDown` ou classe
própria no invólucro).

### Avaliações: seis diferenças que nenhum marcador pegava

Conferida à vista contra o clone, por pedido. O scanner acusava **um** sinal
(a busca); os outros cinco só apareceram na comparação lado a lado:

| | v2 | estava aqui |
|---|---|---|
| Ordem dos tons | blue · lavender · **peach** · **mint** | 3º e 4º trocados |
| Ícones dos KPIs | quatro diferentes | a mesma prancheta nas quatro |
| Cabeçalho do painel | chip de ícone, contagem à direita | sem chip, contagem colada no título |
| Nome na linha | semibold `ink` | peso normal |
| Tipo | pílula suave | **azul sólida** |
| Data | `tabular` | texto comum |

**É a lição da fase: o scanner acha padrão, não desenho.** Ordem de cores,
escolha de ícone e hierarquia de peso tipográfico não têm assinatura no
código — só aparecem comparando as duas telas. O caminho que funciona é o
clone servido ao lado (`tools/clone-v2/servir.mjs`) e a captura da nossa com
dados equivalentes.

## Fase 17 — a anatomia de dentro da linha

O relato foi preciso: *"nas tabelas, letras, negrito ou não, ícone e etc,
estou achando recorrente"*. E era mesmo um padrão, não um acaso — só que o
`varrer-design-v2.mjs` não via, porque ele procura molduras e pílulas soltas,
não o desenho **dentro** da linha.

`tools/varrer-tabelas-v2.mjs` faz isso: casa cada `<TableHead>` com a
`<TableCell>` de mesmo índice e checa três coisas que no v2 nunca variam:

1. a coluna que **identifica** a linha tem chip ou avatar **e** nome em
   `font-semibold text-ink`;
2. coluna categórica (tipo, especialidade, status, perfil…) é **pílula**, não
   texto solto;
3. o painel que segura a tabela tem **ícone e subtítulo** no cabeçalho.

Primeira passada: **36 tabelas, 56 diferenças**. Depois dos codemods, 20 com 25.

### Dois codemods que valeram

- `tools/semibold-identidade.mjs` — o nome da linha em `font-semibold text-ink`
  em **16 tabelas**. É a queixa literal ("negrito ou não") e some em uma passada.
- `tools/avatar-identidade.mjs` — `PersonAvatar` na coluna de pessoa, em 5
  tabelas. Recusou 5 por forma não reconhecida e **listou quais**, em vez de
  tentar adivinhar.

### Procedimentos: o chip estava com um terço do tamanho

`ProcColorChip` desenhava um quadrado de **20px** com a cor do procedimento; no
v2 é um chip de 40px com o raio do kit. Junto: especialidade virou pílula,
"Autorizações" virou pílula âmbar, o painel ganhou chip e contagem, o botão
"Novo Procedimento" passou a secundário e a busca foi para a linha das abas.

### Prontuários

Avatar no paciente, especialidade do profissional em pílula, tipo de
atendimento em pílula, "Nenhum" no lugar do traço em Anexos e o subtítulo
"Evoluções clínicas registradas por sessão" — que o v2 tem e aqui faltava.

### O limite do scanner

Quando a tabela tem **coluna condicional** (`{pode && <TableHead>}`), o índice
do cabeçalho não casa com o da célula e ele acusa coluna errada — foi o que
aconteceu em `/convenios` e `/usuarios`, onde a pílula já existia. O número
final (25) carrega esses falsos positivos; o relatório aponta onde olhar, a
decisão continua sendo de quem olha.

## Fase 18 — a tabela solta, e cor crua escondida em `.ts`

`/historico-atendimentos` era o caso que faltava no scanner: a tabela **não
tinha painel nenhum** em volta, e o teste de cabeçalho só olhava painel que já
existisse. Sinal novo acrescentado.

Três correções:

| | Antes | Agora (v2) |
|---|---|---|
| Resumo | cinco cartões `sm` em fila | **dinheiro em destaque** (faturado `hero` + ticket médio) e a contagem numa linha de três |
| Tabela | solta no fundo da tela, com `<h2>` por cima | `Panel` com chip e "1528 registro(s) encontrado(s)" no subtítulo |
| Status | pílula com borda e cor crua | pílula suave em token |

### O achado: 24 cores cruas em arquivos `.ts`

A migração de cores do início do módulo trocou 965 ocorrências **em `.tsx`**.
Os mapas de status moram em `.ts` — e passaram batido:

```ts
// src/types/agendamento.ts, antes
[StatusAgendamento.CANCELADO]: 'bg-red-50 border-red-300 text-red-800',
```

Cinco arquivos (`types/agendamento`, `types/check-in`, `types/glosa`,
`types/conciliacao`, `lib/ocupacao`) com 24 cores que **não trocam no modo
noite** — `bg-gray-50` continua claro no escuro. Todos passaram para os pares
`-soft`/`-ink`.

> Lição para a próxima varredura em lote: filtrar por extensão é um
> pressuposto. Constante de estilo não vive só onde há JSX.

## Fase 19 — modais e telas de detalhe (lista de 9 itens)

Conferido contra fotos do v2 enviadas pelo usuário e, quando a rota existe no
clone, contra o DOM do clone (`/iniciar-sessao`, `/historico-sessoes` com o
modal aberto, `/terapeutas`, `/perfil`, `/permissoes`, `/curriculum`).

| Item | Tela | O que mudou |
|---|---|---|
| 1 | `/pacientes` | célula de uma linha com reticências e `title`; responsável longo não dobra mais a altura da linha |
| 2 | todos os modais | `DialogContent` branco (`bg-surface`, `rounded-3xl`, `p-5 sm:p-7`); bloco interno `rounded-2xl bg-surface-muted`; campos preenchidos (`bg-surface-muted`, input 44px, select 36px); microetiqueta no lugar do título de seção; sem `<Separator />` — `tools/modais-v2.mjs` |
| 3 | `/convenios/[id]` | título + `StatusPill` na mesma linha; abas com contagem em pílula; Dados Gerais em 4 painéis com ícone e `LinhaDado`; tabela, anexos e histórico dentro de `Panel`; histórico em linha do tempo; TISS com ícones e botão pílula |
| 4 | `/procedimentos/[id]`, `/pacotes/[id]` | mesma linguagem do item 3; KPIs na fileira de tons |
| 5 | `/iniciar-sessao` | avatar 34px, paginação de 8, cartão do selecionado em gradiente; planos e avaliações **lado a lado em cartões** (antes: duas tabelas empilhadas) |
| 6 | `/terapeutas`, `/terapeutas/[id]` | ordem dos tons (Ativos menta, Especialidades lavanda); chip de especialidade com contador em pílula; grupo de filial em caixa com borda; detalhe com `LinhaDado` e painéis |
| 7 | `/avaliacoes/[id]` e `/editar` | Informações Gerais em blocos com microetiqueta; abas na largura toda; ordem em círculo branco (`NumeroOrdem`); valor de pontuação em `brand` semibold; tarefas em cartões com pílulas |
| 8 | modal de `/historico-sessoes` | um modal só por tela (antes um por linha); identificação em bloco; "Resumo do desempenho" em 4 cartões brancos sobre faixa em gradiente; tentativas em pílulas `+`/`-`; filtros acima dos KPIs e paginação de 12, como no clone |
| 9 | `/perfil`, `/permissoes` | perfil com cartão de identidade (avatar 56px) e campos com hairline; lista de perfis com chip de escudo, pílulas de tipo e ações em círculo |
| + | `/curriculum` | busca no cabeçalho do painel; chip + nome semibold; ações em círculo branco e "Atribuir" em pílula |

Bug de contraste encontrado no caminho: a fase "Linha de Base" era **texto
branco sobre `surface-muted`** em `/iniciar-sessao` e `/historico-sessoes` —
resíduo da migração de `bg-gray-500` → `bg-surface-muted`. Agora é pílula
suave. Vale procurar `text-white` junto de `bg-surface-*` quando migrar cor.

Duas peças promovidas ao kit (eram cópias em 3+ telas): `LinhaDado` e
`NumeroOrdem`.

## Fase 20 — telas de aplicação da sessão

`/aplicar-curriculum/[sessaoId]` e `/aplicar-avaliacao/[id]`, conferidas contra
as duas páginas de demonstração do v2 **no ar** (o clone offline não as traz) —
`playwright` abre a URL pública e lê as classes direto do DOM.

Só o JSX mudou: estado, handlers, validação, chamadas de API e o modal de
resultado ficaram como estavam. Teste de comportamento (pontuar, navegar,
tentar avançar sem avaliar, salvar) passou igual antes e depois.

- **Plano terapêutico**: grade `xl:grid-cols-[minmax(0,1fr)_22rem]`. À esquerda,
  um `Panel` com a instrução atual (faixas coloridas por tipo de orientação,
  um cartão por tentativa, botões de resposta de 56px em verde/vermelho/marca
  conforme a sigla) e **o Anterior / Salvar e Próxima no `rodape` do painel**.
  À direita, `aside` fixo: progresso em `Panel variant="night"` (número de 3rem)
  e a lista de instruções (círculo numerado; verde com ✓ quando avaliada).
  Antes era uma fileira horizontal de botões acima de tudo.
- **Avaliação**: grade `xl:grid-cols-[1fr_1.6fr]`; à esquerda as tarefas em 3
  colunas com rolagem e o progresso embaixo; à direita a tarefa atual.
- A fase da instrução virou `FasePill` no kit — era a **terceira cópia** da
  mesma função (iniciar sessão, histórico, aqui), e as duas primeiras tinham
  "Linha de Base" em texto branco sobre fundo claro.
- Faixa de orientação (`Destaque`): texto do rótulo em `-ink` (contraste), faixa
  de 4px em cor cheia — mesma regra do `StatusPill`.

## Custo de runtime da casca (medido, não estimado)

`tools/medir-navegacao.mjs` roda o circuito Dashboard → Pacientes → Usuários →
Salas → Convênios no build de produção e mede clique → `<h1>` pintado,
descartando a primeira volta (aquecimento do servidor).

| Cenário | Navegação (mediana) |
|---|---|
| **Com GPU** (Chromium com janela real), tudo ligado | **75–90 ms** |
| Com GPU, sem `backdrop-filter` no conteúdo | 77–87 ms (igual) |
| **Sem GPU** (headless, composição por software) | 147–156 ms |
| Sem GPU, sem vidro no `main` | 78–85 ms |
| Sem GPU, sem vidro só na sidebar/topbar | 142–171 ms (não muda nada) |

Scroll: p50 17 ms, zero quadros acima de 32 ms, zero tarefas longas em **todos**
os cenários. O `motion` pesa **48 kB gzip** (chunk isolado), ~22% dos 220 kB de
first load do dashboard.

Conclusões que importam para decisão futura:

1. **O vidro é grátis onde há GPU e caro onde não há** — e o custo está todo no
   `backdrop-blur-xl` do `main` (a maior superfície da tela), não na sidebar.
   Só aparece enquanto algo anima por cima. Cenário realista de clínica:
   máquina antiga, acesso remoto (RDP) ou aceleração de hardware desligada.
2. **O gargalo real não é o design.** Cada navegação dispara **3 chamadas
   idênticas** a `/api/usuario-roles/<id>/permissoes`: a página monta um
   `ProtectedRoute`, o `MainLayout` monta outro, e a sidebar chama
   `usePermissions` por conta própria. Elas saem em paralelo (o usuário espera
   uma ida e volta), mas o servidor faz 3× o trabalho de banco por tela aberta.
   Com API a 120 ms, a navegação vai de ~90 ms para ~200 ms.
3. **A casca remonta a cada navegação** porque o `MainLayout` vive dentro de
   cada página, não num `layout.tsx` de grupo de rotas. É isso que faz o RBAC
   ser buscado de novo. Mover a casca para um layout resolveria 1 e 2 de uma
   vez — mas toca as 57 páginas, então é decisão à parte.

Nada disso veio do Módulo 28: a guarda aninhada e o `MainLayout` por página já
estavam em `95f08a2`.

## O que ficou pendente

- **79 `Card` continuam** — abas do prontuário, abas de formulário e containers
  de conteúdo. Depois do ajuste dos primitivos, `Card` já tem raio 28px, borda
  `rim` e `shadow-card`: trocar por `Panel` não mudaria pixel sem alguém
  escolher um ícone para cada cabeçalho, que é decisão humana.
- **Rotas sem referência**: o clone só traz as 31 telas de **listagem**.
  Convênio, procedimento, pacote, profissional e avaliação ganharam referência
  por foto na Fase 19; as demais telas de detalhe seguem o kit.
  `/anamnese/[id]`, `/terapeutas/[id]`, `/convenios/[id]` e as outras 24 de
  detalhe e edição devolvem 404 lá (o chunk da rota não foi capturado), assim
  como tudo do Módulo 25 ao 27. Seguem o kit — e é a decisão certa: o kit é a
  linguagem, não um decalque de capturas.
- **Conferência logada das telas internas.** `/design-system` agora monta a
  `CascaV2` de verdade, então sidebar, topbar e container já são verificáveis
  sem o Sistema 1. O conteúdo de cada tela, não.
- **`--ink-4` como texto**: continua em 2.52:1 onde é decorativo. Texto pequeno
  usa `--ink-sutil` (4.53:1).
- **Conferência logada**: as telas internas continuam sem captura automática
  (`useAuth` valida o token no Sistema 1). `/design-system` e `/login` são as
  únicas verificáveis sem credencial.
