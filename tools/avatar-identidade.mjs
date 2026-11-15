// Põe o avatar na coluna que identifica uma PESSOA.
//
// No v2 toda linha que fala de gente começa com o avatar de iniciais; o chip
// de ícone é para entidade (procedimento, sala, convênio). Este codemod trata
// só o caso de pessoa, e só quando a célula tem uma expressão de nome única —
// o resto ele recusa e lista.
//
// Simula por padrão; `--aplicar` escreve.
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const APLICAR = process.argv.includes("--aplicar");
const PESSOA = /^(paciente|profissional|terapeuta|usu[áa]rio|respons[áa]vel)$/i;

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

let feitos = 0;
const recusados = [];

for (const arquivo of [...arquivos("src/app"), ...arquivos("src/components")]) {
  if (arquivo.includes("/ui/") || arquivo.includes(".stories.") || arquivo.includes("design-system"))
    continue;
  let texto = readFileSync(arquivo, "utf8");
  if (!texto.includes("<TableHeader")) continue;

  const cabecalho = blocos(texto, "TableHeader")[0];
  if (!cabecalho) continue;
  const titulos = [...cabecalho.texto.matchAll(/<TableHead[^>]*>([\s\S]*?)<\/TableHead>/g)].map((m) =>
    m[1].replace(/<[^>]*>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim()
  );
  const i = titulos.findIndex((t) => PESSOA.test(t));
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
  if (!alvo || /PersonAvatar/.test(alvo.texto)) continue;

  // Uma expressão de nome, já em semibold (o codemod anterior passou aqui)
  const m = alvo.texto.match(
    /^<TableCell([^>]*)>\s*(?:\n\s*)?<span className="font-semibold text-ink">\s*(\{[^{}]*\})\s*<\/span>\s*(?:\n\s*)?<\/TableCell>$/
  );
  const m2 = alvo.texto.match(
    /^<TableCell className="font-semibold text-ink"([^>]*)>\s*(\{[^{}]*\})\s*<\/TableCell>$/
  );
  const achado = m || m2;
  if (!achado) {
    recusados.push(`${arquivo}  coluna "${titulos[i]}"`);
    continue;
  }
  const extras = m ? achado[1] : achado[1];
  const nome = achado[2];

  const novo =
    `<TableCell${extras}>\n` +
    `  <div className="flex min-w-0 items-center gap-2.5">\n` +
    `    <PersonAvatar nome=${nome} tamanho={32} />\n` +
    `    <span className="truncate font-semibold text-ink">${nome}</span>\n` +
    `  </div>\n` +
    `</TableCell>`;

  texto = texto.slice(0, alvo.inicio) + novo + texto.slice(alvo.fim);

  if (!/PersonAvatar/.test(texto.split("export")[0])) {
    if (/from ["']@\/components\/kit["']/.test(texto)) {
      texto = texto.replace(
        /import \{([^}]*)\} from (["'])@\/components\/kit\2;?/,
        (mm, dentro, aspas) =>
          `import {${dentro.replace(/\s*$/, "")}${dentro.includes("\n") ? "\n  PersonAvatar,\n" : ", PersonAvatar "}} from ${aspas}@/components/kit${aspas};`
      );
    } else {
      const fim = texto.indexOf("\n", texto.indexOf("from \"lucide-react\""));
      texto = texto.slice(0, fim + 1) + 'import { PersonAvatar } from "@/components/kit";\n' + texto.slice(fim + 1);
    }
  }

  feitos++;
  console.log(`ok ${arquivo}  coluna "${titulos[i]}"`);
  if (APLICAR) writeFileSync(arquivo, texto);
}

if (recusados.length) {
  console.log(`\nRecusados (forma não reconhecida — ver à mão):`);
  for (const r of recusados) console.log(`   ${r}`);
}
console.log(`\n${feitos} tabelas com avatar.${APLICAR ? "" : "  (simulação — use --aplicar)"}`);
