// Parser para DEMONSTRATIVO_ANALISE_CONTA (ex: Hapvida/GNDI)
// Estrutura: demonstrativoAnaliseConta > dadosConta > dadosProtocolo > relacaoGuias (N)
//   Cada relacaoGuias: dados da guia + detalhesGuia (1..N) com procedimento e relacaoGlosa.
// Usa busca recursiva por "relacaoGuias" para ser resiliente a variações de aninhamento.

import { asArray, toNumber, toStr, toIsoDate } from "../helpers";
import type { DemonstrativoNormalizado, GuiaNormalizada } from "../types";

interface XmlNode { [key: string]: unknown }

function getNode(obj: unknown, key: string): XmlNode | undefined {
  if (obj && typeof obj === "object" && key in (obj as XmlNode)) {
    return (obj as XmlNode)[key] as XmlNode;
  }
  return undefined;
}

/** Coleta recursivamente todos os nós sob a chave informada */
function coletarNos(obj: unknown, chave: string, acc: XmlNode[]): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) coletarNos(item, chave, acc);
    return;
  }
  const node = obj as XmlNode;
  for (const [k, v] of Object.entries(node)) {
    if (k === chave) {
      for (const g of asArray(v as unknown)) acc.push(g as XmlNode);
    } else if (v && typeof v === "object") {
      coletarNos(v, chave, acc);
    }
  }
}

/** Extrai o primeiro código/descrição de glosa dentro dos detalhesGuia */
function extrairGlosa(guia: XmlNode): { codigo: string | null; descricao: string | null } {
  const detalhes = asArray(getNode(guia, "detalhesGuia") as unknown);
  for (const det of detalhes) {
    const relGlosa = asArray(getNode(det as XmlNode, "relacaoGlosa") as unknown);
    for (const rg of relGlosa) {
      const g = rg as XmlNode;
      const codigo = toStr(g.ansCodigo ?? g.tipoGlosa);
      const descricao = toStr(g.ansDescricao);
      if (codigo || descricao) return { codigo, descricao };
    }
  }
  return { codigo: null, descricao: null };
}

/** Primeira data de realização entre os detalhesGuia */
function primeiraDataRealizacao(guia: XmlNode): string | null {
  const detalhes = asArray(getNode(guia, "detalhesGuia") as unknown);
  for (const det of detalhes) {
    const d = toIsoDate((det as XmlNode).dataRealizacao);
    if (d) return d;
  }
  return null;
}

export function parseAnaliseConta(root: XmlNode): DemonstrativoNormalizado {
  const operadoraParaPrestador = getNode(root, "operadoraParaPrestador");
  const demonstrativosRetorno = getNode(operadoraParaPrestador, "demonstrativosRetorno");
  const demonstrativo = getNode(demonstrativosRetorno, "demonstrativoAnaliseConta");

  const cabecalho = getNode(demonstrativo, "cabecalhoDemonstrativo");

  // Coletar todas as guias recursivamente
  const guiasNodes: XmlNode[] = [];
  coletarNos(demonstrativo, "relacaoGuias", guiasNodes);

  const guias: GuiaNormalizada[] = guiasNodes.map((guia) => {
    const glosa = extrairGlosa(guia);
    return {
      numero_guia_prestador: toStr(guia.numeroGuiaPrestador),
      numero_guia_operadora: toStr(guia.numeroGuiaOperadora),
      senha: toStr(guia.senha),
      numero_carteira: toStr(guia.numeroCarteira),
      data_realizacao: primeiraDataRealizacao(guia),
      valor_informado: toNumber(guia.valorInformadoGuia),
      valor_processado: toNumber(guia.valorProcessadoGuia),
      valor_liberado: toNumber(guia.valorLiberadoGuia),
      valor_glosa: toNumber(guia.valorGlosaGuia),
      situacao: toStr(guia.situacaoGuia),
      codigo_glosa: glosa.codigo,
      descricao_glosa: glosa.descricao,
    };
  });

  // Totais: somar a partir das guias (resiliente a variações de tags de total)
  const totais = guias.reduce(
    (acc, g) => ({
      informado: acc.informado + g.valor_informado,
      processado: acc.processado + g.valor_processado,
      liberado: acc.liberado + g.valor_liberado,
      glosa: acc.glosa + g.valor_glosa,
    }),
    { informado: 0, processado: 0, liberado: 0, glosa: 0 }
  );

  return {
    tipo_demonstrativo: "DEMONSTRATIVO_ANALISE_CONTA",
    numero_demonstrativo: toStr(cabecalho?.numeroDemonstrativo),
    operadora_nome: toStr(cabecalho?.nomeOperadora),
    registro_ans: toStr(cabecalho?.registroANS),
    data_emissao: toIsoDate(cabecalho?.dataEmissao),
    valor_informado_total: totais.informado,
    valor_processado_total: totais.processado,
    valor_liberado_total: totais.liberado,
    valor_glosa_total: totais.glosa,
    guias,
  };
}
