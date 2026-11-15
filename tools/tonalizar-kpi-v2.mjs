// Aplica a fileira pastel do v2 aos indicadores: tom por posição, destaque no
// primeiro e a grade certa. Simula por padrão; `--aplicar` escreve.
//
// ## A regra, lida do clone navegável
//
// | nº | grade | tons | tamanho |
// |---|---|---|---|
// | 4 | `grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]` | blue · lavender · mint · peach | 1º `hero`, resto `md` |
// | 3 | `grid gap-4 sm:grid-cols-3` | blue · mint · peach | `md` |
// | 2 | `grid gap-4 sm:grid-cols-2` | blue · mint | `md` |
// | 5+ | a grade do arquivo | ciclo blue · lavender · mint · peach | `sm` |
//
// O destaque do primeiro cartão vem do **grid** (`1.25fr`), não só do corpo da
// fonte — era o detalhe que fazia a fileira de quatro parecer igual à do v2 em
// tudo menos na proporção.
//
// Fileira de 5 ou mais não existe no v2 (é coisa das telas dos Módulos 25-27).
// Aí o ciclo continua e o tamanho cai para `sm`: seis números de 3.25rem em
// seis colunas não cabem.
//
// Só mexe em grade cujos filhos diretos são **todos** `StatCard` literais.
// `map()` e condicional são recusados: sem saber quantos cartões saem, não dá
// para atribuir tom por posição.

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { fimDaAbertura, fimDaTag, atributo, pularEspaco } from "./lib/jsx-mini.mjs";

const APLICAR = process.argv.includes("--aplicar");

const POR_QUANTIDADE = {
  2: { tons: ["blue", "mint"], grade: "grid gap-4 sm:grid-cols-2", heroi: false },
  3: { tons: ["blue", "mint", "peach"], grade: "grid gap-4 sm:grid-cols-3", heroi: false },
  4: {
    tons: ["blue", "lavender", "mint", "peach"],
    grade: "grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]",
    heroi: true,
  },
};
const CICLO = ["blue", "lavender", "mint", "peach"];

/** Troca (ou acrescenta) uma prop literal na abertura de um elemento. */
function comProp(abertura, nome, valor) {
  const re = new RegExp(`\\s${nome}="[^"]*"`);
  if (re.test(abertura)) {
    return valor === null
      ? abertura.replace(re, "")
      : abertura.replace(re, ` ${nome}="${valor}"`);
  }
  if (valor === null) return abertura;
  // Entra logo depois do nome da tag, para ficar antes de `icone`/`rotulo`.
  return abertura.replace(/^<StatCard/, `<StatCard ${nome}="${valor}"`);
}

function converter(src, caminho) {
  const recusas = [];
  let saida = src;
  let grades = 0;
  let cartoes = 0;
  let de = 0;

  for (;;) {
    const abre = saida.indexOf('<div className="', de);
    if (abre < 0) break;
    const fimAb = fimDaAbertura(saida, abre);
    if (fimAb < 0) break;
    const aberturaDiv = saida.slice(abre, fimAb);
    de = fimAb;

    const classe = atributo(aberturaDiv, "className") || "";
    if (!/\bgrid\b/.test(classe)) continue;

    const fimDiv = fimDaTag(saida, abre, "div");
    if (fimDiv < 0) continue;
    const interior = saida.slice(fimAb, fimDiv - "</div>".length);

    // Filhos diretos: todos têm de ser <StatCard … />
    const filhos = [];
    let i = pularEspaco(interior, 0);
    let soStatCard = true;
    while (i < interior.length) {
      if (!interior.startsWith("<StatCard", i)) {
        soStatCard = false;
        break;
      }
      const f = fimDaAbertura(interior, i);
      if (f < 0 || interior[f - 2] !== "/") {
        soStatCard = false;
        break;
      }
      filhos.push([i, f]);
      i = pularEspaco(interior, f);
    }
    if (!soStatCard || filhos.length === 0) {
      if (/\bStatCard\b/.test(interior) && !soStatCard)
        recusas.push(`${caminho}: grade com StatCard em map() ou condicional`);
      continue;
    }

    const n = filhos.length;
    const regra = POR_QUANTIDADE[n];
    const tons = regra ? regra.tons : filhos.map((_, k) => CICLO[k % CICLO.length]);

    // Reescreve de trás para frente, para os índices não escorregarem.
    let novoInterior = interior;
    for (let k = n - 1; k >= 0; k--) {
      const [ini, fim] = filhos[k];
      let abertura = novoInterior.slice(ini, fim);
      abertura = comProp(abertura, "tom", tons[k]);
      const tamanho = regra
        ? regra.heroi && k === 0
          ? "hero"
          : null // `md` é o padrão do componente
        : "sm";
      abertura = comProp(abertura, "size", tamanho);
      novoInterior = novoInterior.slice(0, ini) + abertura + novoInterior.slice(fim);
      cartoes++;
    }

    // Grade: troca as colunas, preservando o que não é de coluna
    // (`anim-escalonada`, `mb-6`, `col-span-*` de quem usa).
    let novaAbertura = aberturaDiv;
    if (regra) {
      const extras = classe
        .split(/\s+/)
        .filter(
          (c) =>
            c &&
            !/^(grid|gap-\d+|(sm|md|lg|xl|2xl):)?grid-cols-/.test(c) &&
            c !== "grid" &&
            !/^gap-/.test(c) &&
            !/^(sm|md|lg|xl|2xl):grid-cols-/.test(c)
        );
      novaAbertura = aberturaDiv.replace(
        /className="[^"]*"/,
        `className="${[...extras, regra.grade].join(" ")}"`
      );
    }

    saida =
      saida.slice(0, abre) +
      novaAbertura +
      novoInterior +
      saida.slice(fimDiv - "</div>".length);
    grades++;
    de = abre + novaAbertura.length + novoInterior.length;
  }

  return { saida, grades, cartoes, recusas };
}

const arquivos = execSync('git ls-files "src/app/**/*.tsx" "src/components/**/*.tsx"', {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  // O guia visual mostra os tons de propósito, um a um.
  .filter((f) => !f.includes("design-system"));

let totG = 0;
let totC = 0;
const tocados = [];
const recusas = [];

for (const caminho of arquivos) {
  const antes = readFileSync(caminho, "utf8");
  if (!antes.includes("<StatCard")) continue;
  const r = converter(antes, caminho);
  recusas.push(...r.recusas);
  if (r.grades === 0) continue;
  totG += r.grades;
  totC += r.cartoes;
  tocados.push(`${caminho} (${r.grades} fileira(s), ${r.cartoes} cartões)`);
  if (APLICAR) writeFileSync(caminho, r.saida, "utf8");
}

console.log(APLICAR ? "== APLICADO ==" : "== SIMULAÇÃO ==");
console.log(`\n${totC} indicadores em ${totG} fileiras, ${tocados.length} arquivos`);
for (const t of tocados) console.log("  ok  " + t);
console.log(`\nRecusados: ${recusas.length}`);
for (const r of [...new Set(recusas)]) console.log("  --  " + r);
