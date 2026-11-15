// Varredura de telas fora do padrão v2.
//
// Procura os marcadores que, nas telas já corrigidas, sempre apareceram
// juntos: moldura antiga em volta de tabela, pílula sólida de status, botão
// quadrado de ação, KPI escrito à mão, busca solta fora do painel.
//
// Não é lint: é um mapa de onde olhar. Cada achado aponta a linha.
//
// Uso: node tools/varrer-design-v2.mjs [--tela <trecho do caminho>]

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const SINAIS = [
  {
    id: "moldura-tabela",
    peso: 3,
    descricao: "moldura `rounded-md/lg border` em volta de tabela",
    regex: /className="[^"]*rounded-(?:md|lg) border[^"]*"/g,
    exige: /<Table\b|<table\b/,
  },
  {
    id: "card-tabela",
    peso: 3,
    descricao: "`Card` + `CardContent p-0` segurando tabela",
    regex: /<CardContent className="p-0"/g,
  },
  {
    id: "pilula-solida",
    peso: 2,
    descricao: "status em pílula sólida (`Badge variant=default/destructive`)",
    regex: /<Badge\s+variant=\{?["']?(?:default|destructive)/g,
  },
  {
    id: "acao-quadrada",
    peso: 2,
    descricao: "ação de linha como `Button ghost size=icon`",
    regex: /variant="ghost"\s*\n?\s*size="icon"/g,
    // `size-9` é o tamanho de ação de linha do v2 — quem já está nele saiu da
    // lista; o que resta é botão de 44px espremido numa linha de tabela.
    ignorarSeProximoTem: "size-9",
    exige: /<TableCell|<TableRow/,
  },
  {
    id: "kpi-a-mao",
    peso: 3,
    descricao: "KPI escrito à mão (`text-2xl/3xl font-bold`) em vez de `StatCard`",
    // `tabular` marca o número de resumo já tratado — nem todo número grande
    // vira `StatCard`: num diálogo denso, o cartão de 13rem estouraria a tela.
    regex: /className="(?![^"]*tabular)[^"]*text-(?:2xl|3xl) font-bold[^"]*"/g,
  },
  {
    id: "titulo-microetiqueta",
    peso: 2,
    descricao: "seção com `<h2>` em microetiqueta maiúscula solta",
    regex: /<h2 className="[^"]*uppercase tracking-wide[^"]*"/g,
  },
  {
    id: "busca-solta",
    peso: 2,
    descricao: "campo de busca fora do painel (`Input` + lupa absoluta)",
    regex: /<Search className="absolute/g,
    // Dentro de diálogo a busca solta é o certo — o que destoa é o campo
    // flutuando acima da tabela numa tela de listagem.
    soEmTela: true,
  },
  {
    id: "painel-como-kpi",
    peso: 2,
    descricao: "`Panel` usado como cartão de número",
    regex: /<Panel titulo="[^"]*">\s*\n\s*\n?\s*<div className="flex items-center gap-2">/g,
  },
];

const alvo = process.argv.includes("--tela")
  ? process.argv[process.argv.indexOf("--tela") + 1]
  : null;

function arquivos(dir, saida = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, saida);
    else if (nome.endsWith(".tsx")) saida.push(caminho.replace(/\\/g, "/"));
  }
  return saida;
}

const todos = [...arquivos("src/app"), ...arquivos("src/components")].filter(
  (f) => !f.includes("/ui/") && !f.includes(".stories.") && !f.includes("design-system")
);

const porArquivo = new Map();
for (const arquivo of todos) {
  if (alvo && !arquivo.includes(alvo)) continue;
  const texto = readFileSync(arquivo, "utf8");
  const linhas = texto.split("\n");
  for (const sinal of SINAIS) {
    if (sinal.exige && !sinal.exige.test(texto)) continue;
    if (sinal.soEmTela && (arquivo.includes("dialog") || arquivo.includes("-form")))
      continue;
    const achados = [...texto.matchAll(sinal.regex)];
    if (!achados.length) continue;
    const lista = porArquivo.get(arquivo) ?? [];
    for (const a of achados) {
      const linha = texto.slice(0, a.index).split("\n").length;
      if (
        sinal.ignorarSeProximoTem &&
        linhas
          .slice(linha - 1, linha + 2)
          .join(" ")
          .includes(sinal.ignorarSeProximoTem)
      )
        continue;
      lista.push({ ...sinal, linha, trecho: linhas[linha - 1].trim().slice(0, 70) });
    }
    porArquivo.set(arquivo, lista);
  }
}

const ordenado = [...porArquivo.entries()].sort(
  (a, b) =>
    b[1].reduce((s, x) => s + x.peso, 0) - a[1].reduce((s, x) => s + x.peso, 0)
);

let total = 0;
for (const [arquivo, achados] of ordenado) {
  const pontos = achados.reduce((s, x) => s + x.peso, 0);
  total += achados.length;
  console.log(`\n${arquivo}  (${pontos} pontos)`);
  const porSinal = new Map();
  for (const a of achados) porSinal.set(a.id, [...(porSinal.get(a.id) ?? []), a]);
  for (const [, grupo] of porSinal) {
    const linhas = grupo.map((g) => g.linha).join(", ");
    console.log(`   ${grupo[0].descricao}  → linha ${linhas}`);
  }
}

console.log(
  `\n${ordenado.length} arquivos com ${total} marcadores. ` +
    `Peso alto = tela inteira fora do padrão; peso baixo = detalhe.`
);
