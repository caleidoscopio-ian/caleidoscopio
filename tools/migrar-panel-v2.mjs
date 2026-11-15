// Troca o `Card` do shadcn pelo `Panel` do kit v2 onde a forma é a mesma.
//
// Simula por padrão; `--aplicar` escreve. `--arquivo <caminho>` limita a um só.
//
// ## O que é convertido
//
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           <User className="h-5 w-5" />
//           Paciente
//         </CardTitle>
//         <CardDescription>Dados do cadastro</CardDescription>   (opcional)
//       </CardHeader>
//       <CardContent>…</CardContent>
//     </Card>
//
//               ↓
//
//     <Panel icone={<User />} titulo="Paciente" subtitulo="Dados do cadastro">
//       …
//     </Panel>
//
// O ícone do `CardTitle` vira `icone` e ganha o chip `IconTile` — é o cabeçalho
// de painel do v2. Sem o chip, o ícone fica solto do lado do texto, que é o que
// o projeto tinha.
//
// ## O que NÃO é convertido (de propósito)
//
// - `Card` com `CardFooter`: o `Panel` tem `rodape`, mas a ordem dos elementos
//   e o conteúdo do pé variam demais para adivinhar.
// - `Card` dentro de `map()` cujo cabeçalho depende do item: vira `Panel`
//   normalmente, isso funciona — o que não passa é cabeçalho condicional
//   (`{x ? <CardHeader …/> : null}`).
// - `Card` sem `CardHeader` (só `CardContent`): já parece um painel sem título
//   depois do ajuste dos primitivos. Trocar não mudaria pixel e só aumentaria
//   o diff.
// - `Card` com mais de um `CardContent`, ou com conteúdo entre o cabeçalho e o
//   corpo.
//
// Tudo que não casa é listado ao fim, com o motivo.

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import {
  fimDaAbertura,
  fimDaTag,
  fatiar,
  atributo,
  pularEspaco,
  reindentar,
  comoProp,
} from "./lib/jsx-mini.mjs";

const APLICAR = process.argv.includes("--aplicar");
const SO_ARQUIVO = (() => {
  const i = process.argv.indexOf("--arquivo");
  return i > 0 ? process.argv[i + 1] : null;
})();

/** Primeiro `<Icone … />` do começo do título, se houver. Devolve o nome e o
 *  texto restante. */
function separarIcone(interiorTitulo) {
  const t = interiorTitulo.replace(/^\s+/, "");
  const m = /^<([A-Z][\w.]*)\b([^>]*?)\/>/.exec(t);
  if (!m) return { icone: null, resto: interiorTitulo };
  // Só conta como ícone se o que sobra é texto — `<Badge>` no título é
  // conteúdo, não ícone.
  const resto = t.slice(m[0].length);
  return { icone: m[1], resto };
}

function converterArquivo(src, caminho) {
  const recusas = [];
  let saida = src;
  let feitas = 0;
  let de = 0;

  for (;;) {
    const card = acharCard(saida, de);
    if (card < 0) break;

    const motivo = (m) => {
      recusas.push(`${caminho}: ${m}`);
      de = card + 5; // segue para o próximo <Card
    };

    const corpoCard = fatiar(saida, card, "Card");
    if (!corpoCard || corpoCard.autoFechada) {
      motivo("<Card> sem fecho");
      continue;
    }
    if (/<CardFooter\b/.test(corpoCard.interior)) {
      motivo("tem CardFooter");
      continue;
    }

    // 1. CardHeader tem de ser o primeiro filho.
    let i = pularEspaco(corpoCard.interior, 0);
    if (!corpoCard.interior.startsWith("<CardHeader", i)) {
      motivo("sem CardHeader como primeiro filho");
      continue;
    }
    const header = fatiar(corpoCard.interior, i, "CardHeader");
    if (!header) {
      motivo("<CardHeader> sem fecho");
      continue;
    }

    // 2. Dentro do cabeçalho: CardTitle e, opcionalmente, CardDescription.
    let j = pularEspaco(header.interior, 0);
    if (!header.interior.startsWith("<CardTitle", j)) {
      motivo("CardHeader não começa com CardTitle");
      continue;
    }
    const title = fatiar(header.interior, j, "CardTitle");
    if (!title) {
      motivo("<CardTitle> sem fecho");
      continue;
    }
    j = pularEspaco(header.interior, title.fim);

    let desc = null;
    if (header.interior.startsWith("<CardDescription", j)) {
      desc = fatiar(header.interior, j, "CardDescription");
      if (!desc) {
        motivo("<CardDescription> sem fecho");
        continue;
      }
      j = pularEspaco(header.interior, desc.fim);
    }
    if (j < header.interior.length) {
      motivo("CardHeader tem conteúdo além de título e descrição");
      continue;
    }

    // 3. Depois do cabeçalho, um CardContent e nada mais.
    let k = pularEspaco(corpoCard.interior, header.fim);
    if (!corpoCard.interior.startsWith("<CardContent", k)) {
      motivo("sem CardContent logo após o CardHeader");
      continue;
    }
    const content = fatiar(corpoCard.interior, k, "CardContent");
    if (!content) {
      motivo("<CardContent> sem fecho");
      continue;
    }
    if (pularEspaco(corpoCard.interior, content.fim) < corpoCard.interior.length) {
      motivo("há conteúdo depois do CardContent");
      continue;
    }

    // 4. Monta o Panel.
    const { icone, resto } = separarIcone(title.interior);
    const propTitulo = comoProp(resto);
    if (!propTitulo) {
      motivo("título vazio");
      continue;
    }

    const recuo = (saida.slice(0, card).match(/([ \t]*)$/) || [, ""])[1];
    const d = recuo + "  ";
    const props = [];
    if (icone) props.push(`icone={<${icone} />}`);
    props.push(`titulo=${propTitulo}`);
    const propSub = desc && comoProp(desc.interior);
    if (propSub) props.push(`subtitulo=${propSub}`);

    // `className` do Card segue para o Panel: largura, coluna, altura mínima.
    const classe = atributo(corpoCard.abertura, "className");
    if (classe) props.push(`className="${classe}"`);
    // `key` precisa ficar no elemento de raiz, senão o React perde a lista.
    const chave = /\bkey=(\{[^}]*\}|"[^"]*")/.exec(corpoCard.abertura);
    if (chave) props.unshift(`key=${chave[1]}`);

    // A classe do CardContent (`pt-4`, `space-y-4`, `grid …`) é do corpo, não
    // do painel: viraria padding em cima do padding do Panel. Vai para um div.
    const classeCorpo = atributo(content.abertura, "className");
    const limpa = (classeCorpo || "")
      .split(/\s+/)
      .filter((c) => c && !/^(pt|pb|p|px|py)-\d+$/.test(c))
      .join(" ");

    const corpo = limpa
      ? `${d}<div className="${limpa}">\n${reindentar(content.interior, d.length + 2)}\n${d}</div>`
      : reindentar(content.interior, d.length);

    const umaLinha = props.join(" ").length + recuo.length + 10 <= 96;
    const cabecalho = umaLinha
      ? `<Panel ${props.join(" ")}>`
      : `<Panel\n${props.map((p) => d + p).join("\n")}\n${recuo}>`;

    const bloco = `${cabecalho}\n${corpo}\n${recuo}</Panel>`;
    // `corpoCard.fim` é índice ABSOLUTO em `saida` (o `fatiar` foi feito sobre
    // `saida`), ao contrário dos recortes do cabeçalho e do corpo, que são
    // relativos ao interior. Somar `card` aqui apagava `card` caracteres de
    // conteúdo depois do cartão — foi o que estragou 29 arquivos na primeira
    // execução.
    saida = saida.slice(0, card) + bloco + saida.slice(corpoCard.fim);
    feitas++;
    de = card + bloco.length;
  }

  return { saida, feitas, recusas };
}

/** Próximo `<Card` que seja o componente `Card`, não `CardHeader` & cia. */
function acharCard(src, de) {
  const re = /<Card(?=[\s/>])/g;
  re.lastIndex = de;
  const m = re.exec(src);
  return m ? m.index : -1;
}

/* ── Imports ──────────────────────────────────────────────────────────────
   Tira de `@/components/ui/card` o que deixou de ser usado e garante `Panel`
   em `@/components/kit`. Deixar import órfão viraria 40 avisos de lint. */

function ajustarImports(src) {
  let s = src;
  const usados = ["Card", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter"]
    .filter((n) => new RegExp(`<${n}(?=[\\s/>])`).test(s));

  s = s.replace(
    /import \{[^}]*\} from (['"])@\/components\/ui\/card\1;?\n/,
    usados.length === 0
      ? ""
      : (inteiro) => inteiro.replace(/\{[^}]*\}/, `{ ${usados.join(", ")} }`)
  );

  if (/\bPanel\b[\s\S]{0,200}?from (['"])@\/components\/kit\1/.test(s)) return s;
  const kit = /import \{([^}]*)\} from (['"])@\/components\/kit\2/.exec(s);
  if (kit) {
    return s.replace(kit[0], `import {${kit[1].replace(/\s*$/, "")}, Panel } from ${kit[2]}@/components/kit${kit[2]}`);
  }
  const pv = /^import [^\n]*;\s*$/m.test(s) ? ";" : "";
  const inicios = [...s.matchAll(/^import\b/gm)];
  if (inicios.length === 0) return s;
  const ultimo = inicios[inicios.length - 1].index;
  const from = s.indexOf("from", ultimo);
  const desloc = s.slice(from).search(/['"]/);
  if (desloc < 0) return s;
  const posAbre = from + desloc;
  const fecha = s.indexOf(s[posAbre], posAbre + 1);
  if (fecha < 0) return s;
  let fim = fecha + 1;
  if (s[fim] === ";") fim++;
  const q = s[posAbre];
  return s.slice(0, fim) + `\nimport { Panel } from ${q}@/components/kit${q}${pv}` + s.slice(fim);
}

/* ── Execução ─────────────────────────────────────────────────────────── */

const arquivos = SO_ARQUIVO
  ? [SO_ARQUIVO]
  : execSync('git ls-files "src/app/**/*.tsx" "src/components/**/*.tsx"', {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean)
      // O guia visual e a story do `Card` mostram o primitivo do shadcn de
      // propósito — é o que eles documentam.
      .filter((f) => !f.includes("design-system") && !f.includes("card.stories"));

let total = 0;
const tocados = [];
const recusas = [];

for (const caminho of arquivos) {
  const antes = readFileSync(caminho, "utf8");
  if (!/<Card(?=[\s/>])/.test(antes)) continue;
  const r = converterArquivo(antes, caminho);
  recusas.push(...r.recusas);
  if (r.feitas === 0) continue;
  total += r.feitas;
  tocados.push(`${caminho} (${r.feitas})`);
  if (APLICAR) writeFileSync(caminho, ajustarImports(r.saida), "utf8");
}

console.log(APLICAR ? "== APLICADO ==" : "== SIMULAÇÃO ==");
console.log(`\nCard → Panel: ${total} em ${tocados.length} arquivos`);
for (const t of tocados) console.log("  ok  " + t);

const porMotivo = new Map();
for (const r of recusas) {
  const m = r.split(": ").slice(1).join(": ");
  porMotivo.set(m, (porMotivo.get(m) || 0) + 1);
}
console.log(`\nRecusados: ${recusas.length}`);
for (const [m, n] of [...porMotivo].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${m}`);
}
