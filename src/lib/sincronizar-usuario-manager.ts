import { prisma } from "@/lib/prisma";
import {
  managerClient,
  ManagerRequestError,
  type UsuarioManager,
} from "@/lib/manager-client";
import { registrarErroApi } from "@/lib/erro-prisma";
import { normalizarEmail } from "@/lib/email";

/**
 * Sincronização de identidade (e-mail, nome) entre o Sistema 2 e o Manager.
 *
 * O Manager é a FONTE DA VERDADE: é ele que autentica. `profissional.email` e
 * `profissional.nome` são cópias locais. Duas direções, regras diferentes:
 *
 * - App → Manager (escrita): a ficha do profissional grava no Manager PRIMEIRO
 *   e só então na cópia local. Se o Manager recusar, nada é salvo.
 * - Manager → App (leitura): só o E-MAIL é realinhado pelo Manager. O e-mail
 *   do Manager é, por definição, o que funciona no login. O nome NÃO é
 *   realinhado: ele é editado no App e realinhar desfaria essa edição.
 */

export type ResultadoPropagacao =
  | { ok: true; usuario: UsuarioManager | null }
  | { ok: false; status: number; error: string };

/**
 * Grava as alterações de identidade no Manager. Chamar ANTES de atualizar o
 * profissional local, e só com os campos que de fato mudaram.
 */
export async function propagarIdentidadeAoManager(
  usuarioId: string,
  alteracoes: { email?: string; name?: string },
  ssoToken: string
): Promise<ResultadoPropagacao> {
  if (alteracoes.email === undefined && alteracoes.name === undefined) {
    return { ok: true, usuario: null };
  }

  try {
    const usuario = await managerClient.updateUser(usuarioId, alteracoes, ssoToken);
    return { ok: true, usuario };
  } catch (error) {
    if (error instanceof ManagerRequestError) {
      // Erros de dado (e-mail inválido, em uso, usuário inexistente) e de
      // sessão seguem com o status original; o resto vira 502.
      if ([400, 401, 404, 409].includes(error.status)) {
        return { ok: false, status: error.status, error: error.message };
      }
    }
    registrarErroApi({ rota: "manager:update-with-sso", acao: "PUT", usuarioId }, error);
    return {
      ok: false,
      status: 502,
      error:
        "Não foi possível atualizar o login no sistema de gestão. Nenhuma alteração foi salva.",
    };
  }
}

/**
 * Realinha `profissional.email` com o e-mail do Manager para os usuários
 * informados. Devolve quantos registros foram corrigidos.
 */
export async function alinharEmailsComManager(
  tenantId: string,
  usuarios: UsuarioManager[]
): Promise<number> {
  // Normaliza também aqui: um e-mail com maiúsculas ainda não migrado no
  // Manager não pode desfazer a cópia local já em minúsculas
  const emailPorUsuario = new Map(usuarios.map((u) => [u.id, normalizarEmail(u.email)]));
  if (emailPorUsuario.size === 0) return 0;

  const profissionais = await prisma.profissional.findMany({
    where: { tenantId, usuarioId: { in: [...emailPorUsuario.keys()] } },
    select: { id: true, usuarioId: true, email: true },
  });

  const divergentes = profissionais.flatMap((p) => {
    const emailManager = p.usuarioId ? emailPorUsuario.get(p.usuarioId) : undefined;
    return emailManager && emailManager !== p.email
      ? [{ id: p.id, email: emailManager }]
      : [];
  });

  if (divergentes.length === 0) return 0;

  await prisma.$transaction(
    divergentes.map((d) =>
      // tenant-ok: ids vêm da consulta acima, já filtrada por tenantId
      prisma.profissional.update({ where: { id: d.id }, data: { email: d.email } })
    )
  );

  return divergentes.length;
}

/**
 * Busca os usuários da clínica no Manager e realinha os e-mails locais.
 * Nunca lança: falha do Manager não pode derrubar a tela nem o login, então
 * devolve `null` e quem chama segue com a cópia local.
 */
export async function sincronizarEmailsDoTenant(
  tenantId: string,
  ssoToken: string
): Promise<UsuarioManager[] | null> {
  try {
    const usuarios = await managerClient.listUsers(ssoToken);
    await alinharEmailsComManager(tenantId, usuarios);
    return usuarios;
  } catch (error) {
    registrarErroApi({ rota: "manager:list-with-sso", acao: "GET", tenantId }, error);
    return null;
  }
}
