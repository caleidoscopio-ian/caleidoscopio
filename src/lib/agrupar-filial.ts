// Agrupa uma lista de itens por filial, para exibição em seções colapsáveis
// quando o filtro global estiver em "Todas as filiais".

export interface FilialResumo {
  id: string;
  nome: string;
  cor?: string | null;
}

export interface GrupoPorFilial<T> {
  filial: FilialResumo | null; // null = "Sem filial"
  items: T[];
}

export function agruparPorFilial<T>(
  items: T[],
  getFilial: (item: T) => FilialResumo | null | undefined
): GrupoPorFilial<T>[] {
  const grupos = new Map<string, GrupoPorFilial<T>>();

  for (const item of items) {
    const filial = getFilial(item) || null;
    const chave = filial?.id ?? "_sem_filial";
    if (!grupos.has(chave)) {
      grupos.set(chave, { filial, items: [] });
    }
    grupos.get(chave)!.items.push(item);
  }

  const resultado = Array.from(grupos.values());
  resultado.sort((a, b) => {
    if (!a.filial) return 1;
    if (!b.filial) return -1;
    return a.filial.nome.localeCompare(b.filial.nome);
  });

  return resultado;
}
