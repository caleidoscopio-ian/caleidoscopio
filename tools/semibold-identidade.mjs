// Dá peso ao nome na coluna que identifica a linha.
//
// No v2 o que nomeia a linha é sempre `font-semibold text-ink`; o resto da
// linha é texto normal. Aqui a maioria usava `font-medium` ou nada.
//
// Simula por padrão; `--aplicar` escreve.
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const APLICAR = process.argv.includes("--aplicar");

const IDENTIDADE =
  /^(nome|nome completo|paciente|profissional|terapeuta|usu[áa]rio|sala|conv[êe]nio|procedimento|respons[áa]vel|filial|atividade|avalia[cç][ãa]o|curr[íi]culo)$/i;

function arquivos(dir, saida = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, saida);
    else if (nome.endsWith(".tsx")) saida.push(caminho.replace(/\\/g, "/"));
  }
  return saida;
}

function blocos(texto, tag) {
  const achados = [];
  const abre = new RegExp(`<${tag}(?=[\\s>])`, "g");
  let m;
  while ((m = abre.exec(texto))) {
    let profundidade = 0;
    let fim = -1;
    const varredura = new RegExp(`<${tag}(?=[\\s>])|</${tag}>`, "g");
    varredura.lastIndex = m.index;
    let n;
    while ((n = varredura.exec(texto))) {
      if (n[0].startsWith("</")) {
        profundidade--;
        if (profundidade === 0) {
          fim = n.index + n[0].length;
          break;
        }
      } else profundidade++;
    }
    if (fim > 0) {
      achados.push({ inicio: m.index, fim, texto: texto.slice(m.index, fim) });
      abre.lastIndex = fim;
    }
  }
  return achados;
}

let mexidos = 0;
let recusados = 0;

for (const arquivo of [...arquivos("src/app"), ...arquivos("src/components")]) {
  if (arquivo.includes("/ui/") || arquivo.includes(".stories.")) continue;
  let texto = readFileSync(arquivo, "utf8");
  if (!texto.includes("<TableHeader")) continue;

  const cabecalho = blocos(texto, "TableHeader")[0];
  if (!cabecalho) continue;
  const titulos = [...cabecalho.texto.matchAll(/<TableHead[^>]*>([\s\S]*?)<\/TableHead>/g)].map((m) =>
    m[1].replace(/<[^>]*>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim()
  );
  const i = titulos.findIndex((t) => IDENTIDADE.test(t));
  if (i < 0) continue;

  const corpo = blocos(texto, "TableBody")[0];
  if (!corpo) continue;
  const linhas = blocos(corpo.texto, "TableRow").map((l) => ({
    ...l,
    inicio: l.inicio + corpo.inicio,
    fim: l.fim + corpo.inicio,
  }));
  const linha = linhas.find((l) => l.texto.includes("key=")) ?? linhas[0];
  if (!linha) continue;

  const celulas = blocos(linha.texto, "TableCell").map((c) => ({
    ...c,
    inicio: c.inicio + linha.inicio,
    fim: c.fim + linha.inicio,
  }));
  const alvo = celulas[i];
  if (!alvo) continue;
  if (/font-semibold/.test(alvo.texto)) continue;

  let novo = null;
  if (/className="font-medium"/.test(alvo.texto)) {
    novo = alvo.texto.replace('className="font-medium"', 'className="font-semibold text-ink"');
  } else if (/className="([^"]*\s)?font-medium(\s[^"]*)?"/.test(alvo.texto)) {
    novo = alvo.texto.replace(
      /className="([^"]*\s)?font-medium(\s[^"]*)?"/,
      (m, a = "", b = "") => `className="${(a || "") + "font-semibold text-ink" + (b || "")}"`
    );
  } else {
    // célula com um valor só: `<TableCell>{x.nome}</TableCell>`
    const simples = alvo.texto.match(/^<TableCell([^>]*)>\s*(\{[^{}]*\})\s*<\/TableCell>$/);
    if (simples) {
      novo = `<TableCell${simples[1]}>\n  <span className="font-semibold text-ink">${simples[2]}</span>\n</TableCell>`;
    }
  }

  if (!novo) {
    recusados++;
    console.log(`—  ${arquivo}  coluna "${titulos[i]}": forma não reconhecida`);
    continue;
  }

  texto = texto.slice(0, alvo.inicio) + novo + texto.slice(alvo.fim);
  mexidos++;
  console.log(`ok ${arquivo}  coluna "${titulos[i]}"`);
  if (APLICAR) writeFileSync(arquivo, texto);
}

console.log(`\n${mexidos} tabelas ajustadas, ${recusados} recusadas.${APLICAR ? "" : "  (simulação — use --aplicar)"}`);
