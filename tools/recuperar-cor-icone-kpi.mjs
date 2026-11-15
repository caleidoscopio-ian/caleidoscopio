// Devolve ao `StatCard` a cor do ícone que o cartão original tinha.
// Simula por padrão; `--aplicar` escreve.
//
// ## Por que existe
//
// Em metade dos cartões de indicador deste projeto o significado estava **no
// ícone**, não no número:
//
//     <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
//     <Clock className="h-4 w-4 text-green-600" />
//     …
//     <div className="text-2xl font-bold">{n}</div>   ← sem cor
//
// `migrar-statcard-v2.mjs` preserva a cor do número (limiar) mas descarta a do
// ícone, e com ela o único sinal de que "Confirmados" é bom e "Faltas" é ruim.
// São 37 cartões em 15 arquivos — perda pequena e sistemática, do tipo que
// ninguém nota de uma vez e todo mundo sente.
//
// Em vez de reverter e reconverter, este passe lê o cartão **de volta no
// `HEAD`**, casa pelo texto do rótulo e reaplica a cor já traduzida para
// token. A tradução é a mesma de `migrar-cores-v2.mjs` (família → token), por
// isso a tabela abaixo é um recorte dela, não um palpite.

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { fimDaAbertura } from "./lib/jsx-mini.mjs";

const APLICAR = process.argv.includes("--aplicar");

/** Recorte de `FAMILIAS` em migrar-cores-v2.mjs: só a linha `text`. */
const TOKEN_POR_FAMILIA = {
  gray: null, slate: null, zinc: null, neutral: null, stone: null, // sem significado
  blue: "text-brand", indigo: "text-brand", sky: "text-brand",
  green: "text-success-ink", emerald: "text-success-ink",
  teal: "text-success-ink", lime: "text-success-ink",
  amber: "text-warning-ink", yellow: "text-warning-ink", orange: "text-warning-ink",
  red: "text-danger-ink", rose: "text-danger-ink",
  purple: "text-violet-ink", violet: "text-violet-ink",
  fuchsia: "text-violet-ink", pink: "text-violet-ink",
};

/** Mapa `rótulo → classe de cor` lido de uma versão antiga do arquivo. */
function coresDoOriginal(fonte) {
  const mapa = new Map();
  // Cabeçalho de KPI: <CardTitle …>Rótulo</CardTitle> seguido de <Icone …/>
  const re =
    /<CardTitle[^>]*>([\s\S]*?)<\/CardTitle>\s*<([A-Z][\w.]*)\b([^>]*?)\/>/g;
  let m;
  while ((m = re.exec(fonte))) {
    const rotulo = m[1].trim().replace(/\s+/g, " ");
    const classe = (/className="([^"]*)"/.exec(m[3]) || [, ""])[1];
    const cor = corSignificativa(classe);
    if (cor) mapa.set(rotulo, cor);
  }
  // Forma B: <Icone …/> antes de <p …>Rótulo</p>
  const reB = /<([A-Z][\w.]*)\b([^>]*?)\/>\s*<div[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/g;
  while ((m = reB.exec(fonte))) {
    const classe = (/className="([^"]*)"/.exec(m[2]) || [, ""])[1];
    const cor = corSignificativa(classe);
    const rotulo = m[3].trim().replace(/\s+/g, " ");
    if (cor && !mapa.has(rotulo)) mapa.set(rotulo, cor);
  }
  return mapa;
}

function corSignificativa(classe) {
  // Já migrado para token
  const tok = /\btext-(success-ink|warning-ink|danger-ink|violet-ink|brand)\b/.exec(classe);
  if (tok) return `text-${tok[1]}`;
  // Ainda em cor crua do Tailwind
  const crua = /\btext-([a-z]+)-\d{3}\b/.exec(classe);
  if (crua) return TOKEN_POR_FAMILIA[crua[1]] ?? null;
  return null;
}

const arquivos = execSync('git ls-files "src/app/**/*.tsx" "src/components/**/*.tsx"', {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

let total = 0;
const tocados = [];

for (const caminho of arquivos) {
  const atual = readFileSync(caminho, "utf8");
  if (!/<StatCard\b/.test(atual)) continue;

  let original;
  try {
    original = execSync(`git show "HEAD:${caminho.replace(/\\/g, "/")}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    continue; // arquivo novo, não há original
  }

  const cores = coresDoOriginal(original);
  if (cores.size === 0) continue;

  let n = 0;
  let saida = atual;
  // O recorte do StatCard NÃO pode ser `[\s\S]*?\/>`: o próprio `icone={<Users
  // />}` tem um `/>` dentro, e a expressão pararia ali, antes do `rotulo`.
  // `fimDaAbertura` conta chaves e aspas, então para no `/>` certo.
  let de = 0;
  for (;;) {
    const abre = saida.indexOf("<StatCard", de);
    if (abre < 0) break;
    const fim = fimDaAbertura(saida, abre);
    if (fim < 0) break;
    const bloco = saida.slice(abre, fim);
    const rot = /\brotulo="([^"]*)"/.exec(bloco);
    const cor = rot && cores.get(rot[1].trim().replace(/\s+/g, " "));
    if (cor) {
      const novo = bloco.replace(
        /icone=\{<([A-Z][\w.]*) \/>\}/,
        (_, nome) => `icone={<${nome} className="${cor}" />}`
      );
      if (novo !== bloco) {
        saida = saida.slice(0, abre) + novo + saida.slice(fim);
        n++;
        de = abre + novo.length;
        continue;
      }
    }
    de = fim;
  }

  if (n === 0) continue;
  total += n;
  tocados.push(`${caminho} (${n})`);
  if (APLICAR) writeFileSync(caminho, saida, "utf8");
}

console.log(APLICAR ? "== APLICADO ==" : "== SIMULAÇÃO ==");
console.log(`\nCor de ícone recuperada: ${total} indicadores em ${tocados.length} arquivos`);
for (const t of tocados) console.log("  ok  " + t);
