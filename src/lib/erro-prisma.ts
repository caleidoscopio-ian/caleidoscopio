// Tradução e registro de erros de banco.
//
// Objetivo duplo:
//   1. Dar ao usuário uma mensagem que explique o que houve, em vez de
//      "Erro interno do servidor".
//   2. Deixar no log uma linha estruturada com uma referência curta, que também
//      aparece na tela — assim dá para casar o relato do usuário com o log da
//      Vercel sem caçar por horário.
//
// O log NUNCA recebe dado de paciente (nome, CPF, telefone, endereço). É um
// sistema clínico: identificação de paciente não pode vazar para o log.

import { Prisma } from "@prisma/client";

/** Rótulos amigáveis para os campos que mais aparecem em erro de constraint */
const CAMPOS: Record<string, string> = {
  cpf: "CPF",
  email: "e-mail",
  nome: "nome",
  codigo: "código",
  cnpj: "CNPJ",
  convenioId: "convênio",
  filialId: "filial",
  profissionalId: "profissional",
  pacienteId: "paciente",
  salaId: "sala",
  procedimentoId: "procedimento",
  ordem: "ordem",
  nascimento: "data de nascimento",
};

const rotular = (campo: string): string => CAMPOS[campo] ?? campo;

/** Palavras femininas entre os rótulos, para a frase concordar */
const FEMININOS = new Set(["filial", "sala", "ordem", "data de nascimento"]);

/** "filial" + "informado" -> "A filial informada"; "convênio" -> "O convênio informado" */
function concordar(campo: string, adjetivo: string): string {
  if (FEMININOS.has(campo)) {
    return `A ${campo} ${adjetivo.replace(/o$/, "a")}`;
  }
  return `O ${campo} ${adjetivo}`;
}

function listarCampos(meta: unknown, chave: string): string[] {
  const valor = (meta as Record<string, unknown> | undefined)?.[chave];
  if (Array.isArray(valor)) return valor.map(String);
  if (typeof valor === "string") return [valor];
  return [];
}

export type CategoriaErro =
  | "constraint" // dado conflita com regra do banco
  | "vinculo" // chave estrangeira apontando para algo inexistente
  | "validacao" // valor fora do formato/enum esperado
  | "conexao" // banco inacessível, pool esgotado, timeout
  | "concorrencia" // transação abortada, deadlock
  | "desconhecido";

export interface ErroClassificado {
  categoria: CategoriaErro;
  codigo: string | null;
  /** Mensagem para o usuário; null quando não sabemos explicar */
  mensagem: string | null;
  /** Detalhe técnico, seguro para log e para o campo `details` */
  detalhe: string;
}

// Família de conexão/pool — é aqui que cai saturação do pooler do Neon,
// banco inacessível e timeout de operação. Sem isso, tudo virava 500 mudo.
const CODIGOS_CONEXAO: Record<string, string> = {
  P2024:
    "O banco de dados está sobrecarregado no momento (sem conexão disponível). Aguarde alguns segundos e tente de novo.",
  P1001: "Não foi possível alcançar o banco de dados. Tente novamente em instantes.",
  P1002: "O banco de dados demorou demais para responder. Tente novamente.",
  P1008: "A operação demorou mais que o limite e foi cancelada. Tente novamente.",
  P1017: "A conexão com o banco foi encerrada durante a operação. Tente novamente.",
};

const CODIGOS_CONCORRENCIA: Record<string, string> = {
  P2028: "A operação foi interrompida no meio. Nada foi salvo — tente novamente.",
  P2034:
    "Outra operação mexeu nos mesmos dados ao mesmo tempo. Nada foi salvo — tente novamente.",
};

export function classificarErro(erro: unknown): ErroClassificado {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    const detalhe = `${erro.code} ${erro.message.split("\n").pop()?.trim() ?? ""}`.trim();

    if (CODIGOS_CONEXAO[erro.code]) {
      return { categoria: "conexao", codigo: erro.code, mensagem: CODIGOS_CONEXAO[erro.code], detalhe };
    }
    if (CODIGOS_CONCORRENCIA[erro.code]) {
      return { categoria: "concorrencia", codigo: erro.code, mensagem: CODIGOS_CONCORRENCIA[erro.code], detalhe };
    }

    switch (erro.code) {
      case "P2002": {
        const campos = listarCampos(erro.meta, "target").map(rotular);
        return {
          categoria: "constraint",
          codigo: erro.code,
          mensagem:
            campos.length > 0
              ? `Já existe um registro com este ${campos.join(" + ")}.`
              : "Já existe um registro com esses dados.",
          detalhe,
        };
      }
      case "P2003": {
        // Postgres manda o nome da constraint ("pacientes_filialId_fkey"), não o
        // campo. Extrair dali deixa a mensagem apontar exatamente o que falhou.
        const bruto =
          listarCampos(erro.meta, "field_name")[0] ??
          listarCampos(erro.meta, "constraint")[0] ??
          "";
        // \w inclui "_", o que capturava "convenios_convenioId" em vez de "convenioId"
        const nomeCampo = /_([A-Za-z0-9]+)_fkey$/.exec(bruto)?.[1] ?? bruto;
        const campo = nomeCampo ? rotular(nomeCampo) : null;
        return {
          categoria: "vinculo",
          codigo: erro.code,
          mensagem: campo
            ? `${concordar(campo, "informado")} não existe ou não pertence a esta clínica.`
            : "Um dos itens vinculados não existe ou não pertence a esta clínica.",
          detalhe,
        };
      }
      case "P2025":
        return {
          categoria: "vinculo",
          codigo: erro.code,
          mensagem: "O registro que você tentou alterar não foi encontrado.",
          detalhe,
        };
      case "P2000": {
        const campo = listarCampos(erro.meta, "column_name").map(rotular)[0];
        return {
          categoria: "validacao",
          codigo: erro.code,
          mensagem: campo
            ? `O valor informado em ${campo} é longo demais.`
            : "Um dos valores informados é longo demais.",
          detalhe,
        };
      }
      case "P2011": {
        const campo = listarCampos(erro.meta, "constraint").map(rotular)[0];
        return {
          categoria: "validacao",
          codigo: erro.code,
          mensagem: campo ? `O campo ${campo} é obrigatório.` : "Um campo obrigatório ficou em branco.",
          detalhe,
        };
      }
      default:
        return {
          categoria: "desconhecido",
          codigo: erro.code,
          mensagem: `Erro de banco de dados (${erro.code}).`,
          detalhe,
        };
    }
  }

  if (erro instanceof Prisma.PrismaClientValidationError) {
    return {
      categoria: "validacao",
      codigo: "VALIDACAO",
      mensagem:
        "Algum campo veio com valor inválido. Confira data de nascimento, sexo e parentesco dos responsáveis.",
      detalhe: erro.message.split("\n").slice(-3).join(" ").trim(),
    };
  }

  if (erro instanceof Prisma.PrismaClientInitializationError) {
    return {
      categoria: "conexao",
      codigo: erro.errorCode ?? "INIT",
      mensagem: "Não foi possível conectar ao banco de dados. Tente novamente em instantes.",
      detalhe: erro.message.split("\n").slice(0, 2).join(" ").trim(),
    };
  }

  if (erro instanceof Prisma.PrismaClientRustPanicError) {
    return {
      categoria: "conexao",
      codigo: "PANIC",
      mensagem: "O banco de dados encerrou a operação de forma inesperada. Tente novamente.",
      detalhe: erro.message.split("\n")[0],
    };
  }

  return {
    categoria: "desconhecido",
    codigo: null,
    mensagem: null,
    detalhe: erro instanceof Error ? erro.message.split("\n").slice(-3).join(" ").trim() : "Erro desconhecido",
  };
}

/** Mensagem para o usuário, ou null quando o erro não é reconhecido */
export const traduzirErroPrisma = (erro: unknown): string | null => classificarErro(erro).mensagem;

/** Detalhe técnico do erro */
export const detalharErro = (erro: unknown): string => classificarErro(erro).detalhe;

export interface ContextoErro {
  rota: string;
  acao: string;
  tenantId?: string | null;
  usuarioId?: string | null;
  /** Ids envolvidos — NUNCA nome, CPF, telefone ou endereço */
  referencias?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Registra o erro numa linha estruturada e devolve uma referência curta.
 * Essa referência vai também para a tela, então o usuário consegue reportar
 * "deu erro, ref a3f9c1" e a linha é achada no log com uma busca só.
 */
export function registrarErroApi(contexto: ContextoErro, erro: unknown): {
  ref: string;
  classificacao: ErroClassificado;
} {
  const ref = Math.random().toString(16).slice(2, 8);
  const classificacao = classificarErro(erro);

  console.error(
    JSON.stringify({
      tipo: "erro_api",
      ref,
      rota: contexto.rota,
      acao: contexto.acao,
      categoria: classificacao.categoria,
      codigo: classificacao.codigo,
      detalhe: classificacao.detalhe,
      tenantId: contexto.tenantId ?? null,
      usuarioId: contexto.usuarioId ?? null,
      referencias: contexto.referencias ?? {},
      em: new Date().toISOString(),
    })
  );

  return { ref, classificacao };
}
