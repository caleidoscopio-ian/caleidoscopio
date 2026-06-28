// Dispatcher TISS — detecta o tipo de demonstrativo e delega ao parser específico.
// Arquitetura extensível: novos tipos de demonstrativo = novo parser + case aqui.

import { XMLParser } from "fast-xml-parser";
import { decodeXml } from "./helpers";
import { parsePagamento } from "./parsers/pagamento";
import { parseAnaliseConta } from "./parsers/analise-conta";
import { TissParseError, type DemonstrativoNormalizado } from "./types";

interface XmlNode { [key: string]: unknown }

const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,   // remove o prefixo "ans:" das tags
  parseTagValue: false,   // mantém valores como string (evita perder zeros/decimais)
  trimValues: true,
});

/**
 * Faz o parse de um demonstrativo TISS (Buffer do XML) para o modelo normalizado.
 * Detecta encoding e tipo de transação automaticamente.
 */
export function parseDemonstrativo(buffer: Buffer): DemonstrativoNormalizado {
  const xmlString = decodeXml(buffer);

  let parsed: XmlNode;
  try {
    parsed = parser.parse(xmlString) as XmlNode;
  } catch (e) {
    throw new TissParseError(`Falha ao ler o XML: ${e instanceof Error ? e.message : "erro desconhecido"}`);
  }

  // Raiz: mensagemTISS (busca tolerante caso a chave venha com prefixo)
  const mensagem = (parsed.mensagemTISS ?? buscarValorPorChave(parsed, "mensagemTISS") ?? parsed) as XmlNode;
  if (!mensagem || typeof mensagem !== "object") {
    throw new TissParseError("XML não é um demonstrativo TISS válido (mensagemTISS ausente).");
  }

  // Tipo de transação — caminho direto, com fallback de busca profunda
  const cabecalho = mensagem.cabecalho as XmlNode | undefined;
  const idTransacao = cabecalho?.identificacaoTransacao as XmlNode | undefined;
  const tipoTransacao = String(
    idTransacao?.tipoTransacao ?? buscarValorPorChave(parsed, "tipoTransacao") ?? ""
  ).trim();

  switch (tipoTransacao) {
    case "DEMONSTRATIVO_PAGAMENTO":
      return parsePagamento(mensagem);
    case "DEMONSTRATIVO_ANALISE_CONTA":
      return parseAnaliseConta(mensagem);
    default: {
      // Diagnóstico para facilitar identificar encoding/estrutura inesperada
      const hex = buffer.subarray(0, 12).toString("hex").match(/../g)?.join(" ") ?? "";
      const previewXml = xmlString.slice(0, 80).replace(/\s+/g, " ");
      throw new TissParseError(
        `Tipo de demonstrativo não suportado: "${tipoTransacao || "desconhecido"}". ` +
        `Suportados: DEMONSTRATIVO_PAGAMENTO, DEMONSTRATIVO_ANALISE_CONTA. ` +
        `[diag bytes=${hex} | xml="${previewXml}"]`
      );
    }
  }
}

/** Busca profunda pelo primeiro valor cuja chave corresponda (exata ou com prefixo "ns:") */
function buscarValorPorChave(obj: unknown, chave: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = buscarValorPorChave(item, chave);
      if (r !== undefined) return r;
    }
    return undefined;
  }
  for (const [k, v] of Object.entries(obj as XmlNode)) {
    if (k === chave || k.endsWith(`:${chave}`)) return v;
    const r = buscarValorPorChave(v, chave);
    if (r !== undefined) return r;
  }
  return undefined;
}

export { TissParseError } from "./types";
export type { DemonstrativoNormalizado, GuiaNormalizada } from "./types";
