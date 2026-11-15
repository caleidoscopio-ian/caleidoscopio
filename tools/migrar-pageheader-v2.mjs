// Troca o cabeçalho artesanal das páginas pelo `PageHeader` do kit v2.
//
// Simula por padrão; `--aplicar` escreve. Rodar de novo é inócuo: página que
// já usa `PageHeader` não tem mais `<h1>` solto para casar.
//
// ## Por que um codemod e não busca-e-troca
//
// O bloco a substituir é uma árvore JSX, não uma linha:
//
//   <div className="flex items-center justify-between">   ← invólucro
//     <div>
//       <h1>Título</h1>
//       <p className="text-muted-foreground">Subtítulo</p>
//     </div>
//     <Button …/>                                          ← ações
//   </div>
//
// Casar isso com expressão regular erra nos aninhados. Aqui há um casador de
// tags que conta profundidade, e **tudo que não casa exatamente é recusado e
// listado** — a conversão de cabeçalho com ícone, badge ou botão "Voltar" fica
// para a mão, que é onde ela deve ficar.

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const APLICAR = process.argv.includes("--aplicar");

/* ── Casador de tags ───────────────────────────────────────────────────────
   Devolve o índice logo após o `</nome>` que fecha a tag aberta em `abre`.
   Conta profundidade para sobreviver a aninhamento (`<div>` dentro de `<div>`),
   e trata a tag auto-fechada. */

function fimDaTag(src, abre, nome) {
  const fimAbertura = fimDaAbertura(src, abre);
  if (fimAbertura < 0) return -1;
  if (src[fimAbertura - 2] === "/") return fimAbertura; // <div ... />

  let i = fimAbertura;
  let profundidade = 1;
  const re = new RegExp(`</?${nome}(?=[\\s/>])`, "g");
  re.lastIndex = i;
  let m;
  while ((m = re.exec(src))) {
    if (m[0][1] === "/") {
      profundidade--;
      if (profundidade === 0) return src.indexOf(">", m.index) + 1;
    } else {
      const f = fimDaAbertura(src, m.index);
      if (f > 0 && src[f - 2] !== "/") profundidade++;
    }
    re.lastIndex = m.index + m[0].length;
  }
  return -1;
}

/** Índice logo após o `>` que fecha a abertura da tag em `abre`. Pula `>`
 *  dentro de string e dentro de `{…}` (arrow functions têm `=>`). */
function fimDaAbertura(src, abre) {
  let i = abre + 1;
  let chaves = 0;
  let aspas = null;
  while (i < src.length) {
    const c = src[i];
    if (aspas) {
      if (c === aspas) aspas = null;
    } else if (c === '"' || c === "'" || c === "`") {
      aspas = c;
    } else if (c === "{") {
      chaves++;
    } else if (c === "}") {
      chaves--;
    } else if (c === ">" && chaves === 0) {
      return i + 1;
    }
    i++;
  }
  return -1;
}

/** Recua sobre espaço em branco e comentários JSX (`{/* … *␣/}`). */
function antesDeEspacoEComentario(src, i) {
  for (;;) {
    const antes = i;
    while (i > 0 && /\s/.test(src[i - 1])) i--;
    if (src.slice(0, i).endsWith("*/}")) {
      const abre = src.lastIndexOf("{/*", i);
      if (abre >= 0) i = abre;
    }
    if (i === antes) return i;
  }
}

function pularEspaco(src, i) {
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

/* ── Valor de prop ────────────────────────────────────────────────────────
   Texto puro vira string; `{expr}` sozinho passa direto; o resto vira
   fragmento. Sem isso, `<h1>{paciente.nome}</h1>` sairia com as chaves no meio
   de uma string. */

function comoProp(bruto) {
  const texto = bruto.trim().replace(/\s+/g, " ");
  if (!texto) return null;
  if (!/[<{]/.test(texto)) {
    return `"${texto.replace(/"/g, "&quot;")}"`;
  }
  if (texto.startsWith("{") && texto.endsWith("}") && equilibrado(texto.slice(1, -1))) {
    return texto;
  }
  return `{<>${texto}</>}`;
}

function equilibrado(s) {
  let n = 0;
  for (const c of s) {
    if (c === "{") n++;
    else if (c === "}") n--;
    if (n < 0) return false;
  }
  return n === 0;
}

/** Reindenta um bloco de ações para caber dentro de `acoes={…}`. */
function reindentar(bruto, alvo) {
  const linhas = bruto.replace(/\s+$/, "").split("\n");
  const base = Math.min(
    ...linhas.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length)
  );
  return linhas
    .map((l) => (l.trim() ? " ".repeat(alvo) + l.slice(base) : ""))
    .join("\n");
}

/* ── Conversão de um arquivo ───────────────────────────────────────────── */

const CLASSES_SUB = /text-muted-foreground|text-ink-3|text-ink-2|text-sm/;

function converter(src, caminho) {
  const recusas = [];
  let saida = src;
  let convertidas = 0;

  for (;;) {
    const h1 = saida.indexOf("<h1");
    if (h1 < 0) break;

    const r = (motivo) => {
      recusas.push(`${caminho}: ${motivo}`);
      // Marca o h1 para não entrar em laço infinito; desmarcado no fim.
      saida = saida.slice(0, h1) + "<\u0000h1" + saida.slice(h1 + 3);
    };

    const fimH1 = fimDaTag(saida, h1, "h1");
    if (fimH1 < 0) {
      r("</h1> não encontrado");
      continue;
    }
    const aberturaH1 = fimDaAbertura(saida, h1);
    const titulo = saida.slice(aberturaH1, fimH1 - "</h1>".length);

    // 1. Antes do <h1> tem de vir a abertura de um <div>, nada mais.
    const antesH1 = antesDeEspacoEComentario(saida, h1);
    if (!saida.slice(0, antesH1).endsWith(">")) {
      r("o que precede o <h1> não é a abertura de um elemento");
      continue;
    }
    const divInterna = saida.lastIndexOf("<div", antesH1);
    if (divInterna < 0 || fimDaAbertura(saida, divInterna) !== antesH1) {
      r("<h1> não é o primeiro filho de um <div> (ícone ou botão antes?)");
      continue;
    }

    // 2. Subtítulo opcional, só se for um <p> de texto secundário.
    let i = pularEspaco(saida, fimH1);
    let subtitulo = null;
    if (saida.startsWith("<p", i)) {
      const fimP = fimDaTag(saida, i, "p");
      const aberturaP = fimDaAbertura(saida, i);
      const classes = saida.slice(i, aberturaP);
      if (fimP > 0 && CLASSES_SUB.test(classes)) {
        subtitulo = saida.slice(aberturaP, fimP - "</p>".length);
        i = pularEspaco(saida, fimP);
      }
    }

    // 3. O <div> interno tem de terminar aqui — senão há conteúdo que o
    //    PageHeader não sabe exibir (badge, CNPJ, linha de status…).
    if (!saida.startsWith("</div>", i)) {
      r("o <div> do título tem mais conteúdo além de h1 + p");
      continue;
    }
    const fimDivInterna = i + "</div>".length;

    // 4. Invólucro opcional: um <div> flex que também abriga as ações.
    const antesDaInterna = antesDeEspacoEComentario(saida, divInterna);
    let inicioBloco = divInterna;
    let fimBloco = fimDivInterna;
    let acoes = null;

    if (saida.slice(0, antesDaInterna).endsWith(">")) {
      const divExterna = saida.lastIndexOf("<div", antesDaInterna);
      const aberturaExterna =
        divExterna >= 0 ? saida.slice(divExterna, fimDaAbertura(saida, divExterna)) : "";
      if (
        divExterna >= 0 &&
        fimDaAbertura(saida, divExterna) === antesDaInterna &&
        /className="[^"]*\bflex\b[^"]*"/.test(aberturaExterna) &&
        !/\bflex-col\b/.test(aberturaExterna)
      ) {
        const fimExterna = fimDaTag(saida, divExterna, "div");
        if (fimExterna > 0) {
          const resto = saida.slice(fimDivInterna, fimExterna - "</div>".length);
          if (resto.trim()) acoes = resto;
          inicioBloco = divExterna;
          fimBloco = fimExterna;
        }
      }
    }

    const propTitulo = comoProp(titulo);
    if (!propTitulo) {
      r("título vazio");
      continue;
    }

    const recuo = (saida.slice(0, inicioBloco).match(/([ \t]*)$/) || [, ""])[1];
    const d = recuo + "  ";
    const partes = [`${d}titulo=${propTitulo}`];
    const propSub = subtitulo && comoProp(subtitulo);
    if (propSub) partes.push(`${d}subtitulo=${propSub}`);
    if (acoes) {
      const umaSo = /^\s*<[A-Za-z]/.test(acoes) && contarRaizes(acoes) === 1;
      const corpo = reindentar(acoes, d.length + 2);
      partes.push(
        umaSo
          ? `${d}acoes={\n${corpo}\n${d}}`
          : `${d}acoes={\n${d}  <>\n${reindentar(acoes, d.length + 4)}\n${d}  </>\n${d}}`
      );
    }

    const bloco = `<PageHeader\n${partes.join("\n")}\n${recuo}/>`;
    saida = saida.slice(0, inicioBloco) + bloco + saida.slice(fimBloco);
    convertidas++;
  }

  saida = saida.replace(/<\u0000h1/g, "<h1");
  return { saida, convertidas, recusas };
}

/** Quantos elementos de raiz há no bloco de ações. */
function contarRaizes(bloco) {
  let i = pularEspaco(bloco, 0);
  let n = 0;
  while (i < bloco.length) {
    if (bloco[i] === "<") {
      const nome = (bloco.slice(i + 1).match(/^[A-Za-z][\w.]*/) || [])[0];
      if (!nome) return 99;
      const f = fimDaTag(bloco, i, nome);
      if (f < 0) return 99;
      i = pularEspaco(bloco, f);
      n++;
    } else if (bloco[i] === "{") {
      let chaves = 0;
      while (i < bloco.length) {
        if (bloco[i] === "{") chaves++;
        else if (bloco[i] === "}" && --chaves === 0) {
          i++;
          break;
        }
        i++;
      }
      i = pularEspaco(bloco, i);
      n++;
    } else return 99;
  }
  return n;
}

/* ── Import do kit ────────────────────────────────────────────────────── */

export function garantirImport(src) {
  // Metade das páginas não usa ponto e vírgula. Seguir o estilo do arquivo
  // evita 36 diffs de formatação que não têm nada a ver com o cabeçalho.
  const pv = /^import [^\n]*;\s*$/m.test(src) ? ";" : "";
  const kit = /from (['"])@\/components\/kit\1/.exec(src);

  if (kit) {
    if (/\bPageHeader\b[\s\S]{0,200}?from (['"])@\/components\/kit\1/.test(src)) return src;
    return src.replace(
      /import \{([^}]*)\} from (['"])@\/components\/kit\2/,
      (_, dentro, q) =>
        `import {${dentro.replace(/\s*$/, "")}, PageHeader } from ${q}@/components/kit${q}`
    );
  }

  // Depois do ÚLTIMO import, para não entrar antes de um "use client".
  // O statement acaba na aspa de fecho do especificador, não no fim da linha:
  // import multilinha (`import {\n  a,\n} from "x"`) é comum aqui.
  const inicios = [...src.matchAll(/^import\b/gm)];
  if (inicios.length === 0) return src;
  const ultimo = inicios[inicios.length - 1].index;
  const from = src.indexOf("from", ultimo);
  const base = from < 0 ? ultimo : from;
  const abre = src.search(/['"]/) >= 0 ? proximaAspa(src, base) : -1;
  if (abre < 0) return src;
  const fecha = src.indexOf(src[abre], abre + 1);
  if (fecha < 0) return src;
  let fim = fecha + 1;
  if (src[fim] === ";") fim++;

  const q = src[abre];
  return (
    src.slice(0, fim) +
    `\nimport { PageHeader } from ${q}@/components/kit${q}${pv}` +
    src.slice(fim)
  );
}

function proximaAspa(src, de) {
  for (let i = de; i < src.length; i++) if (src[i] === '"' || src[i] === "'") return i;
  return -1;
}

/* ── Execução ─────────────────────────────────────────────────────────── */

// Telas que não são telas do produto: splash, erro centralizado, páginas de
// teste e de depuração. O `PageHeader` alinha à esquerda e abriga ações —
// num layout centrado ele desalinha tudo.
const FORA = [
  "src/app/page.tsx",
  "src/app/login/page.tsx",
  "src/app/logout/page.tsx",
  "src/app/sem-permissao/page.tsx",
  "src/app/debug-env/page.tsx",
  "src/app/test-dashboard/page.tsx",
];

const arquivos = execSync('git ls-files "src/app/**/page.tsx"', { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => !FORA.includes(f.replace(/\\/g, "/")));

let totalConvertidas = 0;
const tocados = [];
const todasRecusas = [];

for (const caminho of arquivos) {
  const antes = readFileSync(caminho, "utf8");
  if (!antes.includes("<h1")) continue;
  const { saida, convertidas, recusas } = converter(antes, caminho);
  todasRecusas.push(...recusas);
  if (convertidas === 0) continue;
  const comImport = garantirImport(saida);
  totalConvertidas += convertidas;
  tocados.push(`${caminho} (${convertidas})`);
  if (APLICAR) writeFileSync(caminho, comImport, "utf8");
}

console.log(APLICAR ? "== APLICADO ==" : "== SIMULAÇÃO ==");
console.log(`\nConvertidos: ${totalConvertidas} cabeçalhos em ${tocados.length} arquivos`);
for (const t of tocados) console.log("  ok  " + t);
console.log(`\nRecusados (para a mão): ${todasRecusas.length}`);
for (const r of todasRecusas) console.log("  --  " + r);
