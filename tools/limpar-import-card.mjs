// Tira de `@/components/ui/card` o que o arquivo deixou de usar depois da
// migração para `Panel`. Simula por padrão; `--aplicar` escreve.
//
// Existe separado do codemod porque o import do shadcn aparece em quatro
// formas no projeto (uma linha ou várias, aspas simples ou duplas, com ou sem
// ponto e vírgula) e misturar isso com a transformação de JSX só tornava o
// codemod mais frágil. Aqui a regra é trivial: nome que não aparece mais como
// `<Nome` sai da lista; lista vazia tira o import inteiro.

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const APLICAR = process.argv.includes("--aplicar");
const NOMES = ["Card", "CardAction", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter"];

const arquivos = execSync('git ls-files "src/**/*.tsx"', { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

let tocados = 0;
let removidos = 0;

for (const caminho of arquivos) {
  const antes = readFileSync(caminho, "utf8");
  const re = /import\s*\{([^}]*)\}\s*from\s*(['"])@\/components\/ui\/card\2;?[ \t]*\r?\n/;
  const m = re.exec(antes);
  if (!m) continue;

  const declarados = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const semImport = antes.slice(0, m.index) + antes.slice(m.index + m[0].length);
  const usados = declarados.filter((n) =>
    new RegExp(`<${n.replace(/[^\w]/g, "")}(?=[\\s/>])`).test(semImport)
  );
  if (usados.length === declarados.length) continue;

  const q = m[2];
  const pv = m[0].includes(";") ? ";" : "";
  const nl = m[0].endsWith("\r\n") ? "\r\n" : "\n";
  const novo =
    usados.length === 0
      ? semImport
      : antes.slice(0, m.index) +
        `import { ${usados.join(", ")} } from ${q}@/components/ui/card${q}${pv}${nl}` +
        antes.slice(m.index + m[0].length);

  tocados++;
  if (usados.length === 0) removidos++;
  if (APLICAR) writeFileSync(caminho, novo, "utf8");
  console.log(
    `  ${usados.length === 0 ? "removido" : "reduzido"}  ${caminho}  [${declarados.length} → ${usados.length}]`
  );
}

console.log(APLICAR ? "== APLICADO ==" : "== SIMULAÇÃO ==");
console.log(`\n${tocados} arquivos ajustados (${removidos} sem nenhum uso restante)`);
void NOMES;
