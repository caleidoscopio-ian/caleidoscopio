// Casador de tags JSX mínimo, para os codemods do design v2 (Módulo 28).
//
// Não é um parser: não entende escopo, não valida nada. Entende só o
// suficiente para achar onde um elemento começa e termina, contando
// profundidade, para que uma transformação possa recortar a árvore certa.
//
// Expressão regular não serve para isso: `<div>` dentro de `<div>` faz o
// `.*?` parar no fecho errado, e era assim que as migrações antigas estragavam
// um arquivo a cada dez.
//
// A compensação é a disciplina de uso: **todo codemod que usa isto recusa o
// que não casa exatamente e imprime a lista de recusas**, em vez de tentar
// adivinhar. O que foi recusado vai para a mão.

/** Índice logo após o `>` que fecha a abertura da tag que começa em `abre`.
 *  Pula `>` dentro de string e dentro de `{…}` — arrow function tem `=>`. */
export function fimDaAbertura(src, abre) {
  let i = abre + 1;
  let chaves = 0;
  let aspas = null;
  while (i < src.length) {
    const c = src[i];
    if (aspas) {
      if (c === aspas && src[i - 1] !== "\\") aspas = null;
    } else if (c === '"' || c === "'" || c === "`") {
      aspas = c;
    } else if (c === "{") {
      chaves++;
    } else if (c === "}") {
      chaves--;
    } else if (c === ">" && chaves === 0) {
      return i + 1;
    }
    i++;
  }
  return -1;
}

/** Índice logo após o `</nome>` que fecha a tag aberta em `abre`.
 *  Devolve o fim da abertura quando a tag é auto-fechada. */
export function fimDaTag(src, abre, nome) {
  const fimAbertura = fimDaAbertura(src, abre);
  if (fimAbertura < 0) return -1;
  if (src[fimAbertura - 2] === "/") return fimAbertura;

  let profundidade = 1;
  const re = new RegExp(`</?${nome}(?=[\\s/>])`, "g");
  re.lastIndex = fimAbertura;
  let m;
  while ((m = re.exec(src))) {
    if (m[0][1] === "/") {
      if (--profundidade === 0) return src.indexOf(">", m.index) + 1;
    } else {
      const f = fimDaAbertura(src, m.index);
      if (f > 0 && src[f - 2] !== "/") profundidade++;
    }
    re.lastIndex = m.index + m[0].length;
  }
  return -1;
}

/** `{ abertura, interior, fim }` do elemento `nome` que começa em `abre`. */
export function fatiar(src, abre, nome) {
  const ini = fimDaAbertura(src, abre);
  const fim = fimDaTag(src, abre, nome);
  if (ini < 0 || fim < 0) return null;
  const autoFechada = src[ini - 2] === "/";
  return {
    abertura: src.slice(abre, ini),
    interior: autoFechada ? "" : src.slice(ini, fim - (nome.length + 3)),
    fim,
    autoFechada,
  };
}

/** Valor de um atributo de string na abertura (`className="x"` → `x`). */
export function atributo(abertura, nome) {
  const m = new RegExp(`\\b${nome}="([^"]*)"`).exec(abertura);
  return m ? m[1] : null;
}

export function pularEspaco(src, i) {
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

/** Recua sobre espaço em branco e comentários JSX. */
export function recuarEspacoEComentario(src, i) {
  for (;;) {
    const antes = i;
    while (i > 0 && /\s/.test(src[i - 1])) i--;
    if (src.slice(0, i).endsWith("*/}")) {
      const abre = src.lastIndexOf("{/*", i);
      if (abre >= 0) i = abre;
    }
    if (i === antes) return i;
  }
}

/** Reindenta um bloco preservando a forma relativa das linhas. */
export function reindentar(bloco, alvo) {
  const linhas = bloco.replace(/\s+$/, "").replace(/^\n+/, "").split("\n");
  const comTexto = linhas.filter((l) => l.trim());
  if (comTexto.length === 0) return "";
  const base = Math.min(...comTexto.map((l) => l.match(/^[ \t]*/)[0].length));
  return linhas
    .map((l) => (l.trim() ? " ".repeat(alvo) + l.slice(base) : ""))
    .join("\n");
}

/** Chaves equilibradas — usado para decidir se `{x}` é uma expressão só. */
export function equilibrado(s) {
  let n = 0;
  for (const c of s) {
    if (c === "{") n++;
    else if (c === "}" && --n < 0) return false;
  }
  return n === 0;
}

/** Texto JSX como valor de prop: string quando é texto puro, `{expr}` quando
 *  já é uma expressão, fragmento no resto. */
export function comoProp(bruto) {
  const texto = bruto.trim().replace(/\s+/g, " ");
  if (!texto) return null;
  if (!/[<{]/.test(texto)) return `"${texto.replace(/"/g, "&quot;")}"`;
  if (texto.startsWith("{") && texto.endsWith("}") && equilibrado(texto.slice(1, -1)))
    return texto;
  return `{<>${texto}</>}`;
}
