// Protocolos de avaliação e as habilidades que pertencem a cada um.
//
// A habilidade depende do protocolo: "Escrita" existe em Vineland-3 e em
// VB-MAPP, "Cognição" em Portage e em Denver, "Motricidade fina/grossa" em
// Vineland-3 e na Escala Motora. Por isso o mapa é protocolo → habilidades, e
// não o contrário.
//
// As chaves usam o valor que já é gravado em atividade.protocolo — não renomear
// sem migrar os registros existentes.

export const PROTOCOLO_OUTROS = "Outros";

export const PROTOCOLO_OPTIONS: { value: string; label: string }[] = [
  { value: "VB-MAPP", label: "VB-MAPP" },
  { value: "AFLS", label: "AFLS" },
  { value: "Socially Savvy", label: "Socially Savvy" },
  { value: "Barreiras comportamentais", label: "Barreiras comportamentais" },
  { value: "Portage", label: "Portage" },
  { value: "Denver", label: "Denver" },
  { value: "Escala de Desenvolvimento Motor", label: "Escala de Desenvolvimento Motor" },
  { value: "Vineland-3", label: "Vineland-3" },
  { value: PROTOCOLO_OUTROS, label: "Outros" },
];

export const HABILIDADES_POR_PROTOCOLO: Record<string, string[]> = {
  "VB-MAPP": [
    "Brincar",
    "Mando",
    "Tato",
    "Intraverbal",
    "Ecoico",
    "Vocal",
    "Linguística",
    "Linguagem Receptiva",
    "LRFFC",
    "Matemática",
    "VP/MTS",
    "Imitação Motora",
    "Leitura",
    "Escrita",
    "Social",
    "Grupo",
  ],

  AFLS: [
    "Comunicação Básica",
    "Ir ao banheiro",
    "Cuidados pessoais",
    "Tomar banho",
    "Saúde e segurança",
    "Vestir-se",
    "Rotinas noturnas",
    "Autogestão",
  ],

  "Socially Savvy": [
    "Linguagem Social",
    "Linguagem social não verbal",
    "Social/emocional",
    "Comportamento de grupo",
    "Atenção compartilhada",
    "Brincadeira compartilhada",
    "Autorregulação",
  ],

  "Barreiras comportamentais": [
    "Comportamento problema",
    "Controle instrucional",
    "Mando Comprometido",
    "Tato Comprometido",
    "Ecóico Comprometido",
    "Imitação Comprometida",
    "VP-MTS Comprometido",
    "Repertório de Ouvinte Comprometido",
    "Intraverbal Comprometido",
    "Habilidades Sociais Comprometido",
    "Dependente de Dicas",
    "Chutar",
    "Falha em Olhar para os Estímulos",
    "Discriminação Condicional Comprometida",
    "Fracasso em Generalizar",
    "Motivações Fracas ou Atípicas",
    "Exigência de resposta enfraquece a OE",
    "Dependência de Reforçador",
    "Auto-Estimulação",
    "Articulação Comprometida",
    "Comportamento Obsessivo- Compulsivo",
    "Comportamento Hiperativo",
    "Falha em fazer Contato Visual",
    "Defensividade Sensorial",
  ],

  Portage: [
    "Linguagem",
    "Auto-cuidado",
    "Cognição",
    "Desenvolvimento motor",
    "Socialização",
  ],

  Denver: [
    "Jogo",
    "Jogo de representação",
    "Comunicação Expressiva",
    "Comunicação Receptiva",
    "Cognição",
    "Imitação motora",
    "Competências Sociais",
    "Competências sociais adultos",
    "Competências com pares",
    "Atenção conjunta",
  ],

  "Escala de Desenvolvimento Motor": [
    "Organização espacial",
    "Organização temporal",
    "Esquema corporal",
    "Equilíbrio",
    "Lateralidade",
    "Motricidade fina",
    "Motricidade grossa",
  ],

  "Vineland-3": [
    "Maladaptativo internalizante",
    "Maladaptativo externalizante",
    "Expressivo",
    "Escrita",
    "Receptivo",
    "Vida diária pessoal",
    "Vida diária doméstica",
    "Vida diária comunitária",
    "Motricidade grossa",
    "Motricidade fina",
    "Relacionamento interpessoal",
    "Brincadeira e lazer",
    "Enfrentamento",
  ],
};

/** Todas as habilidades, sem repetir, para o protocolo "Outros" */
export const TODAS_HABILIDADES: string[] = Array.from(
  new Set(Object.values(HABILIDADES_POR_PROTOCOLO).flat())
).sort((a, b) => a.localeCompare(b, "pt-BR"));

/**
 * Habilidades disponíveis para o protocolo informado.
 * Sem protocolo → lista vazia (o campo fica bloqueado).
 * "Outros" → todas, já que o protocolo não está catalogado.
 */
export function habilidadesDoProtocolo(protocolo: string | null | undefined): string[] {
  if (!protocolo) return [];
  if (protocolo === PROTOCOLO_OUTROS) return TODAS_HABILIDADES;
  return HABILIDADES_POR_PROTOCOLO[protocolo] ?? [];
}

/** true se a combinação protocolo + habilidade é válida pelo catálogo atual */
export function habilidadeValida(
  protocolo: string | null | undefined,
  habilidade: string | null | undefined
): boolean {
  if (!habilidade) return true;
  return habilidadesDoProtocolo(protocolo).includes(habilidade);
}
