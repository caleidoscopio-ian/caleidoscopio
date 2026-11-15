// Interior dos modais na anatomia do v2.
//
// Medido no clone (modal "Detalhes do Agendamento" e "Novo Agendamento"):
//
//   - rótulo de seção é microetiqueta (0.72rem, maiúscula, `ink-4`), não um
//     título `text-sm font-semibold` em caixa alta;
//   - entre seções não há `<Separator />` — o respiro separa;
//   - o bloco de conteúdo é `rounded-2xl bg-surface-muted`, sem borda: o modal
//     é branco e o bloco é o tom azulado, nunca o contrário;
//   - o ícone que abre um bloco (calendário, relógio, local, procedimento) é da
//     marca; ícone de detalhe (telefone, e-mail) continua cinza.
//
// Só mexe em arquivo que tem `DialogContent`. Simula por padrão; `--aplicar`
// escreve.
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const APLICAR = process.argv.includes("--aplicar");

function arquivos(dir, saida = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, saida);
    else if (nome.endsWith(".tsx")) saida.push(caminho.replace(/\\/g, "/"));
  }
  return saida;
}

/** Troca a caixa antiga (borda + raio 8px) pela faixa do v2, preservando o
 *  resto das classes (flex, gap, space-y…). */
function trocaCaixa(classes) {
  const t = classes.split(/\s+/).filter(Boolean);
  const temBorda = t.includes("border");
  const temRaio = t.includes("rounded-lg") || t.includes("rounded-md");
  const temPad = t.some((c) => /^p-[2-5]$/.test(c));
  if (!(temBorda && temRaio && temPad)) return null;
  const fora = new Set(["border", "rounded-lg", "rounded-md", "bg-muted/50", "bg-muted/30", "bg-muted/20", "bg-muted", "bg-card"]);
  const resto = t.filter((c) => !fora.has(c));
  return ["rounded-2xl", "bg-surface-muted", ...resto].join(" ");
}

const totais = { rotulo: 0, separador: 0, caixa: 0, icone: 0 };
let arquivosMexidos = 0;

for (const arquivo of [...arquivos("src/app"), ...arquivos("src/components")]) {
  if (arquivo.includes("/ui/") || arquivo.includes(".stories.")) continue;
  const original = readFileSync(arquivo, "utf8");
  if (!original.includes("DialogContent")) continue;
  let s = original;

  // 1. rótulo de seção
  s = s.replace(
    /className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"/g,
    () => {
      totais.rotulo++;
      return 'className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase"';
    }
  );

  // 2. separadores entre seções
  s = s.replace(/^[ \t]*<Separator(?:\s+className="[^"]*")?\s*\/>\s*\n/gm, () => {
    totais.separador++;
    return "";
  });
  if (!/<Separator\b/.test(s)) {
    s = s.replace(/^import \{ Separator \} from ['"]@\/components\/ui\/separator['"];?\s*\n/m, "");
  }

  // 3. caixas com borda
  s = s.replace(/className="([^"]*)"/g, (m, classes) => {
    const nova = trocaCaixa(classes);
    if (!nova) return m;
    totais.caixa++;
    return `className="${nova}"`;
  });

  // 4. ícone que abre um bloco
  s = s.replace(
    /className="h-5 w-5 text-muted-foreground( [^"]*)?"/g,
    (m, resto = "") => {
      totais.icone++;
      return `className="size-5 text-brand${resto}"`;
    }
  );

  if (s !== original) {
    arquivosMexidos++;
    console.log(`ok ${arquivo}`);
    if (APLICAR) writeFileSync(arquivo, s);
  }
}

console.log(
  `\n${arquivosMexidos} modais · ${totais.rotulo} rótulos · ${totais.separador} separadores · ` +
    `${totais.caixa} caixas · ${totais.icone} ícones` +
    (APLICAR ? "" : "  (simulação — use --aplicar)")
);
