// Regras da escala de pontuação/dicas — fonte única.
//
// A escala vai do erro total ao desempenho independente, com os graus de ajuda
// no meio. Duas siglas são estruturais e não podem sair das pontas:
//
//   "-"  erro / sem resposta        → sempre a primeira
//   "+"  independente (acerto)      → sempre a última
//
// Isso importa porque a nota de uma tentativa é gravada como o ÍNDICE do botão
// escolhido, não como a sigla. Se o "+" sair da última posição, o cálculo de
// acerto e a evolução de fase passam a contar o botão errado.

export const SIGLA_ERRO = "-";
export const SIGLA_INDEPENDENTE = "+";

/**
 * Ordena mantendo "-" na primeira posição e "+" na última.
 * O miolo (AFT, AFP, AI, AG, AVE, AVG) preserva a ordem recebida — é ali que a
 * sequência tem significado clínico de gradiente de ajuda.
 */
export function ordenarPontuacoes<T extends { sigla: string }>(lista: T[]): T[] {
  const erro = lista.filter((p) => p.sigla === SIGLA_ERRO);
  const independente = lista.filter((p) => p.sigla === SIGLA_INDEPENDENTE);
  const meio = lista.filter(
    (p) => p.sigla !== SIGLA_ERRO && p.sigla !== SIGLA_INDEPENDENTE
  );
  return [...erro, ...meio, ...independente];
}

/** true se a sigla é uma das pontas fixas da escala (ordem não editável) */
export const isSiglaFixa = (sigla: string): boolean =>
  sigla === SIGLA_ERRO || sigla === SIGLA_INDEPENDENTE;

/**
 * Uma tentativa é correta quando o botão escolhido é o "+" (independente).
 *
 * `nota` é o índice do botão na lista da fase, já ordenada. Checar a sigla em
 * vez de comparar com `pontuacoes.length - 1` deixa o cálculo imune à posição
 * e ao caso de alguém adicionar uma pontuação depois de já existirem sessões
 * registradas — aí o total muda e a comparação por tamanho remapeia notas
 * antigas em silêncio.
 *
 * Fallback: em listas sem "+" nenhum (dado legado), mantém a regra antiga de
 * considerar a última posição como acerto, para não alterar históricos.
 */
export function isTentativaCorreta(
  nota: number,
  pontuacoes: Array<{ sigla: string }>
): boolean {
  if (pontuacoes.length === 0) return false;

  const temIndependente = pontuacoes.some((p) => p.sigla === SIGLA_INDEPENDENTE);
  if (!temIndependente) return nota === pontuacoes.length - 1;

  return pontuacoes[nota]?.sigla === SIGLA_INDEPENDENTE;
}
