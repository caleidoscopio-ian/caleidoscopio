// Varredura da ANATOMIA das tabelas.
//
// O `varrer-design-v2.mjs` acha moldura, pílula sólida e busca solta. O que
// ele não vê é o desenho de dentro da linha, que é onde as diferenças mais
// teimam:
//
//   1. a primeira coluna do v2 tem **chip ou avatar + nome em semibold**;
//   2. coluna categórica (tipo, especialidade, status, perfil…) é **pílula**,
//      não texto solto;
//   3. o painel que segura a tabela tem **ícone e subtítulo** no cabeçalho.
//
// Este arquivo casa cada `<TableHead>` com a `<TableCell>` de mesmo índice e
// aponta onde a anatomia não bate. Heurística, não compilador: confira antes
// de mexer — há coluna categórica que é melhor como texto.
//
// Uso: node tools/varrer-tabelas-v2.mjs [--tela <trecho>]

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const CATEGORICA =
  /^(tipo|tipos|especialidade|status|categoria|perfil|v[ií]nculo|situa[cç][aã]o|fase|n[ií]vel|prioridade|tipo atendimento|autoriza[cç][oõ]es)$/i;

function arquivos(dir, saida = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, saida);
    else if (nome.endsWith(".tsx")) saida.push(caminho.replace(/\\/g, "/"));
  }
  return saida;
}

/** Recorta os blocos entre `<abertura` e o seu fechamento, contando aninhados. */
function blocos(texto, tag) {
  const achados = [];
  const abre = new RegExp(`<${tag}(?=[\\s>])`, "g");
  let m;
  while ((m = abre.exec(texto))) {
    let i = m.index;
    let profundidade = 0;
    let fim = -1;
    const varredura = new RegExp(`<${tag}(?=[\\s>])|</${tag}>`, "g");
    varredura.lastIndex = i;
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
      achados.push({ inicio: i, fim, texto: texto.slice(i, fim) });
      abre.lastIndex = fim;
    }
  }
  return achados;
}

const alvo = process.argv.includes("--tela")
  ? process.argv[process.argv.indexOf("--tela") + 1]
  : null;

const todos = [...arquivos("src/app"), ...arquivos("src/components")].filter(
  (f) => !f.includes("/ui/") && !f.includes(".stories.") && !f.includes("design-system")
);

let totalAchados = 0;
const relatorio = [];

for (const arquivo of todos) {
  if (alvo && !arquivo.includes(alvo)) continue;
  const texto = readFileSync(arquivo, "utf8");
  if (!texto.includes("<TableHeader")) continue;

  const achados = [];

  // ── cabeçalhos
  const cabecalho = blocos(texto, "TableHeader")[0];
  if (!cabecalho) continue;
  const titulos = [...cabecalho.texto.matchAll(/<TableHead[^>]*>([\s\S]*?)<\/TableHead>/g)].map(
    (m) => m[1].replace(/<[^>]*>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim()
  );

  // ── primeira linha do corpo
  const corpo = blocos(texto, "TableBody")[0];
  // `blocos` devolve offset relativo ao texto que recebeu — somar a base para
  // o número da linha apontar o arquivo, e não o trecho.
  const linhas = corpo
    ? blocos(corpo.texto, "TableRow").map((l) => ({ ...l, inicio: l.inicio + corpo.inicio }))
    : [];
  const linha = linhas.find((l) => l.texto.includes("key=")) ?? linhas[0];
  if (!linha) continue;
  const celulas = blocos(linha.texto, "TableCell").map((c) => c.texto);

  const numeroDaLinha = (indice) =>
    texto.slice(0, linha.inicio + indice).split("\n").length;

  // 1. A coluna que identifica a linha — nem toda tabela começa por ela: em
  //    prontuários a primeira é a data, e o avatar está na segunda. Então o
  //    alvo é a coluna cujo título nomeia uma entidade.
  const IDENTIDADE =
    /^(nome|nome completo|paciente|profissional|terapeuta|usu[áa]rio|sala|conv[êe]nio|procedimento|respons[áa]vel|filial|atividade|avalia[cç][ãa]o|curr[íi]culo)$/i;
  const iIdentidade = titulos.findIndex((t) => IDENTIDADE.test(t));
  const primeira = iIdentidade >= 0 ? (celulas[iIdentidade] ?? "") : "";
  const temPeca = /PersonAvatar|IconTile|DynIcon|<Avatar|rounded-\[0\.85rem\]|size-10|ColorChip/.test(primeira);
  const temSemibold = /font-semibold/.test(primeira);
  if (iIdentidade >= 0 && !(temPeca && temSemibold)) {
    const faltas = [!temPeca && "chip/avatar", !temSemibold && "nome em semibold"]
      .filter(Boolean)
      .join(" e ");
    const alvo = titulos[iIdentidade];
    achados.push({
      peso: 3,
      linha: numeroDaLinha(linha.texto.indexOf("<TableCell")),
      texto: `coluna "${alvo}" sem ${faltas}`,
    });
  }

  // 2. coluna categórica como texto solto
  titulos.forEach((titulo, i) => {
    if (!CATEGORICA.test(titulo)) return;
    const celula = celulas[i];
    if (!celula) return;
    if (/StatusPill|<Badge/.test(celula)) return;
    achados.push({
      peso: 2,
      linha: numeroDaLinha(linha.texto.indexOf("<TableCell", 0)),
      texto: `coluna "${titulo}" em texto solto (no v2 é pílula)`,
    });
  });

  // 3. tabela sem painel nenhum em volta — era o caso do histórico de
  //    atendimentos, e o teste antigo só olhava painel que já existia.
  const ehPagina = arquivo.includes("/app/") && arquivo.endsWith("page.tsx");
  if (ehPagina && !texto.includes("<Panel") && !texto.includes("<Card")) {
    achados.push({
      peso: 3,
      linha: texto.slice(0, cabecalho.inicio).split("\n").length,
      texto: "tabela sem painel em volta (fica solta no fundo da tela)",
    });
  }

  // 4. painel sem ícone/subtítulo
  if (texto.includes("<Panel")) {
    const paineis = blocos(texto, "Panel");
    const segura = paineis.find((p) => p.texto.includes("<TableHeader"));
    if (segura) {
      const cabeca = segura.texto.slice(0, segura.texto.indexOf(">") + 1600);
      if (!/icone=/.test(cabeca))
        achados.push({
          peso: 2,
          linha: texto.slice(0, segura.inicio).split("\n").length,
          texto: "painel da tabela sem `icone` no cabeçalho",
        });
      if (!/subtitulo=/.test(cabeca))
        achados.push({
          peso: 1,
          linha: texto.slice(0, segura.inicio).split("\n").length,
          texto: "painel da tabela sem `subtitulo` (o v2 põe a contagem)",
        });
    }
  }

  if (achados.length) {
    totalAchados += achados.length;
    relatorio.push({ arquivo, achados, pontos: achados.reduce((s, a) => s + a.peso, 0) });
  }
}

relatorio.sort((a, b) => b.pontos - a.pontos);
for (const { arquivo, achados, pontos } of relatorio) {
  console.log(`\n${arquivo}  (${pontos} pontos)`);
  for (const a of achados) console.log(`   ${a.texto}  → linha ${a.linha}`);
}
console.log(`\n${relatorio.length} tabelas com ${totalAchados} diferenças de anatomia.`);
