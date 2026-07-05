// Fonte única para os dropdowns de classificação do Profissional
// (Tipo de Vínculo, Especialidade clínica, Função administrativa, Conselho)

export const TIPO_VINCULO_OPTIONS: { value: string; label: string }[] = [
  { value: "PROFISSIONAL_CLINICO", label: "Profissional Clínico" },
  { value: "FUNCIONARIO_ADMINISTRATIVO", label: "Funcionário Administrativo" },
];

export const TIPO_VINCULO_LABELS: Record<string, string> = Object.fromEntries(
  TIPO_VINCULO_OPTIONS.map((o) => [o.value, o.label])
);

export const ESPECIALIDADE_CLINICA_OPTIONS: { value: string; label: string }[] = [
  { value: "FONOAUDIOLOGIA", label: "Fonoaudiologia" },
  { value: "TERAPIA_OCUPACIONAL", label: "Terapia Ocupacional" },
  { value: "PSICOLOGIA", label: "Psicologia" },
  { value: "FISIOTERAPIA", label: "Fisioterapia" },
  { value: "NEUROPSICOLOGIA", label: "Neuropsicologia" },
  { value: "PSICOPEDAGOGIA", label: "Psicopedagogia" },
  { value: "MUSICOTERAPIA", label: "Musicoterapia" },
  { value: "EDUCACAO_FISICA_ADAPTADA", label: "Educação Física Adaptada" },
  { value: "ABA", label: "Análise do Comportamento Aplicada (ABA)" },
  { value: "NUTRICAO", label: "Nutrição" },
  { value: "OUTRA", label: "Outra" },
];

export const ESPECIALIDADE_CLINICA_LABELS: Record<string, string> = Object.fromEntries(
  ESPECIALIDADE_CLINICA_OPTIONS.map((o) => [o.value, o.label])
);

export const FUNCAO_ADMINISTRATIVA_OPTIONS: { value: string; label: string }[] = [
  { value: "GESTAO", label: "Gestão" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "RECEPCAO", label: "Recepção" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "OUTRO", label: "Outro" },
];

export const FUNCAO_ADMINISTRATIVA_LABELS: Record<string, string> = Object.fromEntries(
  FUNCAO_ADMINISTRATIVA_OPTIONS.map((o) => [o.value, o.label])
);

export const CONSELHO_OPTIONS: { value: string; label: string }[] = [
  { value: "CRP", label: "CRP" },
  { value: "CRFA", label: "CRFa" },
  { value: "CRM", label: "CRM" },
  { value: "CRN", label: "CRN" },
  { value: "CRO", label: "CRO" },
  { value: "CREFITO", label: "CREFITO" },
  { value: "CRESS", label: "CRESS" },
  { value: "CREF", label: "CREF" },
  { value: "OUTRO", label: "Outro" },
];

export const CONSELHO_LABELS: Record<string, string> = Object.fromEntries(
  CONSELHO_OPTIONS.map((o) => [o.value, o.label])
);
