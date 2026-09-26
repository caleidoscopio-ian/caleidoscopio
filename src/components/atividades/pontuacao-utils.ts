// Utilitários da aba Pontuação/Dicas da atividade.

import { ordenarPontuacoes } from "@/lib/pontuacao";

export interface Pontuacao {
  id?: string;
  ordem: number;
  sigla: string;
  grau: string;
  passo_dicas?: string | null;
}

/**
 * Reposiciona o item na ordem pedida e renumera a lista de 1..n.
 *
 * Sem isso, alterar o número de Ordem só trocava o valor do campo: a linha não
 * mudava de lugar e era possível ficar com ordens repetidas — que o banco
 * rejeita, já que atividade_pontuacoes tem unique (atividadeId, ordem).
 *
 * `indiceAtual` é o índice do item ao editar, ou null ao adicionar.
 * A ordem pedida é limitada ao intervalo válido da lista resultante.
 */
export function reposicionar(
  lista: Pontuacao[],
  item: Pontuacao,
  ordemDesejada: number,
  indiceAtual: number | null
): Pontuacao[] {
  const semItem =
    indiceAtual !== null ? lista.filter((_, i) => i !== indiceAtual) : [...lista];

  const destino = Math.min(Math.max(ordemDesejada, 1), semItem.length + 1) - 1;
  semItem.splice(destino, 0, item);

  // "-" sempre primeiro e "+" sempre último: a nota da tentativa é o índice do
  // botão, então tirar o "+" do fim corromperia o cálculo de acerto e a
  // evolução de fase. Ver src/lib/pontuacao.ts.
  return ordenarPontuacoes(semItem).map((p, i) => ({ ...p, ordem: i + 1 }));
}
