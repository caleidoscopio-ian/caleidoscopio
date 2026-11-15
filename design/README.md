# design/

Material de origem da migração visual para o design do Caleidoscópio v2
(Módulo 28).

## O que tem aqui

| Caminho | O que é |
|---|---|
| `origem/v2-producao.css` | CSS publicado em caleidoscopio-v2.vercel.app (md5 `cff8721a8514686076206b8febe54dd7`), copiado para o repositório para a extração de tokens ser reproduzível sem depender de pasta externa |

## Como regenerar os tokens

```bash
node tools/extrair-tokens-v2.mjs            # mostra o que mudaria
node tools/extrair-tokens-v2.mjs --aplicar  # grava src/styles/tokens-v2.css
```

O gerado é `src/styles/tokens-v2.css` — **não editar à mão**, a próxima
extração apaga. Divergência deliberada vai em `src/styles/tokens-ajustes.css`,
que é carregado depois e tem o motivo escrito em cada linha.

## Por que o CSS compilado, e não só as variáveis

O Tailwind v4 com `@theme inline` **substitui a variável pelo valor** ao gerar
a utilitária. Por isso `--radius-2xl` e `--radius-3xl` não existem no `:root`
do CSS publicado: só aparecem dentro de `.rounded-2xl{border-radius:1.5rem}`.
O extrator lê as duas coisas — `:root`/`.dark` para cor e sombra, e as classes
compiladas para a escala de raio.

Sem isso a migração teria trazido a escala errada: o v2 usa `--radius: 1rem` e
sobrescreve 2xl e 3xl do Tailwind; o projeto estava em `--radius: 8px`, ou seja
**metade do arredondamento em todo componente**.

## O clone navegável do v2 (referência definitiva)

Em `E:\caleidoscopio-v2.vercel_app` há uma captura **executável** do v2: as 31
páginas em HTML, o CSS compilado, todos os chunks de JS e um `clone/` que
substitui o backend (grava sessão fictícia no `localStorage` e intercepta
`fetch` com dados determinísticos). Abrindo num servidor estático, o v2 roda
offline, logado e navegável.

O CSS dessa pasta é **byte a byte** o mesmo `origem/v2-producao.css` já
versionado aqui (md5 confere), então a camada de token está confirmada. O que
ela acrescenta é o que faltava: **composição tela a tela**.

```bash
node tools/clone-v2/servir.mjs "E:/caleidoscopio-v2.vercel_app" 4173
node tools/clone-v2/capturar.mjs "E:/caleidoscopio-v2.vercel_app" <saída> 4173
node tools/clone-v2/esqueleto.mjs http://localhost:4173/agenda.html 4 main
```

- `servir.mjs` — servidor estático; resolve `_next/` pedido de subpasta e rota
  sem extensão, que um servidor comum devolveria 404.
- `capturar.mjs` — captura todas as páginas em claro e escuro.
- `esqueleto.mjs` — imprime o DOM renderizado (tag + classes) de um seletor.
- `ver-dashboard.mjs` — abre uma tela **nossa** logada, sem o Sistema 1 no ar:
  cookie de sessão, SSO, RBAC e as rotas de dados interceptados no Playwright,
  captura em claro e escuro. É o par do `capturar.mjs` do lado de cá.

```bash
node tools/clone-v2/ver-dashboard.mjs http://localhost:3005 <saída>
```

> No Playwright a rota registrada **depois** vence: o catch-all de `**/api/**`
> precisa vir primeiro, senão engole a validação do SSO e a captura sai na tela
> de login. Um 401 solto em qualquer chamada dispara o auto-logout — na imagem
> isso aparece como "sessão expirou", não como erro de layout.
  É ele que dá a anatomia exata: `networkidle` nunca assenta nesse clone
  (o interceptor responde com latência), por isso os três usam
  `domcontentloaded` + espera fixa.

### O que o clone **não** tem

- **Rotas de detalhe e edição.** Só existem os 31 `page-*.js` das rotas de
  listagem; `/anamnese/[id]`, `/terapeutas/[id]`, `/convenios/[id]` e as 24
  outras devolvem 404. `clone/details.js` serve os **dados** de algumas delas,
  mas sem o código da página não há o que renderizar.
- **Sourcemap.** Nenhum `.map`; o JS é minificado, então dá para ler
  constantes (`layoutId:"nav-active"`) mas não o código dos componentes.
- **`/login`** não renderiza no clone (o interceptor não grava sessão nessa
  rota de propósito) — a referência do login é a captura da sessão anterior.
- A logomarca aparece quebrada nas capturas: o arquivo foi salvo com o nome
  mangado (`image.url_2Fcaleido_logox.png_w_256...`), não no caminho que o
  `next/image` pede. O arquivo está lá e é legível.
