// Troca cor crua do Tailwind por token do design v2 (Módulo 28).
//
// O projeto tinha 967 usos de `text-gray-600`, `bg-blue-50`, `text-red-500` e
// afins espalhados por 113 arquivos. Duas consequências:
//
//   1. a paleta do v2 não alcança esses pontos — a tela fica metade migrada;
//   2. o modo noite não funciona neles: `bg-white` continua branco no escuro.
//
// A troca preserva o SIGNIFICADO, não só a cor: verde vira `success`, vermelho
// vira `danger`, âmbar vira `warning`, azul vira `brand`. Texto sobre fundo
// `-soft` usa a variante `-ink`, que é a corrigida para contraste.
//
//   node tools/migrar-cores-v2.mjs            # simula e conta
//   node tools/migrar-cores-v2.mjs --aplicar  # grava
//   node tools/migrar-cores-v2.mjs --aplicar src/app/agenda  # só um caminho

import { readFileSync, writeFileSync } from "fs";
import { readdirSync, statSync } from "fs";
import { join } from "path";

const APLICAR = process.argv.includes("--aplicar");
const ALVOS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const RAIZES = ALVOS.length > 0 ? ALVOS : ["src/app", "src/components"];

/**
 * Mapa família → token, por faixa de tom.
 *
 * `claro` = fundos (50/100/200), `medio` = ícone e borda (300/400/500),
 * `forte` = texto (600+). Texto sobre fundo soft usa `-ink`: é a cor
 * escurecida que passa em contraste (ver src/styles/tokens-ajustes.css).
 */
const FAMILIAS = {
  neutro: {
    familias: ["gray", "slate", "zinc", "neutral", "stone"],
    bg: { claro: "surface-sunken", medio: "surface-muted", forte: "ink-3" },
    text: { claro: "ink-4", medio: "ink-3", forte: "ink" },
    border: { claro: "hairline", medio: "border", forte: "border" },
  },
  marca: {
    familias: ["blue", "indigo", "sky"],
    bg: { claro: "brand-soft", medio: "brand", forte: "brand" },
    text: { claro: "brand", medio: "brand", forte: "brand" },
    border: { claro: "brand-soft", medio: "brand", forte: "brand" },
  },
  sucesso: {
    familias: ["green", "emerald", "teal", "lime"],
    bg: { claro: "success-soft", medio: "success", forte: "success" },
    text: { claro: "success-ink", medio: "success-ink", forte: "success-ink" },
    border: { claro: "success-soft", medio: "success", forte: "success" },
  },
  alerta: {
    familias: ["amber", "yellow", "orange"],
    bg: { claro: "warning-soft", medio: "warning", forte: "warning" },
    text: { claro: "warning-ink", medio: "warning-ink", forte: "warning-ink" },
    border: { claro: "warning-soft", medio: "warning", forte: "warning" },
  },
  perigo: {
    familias: ["red", "rose"],
    bg: { claro: "danger-soft", medio: "danger", forte: "danger" },
    text: { claro: "danger-ink", medio: "danger-ink", forte: "danger-ink" },
    border: { claro: "danger-soft", medio: "danger", forte: "danger" },
  },
  roxo: {
    familias: ["purple", "violet", "fuchsia", "pink"],
    bg: { claro: "violet-soft", medio: "violet", forte: "violet" },
    text: { claro: "violet-ink", medio: "violet-ink", forte: "violet-ink" },
    border: { claro: "violet-soft", medio: "violet", forte: "violet" },
  },
};

const PREFIXOS = {
  bg: "bg",
  text: "text",
  border: "border",
  from: "bg",
  to: "bg",
  via: "bg",
  ring: "border",
  divide: "border",
  fill: "text",
  stroke: "text",
};

const porFamilia = new Map();
for (const grupo of Object.values(FAMILIAS)) {
  for (const f of grupo.familias) porFamilia.set(f, grupo);
}

const faixa = (tom) => (tom <= 200 ? "claro" : tom <= 500 ? "medio" : "forte");

/** `bg-blue-600` → `bg-brand`. Devolve null quando não há mapeamento. */
function traduzir(prefixo, familia, tom) {
  const grupo = porFamilia.get(familia);
  if (!grupo) return null;
  const canal = PREFIXOS[prefixo];
  if (!canal) return null;
  const token = grupo[canal]?.[faixa(Number(tom))];
  if (!token) return null;
  // gradiente mantém o próprio prefixo (from-/to-/via-), só troca a cor
  const saida = ["from", "to", "via"].includes(prefixo) ? prefixo : canal;
  return `${saida}-${token}`;
}

const RE = new RegExp(
  `\\b(${Object.keys(PREFIXOS).join("|")})-(${[...porFamilia.keys()].join("|")})-(50|100|200|300|400|500|600|700|800|900|950)\\b`,
  "g"
);

function arquivos(raiz) {
  const saida = [];
  const andar = (dir) => {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      const st = statSync(caminho);
      if (st.isDirectory()) andar(caminho);
      else if (/\.tsx?$/.test(nome) && !/\.stories\./.test(nome)) saida.push(caminho);
    }
  };
  andar(raiz);
  return saida;
}

let totalTrocas = 0;
let totalArquivos = 0;
const porTroca = new Map();

for (const raiz of RAIZES) {
  for (const caminho of arquivos(raiz)) {
    const antes = readFileSync(caminho, "utf8");
    let trocas = 0;
    const depois = antes.replace(RE, (inteiro, prefixo, familia, tom) => {
      const novo = traduzir(prefixo, familia, tom);
      if (!novo) return inteiro;
      trocas++;
      porTroca.set(`${inteiro} → ${novo}`, (porTroca.get(`${inteiro} → ${novo}`) ?? 0) + 1);
      return novo;
    });
    if (trocas === 0) continue;
    totalTrocas += trocas;
    totalArquivos++;
    if (APLICAR) writeFileSync(caminho, depois, "utf8");
  }
}

console.log(APLICAR ? "== APLICADO ==" : "== SIMULAÇÃO (use --aplicar) ==");
console.log(`arquivos: ${totalArquivos} · trocas: ${totalTrocas}\n`);
console.log("as 15 trocas mais frequentes:");
for (const [troca, n] of [...porTroca.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${String(n).padStart(4)}×  ${troca}`);
}
