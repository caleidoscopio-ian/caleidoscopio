// Troca o cartão de indicador (`Card` + rótulo + número grande) pelo
// `StatCard` do kit v2. Simula por padrão; `--aplicar` escreve;
// `--arquivo <caminho>` limita a um só.
//
// ## As três formas que o projeto usa
//
// A) cabeçalho com rótulo e ícone, corpo com o número
//
//      <Card>
//        <CardHeader className="flex flex-row items-center justify-between …">
//          <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
//          <Clock className="h-4 w-4 text-success-ink" />
//        </CardHeader>
//        <CardContent>
//          <div className="text-2xl font-bold">{n}</div>
//          <p className="text-xs text-muted-foreground">no período</p>
//        </CardContent>
//      </Card>
//
// B) ícone à esquerda, rótulo e número à direita
//
//      <Card><CardContent className="pt-4">
//        <div className="flex items-center gap-2">
//          <Calendar className="h-4 w-4 text-muted-foreground" />
//          <div>
//            <p className="text-xs text-muted-foreground">Agendamentos</p>
//            <p className="text-xl font-bold">{n}</p>
//          </div>
//        </div>
//      </CardContent></Card>
//
// C) sem ícone: rótulo e número
//
//      <Card><CardContent className="pt-4">
//        <p className="text-xs text-muted-foreground">Validade</p>
//        <p className="text-xl font-bold">{n}</p>
//      </CardContent></Card>
//
// Todas viram:
//
//      <StatCard size="sm" icone={<Clock />} rotulo="Confirmados"
//                valor={n} hint="no período" />
//
// ## Decisões
//
// **`tom="white"` (o padrão), não gradiente.** O gradiente pastel do v2 é a
// linha de destaque do dashboard — uma por produto. Numa fileira de seis
// indicadores ele vira ruído, e `frontend.md` pede o contrário ("sem elementos
// que sobrecarreguem"). Quem quiser gradiente passa `tom` à mão, como o
// dashboard faz.
//
// **A cor do número sobrevive.** `text-danger-ink` num número é limiar
// (ocupação acima de 100%), não enfeite: vira um `<span>` com a mesma classe
// dentro de `valor`, e a cor do filho vence a do `StatCard`.
//
// **`size="sm"`** (152px) porque essas fileiras têm de 3 a 6 colunas. O tamanho
// cheio (208px) é para a fileira de quatro do dashboard.

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { fatiar, atributo, pularEspaco, comoProp } from "./lib/jsx-mini.mjs";

const APLICAR = process.argv.includes("--aplicar");
const SO_ARQUIVO = (() => {
  const i = process.argv.indexOf("--arquivo");
  return i > 0 ? process.argv[i + 1] : null;
})();

const E_NUMERO = /\b(text-(?:xl|2xl|3xl)|font-bold)\b/;
const E_ROTULO = /\b(text-(?:xs|sm)|text-muted-foreground|text-ink-3)\b/;
/** Classe de cor que carrega significado e precisa acompanhar o número. */
const COR_SIGNIFICATIVA =
  /\b(text-(?:success|warning|danger)-ink|text-brand|text-destructive|text-primary)\b/;

/** `<Icone className="…" />` isolado. */
function comoIcone(fonte) {
  const m = /^<([A-Z][\w.]*)\b[^>]*\/>$/.exec(fonte.trim());
  return m ? m[1] : null;
}

function corDe(classe) {
  const m = classe && COR_SIGNIFICATIVA.exec(classe);
  return m ? m[1] : null;
}

/** Monta `valor=`, preservando a cor de limiar quando houver. */
function propValor(interior, classe) {
  const cor = corDe(classe);
  const p = comoProp(interior);
  if (!p) return null;
  if (!cor) return p;
  const dentro = p.startsWith('"') ? p.slice(1, -1) : `{${p.slice(1, -1)}}`;
  return `{<span className="${cor}">${dentro}</span>}`;
}

/** Filhos diretos de um bloco JSX: `[{ nome, abertura, interior, fonte }]`.
 *  Devolve `null` se encontrar texto solto ou expressão — o que significa que
 *  o bloco não é uma das três formas e deve ser recusado. */
function filhos(bloco) {
  const saida = [];
  let i = pularEspaco(bloco, 0);
  while (i < bloco.length) {
    if (bloco[i] !== "<") return null;
    const nome = (bloco.slice(i + 1).match(/^[A-Za-z][\w.]*/) || [])[0];
    if (!nome) return null;
    const f = fatiar(bloco, i, nome);
    if (!f) return null;
    saida.push({ nome, abertura: f.abertura, interior: f.interior, fonte: bloco.slice(i, f.fim) });
    i = pularEspaco(bloco, f.fim);
  }
  return saida;
}

/** Tenta ler um `Card` como indicador. Devolve `{ props }` ou `{ recusa }`. */
function lerIndicador(src, abre) {
  const card = fatiar(src, abre, "Card");
  if (!card || card.autoFechada) return { recusa: "<Card> sem fecho" };
  const dentro = filhos(card.interior);
  if (!dentro) return { recusa: "conteúdo solto dentro do Card" };

  let icone = null;
  let rotulo = null;
  let valor = null;
  let hint = null;

  if (dentro.length === 2 && dentro[0].nome === "CardHeader" && dentro[1].nome === "CardContent") {
    // ── Forma A
    const cab = filhos(dentro[0].interior);
    const corpo = filhos(dentro[1].interior);
    if (!cab || !corpo) return { recusa: "cabeçalho ou corpo com conteúdo solto" };

    const titulo = cab.find((c) => c.nome === "CardTitle");
    if (!titulo) return { recusa: "sem CardTitle" };
    const icones = cab.filter((c) => c !== titulo);
    if (icones.length > 1) return { recusa: "mais de um elemento ao lado do título" };
    if (icones.length === 1) {
      icone = comoIcone(icones[0].fonte);
      if (!icone) return { recusa: "o que está ao lado do título não é um ícone" };
    }
    rotulo = { interior: titulo.interior };

    const numero = corpo.find((c) => E_NUMERO.test(atributo(c.abertura, "className") || ""));
    if (!numero) return { recusa: "corpo sem número destacado" };
    valor = numero;
    const resto = corpo.filter((c) => c !== numero);
    if (resto.length > 1) return { recusa: "corpo com mais de uma linha além do número" };
    if (resto.length === 1) {
      if (!E_ROTULO.test(atributo(resto[0].abertura, "className") || ""))
        return { recusa: "linha extra no corpo não parece legenda" };
      hint = resto[0];
    }
  } else if (dentro.length === 1 && dentro[0].nome === "CardContent") {
    const corpo = filhos(dentro[0].interior);
    if (!corpo) return { recusa: "corpo com conteúdo solto" };

    if (corpo.length === 1 && corpo[0].nome === "div") {
      // ── Forma B
      const linha = filhos(corpo[0].interior);
      if (!linha || linha.length !== 2) return { recusa: "forma B esperava ícone + bloco" };
      icone = comoIcone(linha[0].fonte);
      if (!icone) return { recusa: "forma B sem ícone à esquerda" };
      const par = filhos(linha[1].interior);
      if (!par || par.length !== 2) return { recusa: "forma B esperava rótulo + número" };
      rotulo = par[0];
      valor = par[1];
    } else if (corpo.length === 2) {
      // ── Forma C
      rotulo = corpo[0];
      valor = corpo[1];
    } else {
      return { recusa: "corpo não é rótulo + número" };
    }

    if (!E_NUMERO.test(atributo(valor.abertura, "className") || ""))
      return { recusa: "segunda linha não é número destacado" };
    if (!E_ROTULO.test(atributo(rotulo.abertura, "className") || ""))
      return { recusa: "primeira linha não parece rótulo" };
  } else {
    return { recusa: "Card não tem a forma de indicador" };
  }

  const propRotulo = comoProp(rotulo.interior);
  const pv = propValor(valor.interior, atributo(valor.abertura, "className"));
  if (!propRotulo || !pv) return { recusa: "rótulo ou número vazio" };

  const props = [`size="sm"`];
  if (icone) props.push(`icone={<${icone} />}`);
  props.push(`rotulo=${propRotulo}`, `valor=${pv}`);
  if (hint) {
    const ph = comoProp(hint.interior);
    if (ph) props.push(`hint=${ph}`);
  }
  const classe = atributo(card.abertura, "className");
  if (classe) props.push(`className="${classe}"`);
  const chave = /\bkey=(\{[^}]*\}|"[^"]*")/.exec(card.abertura);
  if (chave) props.unshift(`key=${chave[1]}`);

  return { props, fim: card.fim };
}

function converter(src, caminho) {
  const recusas = [];
  let saida = src;
  let feitas = 0;
  let de = 0;

  for (;;) {
    const re = /<Card(?=[\s/>])/g;
    re.lastIndex = de;
    const m = re.exec(saida);
    if (!m) break;
    const abre = m.index;

    const r = lerIndicador(saida, abre);
    if (r.recusa) {
      recusas.push(`${caminho}: ${r.recusa}`);
      de = abre + 5;
      continue;
    }

    const recuo = (saida.slice(0, abre).match(/([ \t]*)$/) || [, ""])[1];
    const d = recuo + "  ";
    const umaLinha = recuo.length + r.props.join(" ").length + 13 <= 100;
    const bloco = umaLinha
      ? `<StatCard ${r.props.join(" ")} />`
      : `<StatCard\n${r.props.map((p) => d + p).join("\n")}\n${recuo}/>`;

    saida = saida.slice(0, abre) + bloco + saida.slice(r.fim);
    feitas++;
    de = abre + bloco.length;
  }

  return { saida, feitas, recusas };
}

function garantirImport(src) {
  if (/\bStatCard\b[\s\S]{0,200}?from (['"])@\/components\/kit\1/.test(src)) return src;
  const kit = /import \{([^}]*)\} from (['"])@\/components\/kit\2/.exec(src);
  if (kit) {
    return src.replace(
      kit[0],
      `import {${kit[1].replace(/\s*$/, "")}, StatCard } from ${kit[2]}@/components/kit${kit[2]}`
    );
  }
  const pv = /^import [^\n]*;\s*$/m.test(src) ? ";" : "";
  const inicios = [...src.matchAll(/^import\b/gm)];
  if (inicios.length === 0) return src;
  const ultimo = inicios[inicios.length - 1].index;
  const from = src.indexOf("from", ultimo);
  const desloc = src.slice(from).search(/['"]/);
  if (desloc < 0) return src;
  const abre = from + desloc;
  const fecha = src.indexOf(src[abre], abre + 1);
  if (fecha < 0) return src;
  let fim = fecha + 1;
  if (src[fim] === ";") fim++;
  const q = src[abre];
  return src.slice(0, fim) + `\nimport { StatCard } from ${q}@/components/kit${q}${pv}` + src.slice(fim);
}

/* ── Execução ─────────────────────────────────────────────────────────── */

const arquivos = SO_ARQUIVO
  ? [SO_ARQUIVO]
  : execSync('git ls-files "src/app/**/*.tsx" "src/components/**/*.tsx"', { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .filter((f) => !f.includes("design-system") && !f.includes(".stories."));

let total = 0;
const tocados = [];
const recusas = [];

for (const caminho of arquivos) {
  const antes = readFileSync(caminho, "utf8");
  if (!/<Card(?=[\s/>])/.test(antes)) continue;
  const r = converter(antes, caminho);
  recusas.push(...r.recusas);
  if (r.feitas === 0) continue;
  total += r.feitas;
  tocados.push(`${caminho} (${r.feitas})`);
  if (APLICAR) writeFileSync(caminho, garantirImport(r.saida), "utf8");
}

console.log(APLICAR ? "== APLICADO ==" : "== SIMULAÇÃO ==");
console.log(`\nCard → StatCard: ${total} em ${tocados.length} arquivos`);
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
