// Extrai os tokens de design do CSS de produção do Caleidoscópio v2
// (Módulo 28 — migração de design system).
//
// Entrada: `design/origem/v2-producao.css`, o CSS publicado em
// caleidoscopio-v2.vercel.app, copiado para o repositório para a extração ser
// reproduzível (md5 conferido no cabeçalho do arquivo gerado).
//
// Saída: `src/styles/tokens-v2.css` — `:root`, `.dark` e o bloco `@theme`
// que transforma cada token em classe utilitária do Tailwind v4.
//
// Por que script e não copiar na mão: são 83 tokens claros e 57 escuros, e o
// CSS de origem é minificado. Mão humana erra um hex e ninguém percebe até a
// tela ficar diferente. Rodar de novo quando o v2 mudar:
//
//   node tools/extrair-tokens-v2.mjs            # mostra o que mudaria
//   node tools/extrair-tokens-v2.mjs --aplicar  # grava

import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const ORIGEM = "design/origem/v2-producao.css";
const DESTINO = "src/styles/tokens-v2.css";
const APLICAR = process.argv.includes("--aplicar");

/**
 * Tokens que o Tailwind declara por conta própria no `:root` (escala de texto,
 * container, cores base da paleta dele, animações). Não são do projeto e
 * copiá-los sobrescreveria o que o nosso Tailwind já define.
 */
const DO_TAILWIND =
  /^--(text|container|font-(weight|sans|serif|mono)|tracking|leading|default|animate|blur|aspect|ease|spacing$|breakpoint|perspective|drop-shadow|inset-shadow|text-shadow|color-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white|border)$)/;

/**
 * Escala de raio — tem de sair das CLASSES COMPILADAS, não do `:root`.
 *
 * O Tailwind v4 com `@theme inline` substitui a variável pelo valor ao gerar a
 * utilitária, então `--radius-2xl` e `--radius-3xl` não existem no `:root` do
 * CSS publicado: só aparecem dentro de `.rounded-2xl{border-radius:1.5rem}`.
 *
 * Isso não é detalhe: o v2 sobrescreve o padrão do Tailwind (2xl 1rem → 1.5rem,
 * 3xl 1.5rem → 1.75rem) e usa `--radius: 1rem`, enquanto este projeto está com
 * `--radius: 8px`. Sem trazer a escala, todo cartão sairia com metade do raio.
 */
function escalaDeRaio(css) {
  const achados = new Map();
  for (const [, nome, valor] of css.matchAll(/\.rounded-([a-z0-9]+)\{border-radius:([^;}]+)/g)) {
    achados.set(nome, valor.trim());
  }
  const escala = [];
  for (const nome of ["sm", "md", "lg", "xl", "2xl", "3xl"]) {
    const valor = achados.get(nome);
    if (!valor) continue;
    // `rounded-full` vem como 3.4e+38px (infinito do Tailwind); valor de projeto é 9999px
    escala.push([`--radius-${nome}`, valor]);
  }
  return escala;
}

/** Blocos `{...}` de um seletor, respeitando aninhamento. */
function blocos(css, seletor) {
  const saida = [];
  const re = new RegExp(seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[,{]", "g");
  let m;
  while ((m = re.exec(css)) !== null) {
    const abre = css.indexOf("{", m.index);
    if (abre < 0) continue;
    let nivel = 0;
    for (let i = abre; i < css.length; i++) {
      if (css[i] === "{") nivel++;
      else if (css[i] === "}") {
        nivel--;
        if (nivel === 0) {
          saida.push(css.slice(abre + 1, i));
          break;
        }
      }
    }
  }
  return saida;
}

function tokensDe(css, seletor) {
  const mapa = new Map();
  for (const bloco of blocos(css, seletor)) {
    for (const [, nome, valor] of bloco.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+)/g)) {
      if (DO_TAILWIND.test(nome)) continue;
      mapa.set(nome, valor.trim());
    }
  }
  return mapa;
}

/**
 * Agrupamento só para o arquivo sair legível — a ordem não muda o resultado,
 * mas um CSS de 140 tokens sem seções é ilegível para quem for revisar.
 */
const SECOES = [
  ["Superfícies", /^--(canvas|panel|surface|popover|glass|rim|hairline|border|input|halo)/],
  ["Tinta", /^--ink/],
  ["Marca", /^--brand/],
  ["Status", /^--(success|warning|danger|info|violet|destructive)/],
  ["KPI", /^--kpi-/],
  ["Painel noturno", /^--night-/],
  ["Gráficos", /^--chart-/],
  ["Sombras e raio", /^--(shadow|radius)/],
  ["Aliases shadcn", /^--(background|foreground|card|primary|secondary|muted|accent|ring|sidebar)/],
];

function emSecoes(mapa) {
  const usados = new Set();
  const blocos = [];
  for (const [titulo, re] of SECOES) {
    const linhas = [...mapa.entries()].filter(([k]) => re.test(k) && !usados.has(k));
    if (linhas.length === 0) continue;
    linhas.forEach(([k]) => usados.add(k));
    blocos.push({ titulo, linhas: linhas.sort(([a], [b]) => a.localeCompare(b)) });
  }
  const resto = [...mapa.entries()].filter(([k]) => !usados.has(k));
  if (resto.length > 0) blocos.push({ titulo: "Outros", linhas: resto.sort(([a], [b]) => a.localeCompare(b)) });
  return blocos;
}

const render = (blocos, indent = "  ") =>
  blocos
    .map(
      (b) =>
        `${indent}/* ${b.titulo} */\n` +
        b.linhas.map(([k, v]) => `${indent}${k}: ${v};`).join("\n")
    )
    .join("\n\n");

/**
 * `@theme inline` é o que faz `bg-surface`, `text-ink-3`, `border-rim`
 * existirem como classe no Tailwind v4. Sem isto os tokens ficam só como
 * variável CSS e todo uso vira `style={{}}` ou `bg-[var(--surface)]`.
 */
function tema(claro, raio) {
  const cor = (prefixo, re) =>
    [...claro.keys()]
      .filter((k) => re.test(k))
      .sort()
      .map((k) => `  --color-${prefixo}${k.replace("--", "")}: var(${k});`)
      .join("\n");

  return [
    "@theme inline {",
    "  /* cores do projeto viram classe: bg-surface, text-ink-3, border-rim... */",
    cor("", /^--(canvas|panel|surface|popover|glass|rim|hairline|halo|ink|brand|success|warning|danger|info|violet|night|kpi)/),
    "",
    "  /* Escala de raio do v2, lida das classes compiladas.",
    "     Com --radius: 1rem dá sm 10 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 28px. */",
    ...raio.map(([k, v]) => `  ${k}: ${v};`),
    "  --radius-tile: 0.85rem; /* IconTile e ícone do Panel; não existe no :root do v2 */",
    "",
    "  /* Sombras: `var()` de si mesma é o idioma do @theme inline — o Tailwind",
    "     substitui pelo valor de runtime, então shadow-card/float seguem o tema. */",
    "  --shadow-card: var(--shadow-card);",
    "  --shadow-float: var(--shadow-float);",
    "}",
  ].join("\n");
}

function main() {
  if (!existsSync(ORIGEM)) {
    console.error(`não achei ${ORIGEM}`);
    process.exit(1);
  }
  const css = readFileSync(ORIGEM, "utf8");
  const md5 = createHash("md5").update(readFileSync(ORIGEM)).digest("hex");

  const claro = tokensDe(css, ":root");
  const escuro = tokensDe(css, ".dark");
  const raio = escalaDeRaio(css);

  console.log(`origem: ${ORIGEM} (md5 ${md5})`);
  console.log(`tokens de projeto — claro: ${claro.size} · escuro: ${escuro.size}`);

  const soEscuro = [...escuro.keys()].filter((k) => !claro.has(k));
  const semEscuro = [...claro.keys()].filter((k) => !escuro.has(k));
  console.log(`  presentes só no escuro: ${soEscuro.length}${soEscuro.length ? " → " + soEscuro.join(", ") : ""}`);
  console.log(`  sem contraparte escura: ${semEscuro.length} (herdam o valor claro)`);
  console.log(`escala de raio: ${raio.map(([k, v]) => k.replace("--radius-", "") + "=" + v).join(" · ")}`);

  const conteudo = [
    "/* Tokens do Caleidoscópio v2 — GERADO, não editar à mão.",
    " *",
    ` * Origem: ${ORIGEM} (md5 ${md5})`,
    " * Gerador: tools/extrair-tokens-v2.mjs",
    ` * Gerado em: ${new Date().toISOString().slice(0, 10)}`,
    " *",
    " * Ajuste de token se faz no v2 e se reextrai, ou num arquivo de override",
    " * carregado depois deste. Editar aqui some na próxima extração.",
    " */",
    "",
    ":root {",
    render(emSecoes(claro)),
    "}",
    "",
    ".dark {",
    render(emSecoes(escuro)),
    "}",
    "",
    tema(claro, raio),
    "",
  ].join("\n");

  if (!APLICAR) {
    console.log(`\nsimulação. ${conteudo.split("\n").length} linhas seriam escritas em ${DESTINO}`);
    console.log("use --aplicar para gravar.");
    return;
  }

  writeFileSync(DESTINO, conteudo, "utf8");
  console.log(`\ngravado: ${DESTINO} (${conteudo.split("\n").length} linhas)`);
}

main();
