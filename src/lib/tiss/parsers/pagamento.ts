// Parser para DEMONSTRATIVO_PAGAMENTO (ex: Bradesco)
// Estrutura: demonstrativoPagamento > pagamentos > pagamentosPorData > dadosResumo
//            > relacaoProtocolos > guiasDoLote
//
// A conciliação se concentra nas LINHAS DE ATENDIMENTO (guias): os totais são somados
// a partir das guias lidas, não dos totais de cabeçalho. Isso também evita o problema
// de demonstrativos (ex: Bradesco) que trazem `valorGlosaBruto` incorreto no cabeçalho.

import { asArray, toNumber, toStr, toIsoDate } from "../helpers";
import type { DemonstrativoNormalizado, GuiaNormalizada } from "../types";

interface XmlNode { [key: string]: unknown }

function getNode(obj: unknown, key: string): XmlNode | undefined {
  if (obj && typeof obj === "object" && key in (obj as XmlNode)) {
    return (obj as XmlNode)[key] as XmlNode;
  }
  return undefined;
}

export function parsePagamento(root: XmlNode): DemonstrativoNormalizado {
  const operadoraParaPrestador = getNode(root, "operadoraParaPrestador");
  const demonstrativosRetorno = getNode(operadoraParaPrestador, "demonstrativosRetorno");
  const demonstrativoPagamento = getNode(demonstrativosRetorno, "demonstrativoPagamento");

  const cabecalho = getNode(demonstrativoPagamento, "cabecalhoDemonstrativo");

  const guias: GuiaNormalizada[] = [];

  const pagamentos = getNode(demonstrativoPagamento, "pagamentos");
  const pagamentosPorDataArr = asArray(getNode(pagamentos, "pagamentosPorData") as unknown);

  for (const ppd of pagamentosPorDataArr) {
    const dadosResumo = getNode(ppd as XmlNode, "dadosResumo");
    const relacaoProtocolosArr = asArray(getNode(dadosResumo, "relacaoProtocolos") as unknown);

    for (const protocolo of relacaoProtocolosArr) {
      const guiasDoLoteArr = asArray(getNode(protocolo as XmlNode, "guiasDoLote") as unknown);
      for (const g of guiasDoLoteArr) {
        const guia = g as XmlNode;
        const liberado = toNumber(guia.valorLiberadoGuia);
        const glosa = toNumber(guia.valorGlosaGuia);
        // Este formato não traz valorInformadoGuia → estimamos como liberado + glosa
        const informado = guia.valorInformadoGuia !== undefined
          ? toNumber(guia.valorInformadoGuia)
          : liberado + glosa;
        guias.push({
          numero_guia_prestador: toStr(guia.numeroGuiaPrestador),
          numero_guia_operadora: toStr(guia.numeroGuiaOperadora),
          senha: toStr(guia.senha),
          numero_carteira: toStr(guia.numeroCarteira),
          data_realizacao: toIsoDate(guia.dataRealizacao),
          valor_informado: informado,
          valor_processado: toNumber(guia.valorProcessadoGuia),
          valor_liberado: liberado,
          valor_glosa: glosa,
          situacao: toStr(guia.tipoPagamento),
          codigo_glosa: null, // este formato não traz código de glosa
          descricao_glosa: null,
        });
      }
    }
  }

  // Totais somados a partir das LINHAS DE ATENDIMENTO (guias)
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
    tipo_demonstrativo: "DEMONSTRATIVO_PAGAMENTO",
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
