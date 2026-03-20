import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

// PUT - Atualizar dados de uma atividade clonada (geral, instruções, pontuações)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    if (!await hasPermission(user, "edit_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      atividadeCloneId,
      instrucaoId: instrucaoIdDirect,
      nome,
      protocolo,
      habilidade,
      marco_codificacao,
      tipo_ensino,
      qtd_alvos_sessao,
      qtd_tentativas_alvo,
      instrucoes,
      pontuacoes,
    } = body;

    // Modo rápido: atualizar campo de uma instrução diretamente
    if (instrucaoIdDirect && qtd_tentativas_alvo !== undefined) {
      await prisma.atividadeCloneInstrucao.update({
        where: { id: instrucaoIdDirect },
        data: { qtd_tentativas_alvo: qtd_tentativas_alvo },
      });
      return NextResponse.json({ success: true });
    }

    if (!atividadeCloneId) {
      return NextResponse.json(
        { error: "ID da atividade clone é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar que o clone existe
    const clone = await prisma.pacienteAtividadeClone.findUnique({
      where: { id: atividadeCloneId },
      include: {
        pacienteCurriculum: {
          include: {
            paciente: { select: { tenantId: true } },
          },
        },
      },
    });

    if (!clone) {
      return NextResponse.json(
        { error: "Atividade clone não encontrada" },
        { status: 404 }
      );
    }

    // Verificar tenant isolation
    if (clone.pacienteCurriculum.paciente.tenantId !== user.tenant?.id) {
      return NextResponse.json(
        { error: "Sem permissão para editar esta atividade" },
        { status: 403 }
      );
    }

    // Atualizar dentro de uma transaction
    await prisma.$transaction(async (tx) => {
      // 1. Atualizar campos gerais do clone
      const updateData: Prisma.PacienteAtividadeCloneUpdateInput = {};
      if (nome !== undefined) updateData.nome = nome;
      if (protocolo !== undefined) updateData.protocolo = protocolo || null;
      if (habilidade !== undefined) updateData.habilidade = habilidade || null;
      if (marco_codificacao !== undefined)
        updateData.marco_codificacao = marco_codificacao || null;
      if (tipo_ensino !== undefined)
        updateData.tipo_ensino = tipo_ensino || null;
      if (qtd_alvos_sessao !== undefined)
        updateData.qtd_alvos_sessao = qtd_alvos_sessao;
      if (qtd_tentativas_alvo !== undefined)
        updateData.qtd_tentativas_alvo = qtd_tentativas_alvo;

      if (Object.keys(updateData).length > 0) {
        await tx.pacienteAtividadeClone.update({
          where: { id: atividadeCloneId },
          data: updateData,
        });
      }

      // 2. Atualizar instruções (incremental: update existentes, criar novas, remover excluídas)
      if (instrucoes !== undefined) {
        const instrucoesExistentes = await tx.atividadeCloneInstrucao.findMany({
          where: { atividadeCloneId },
          select: { id: true },
        });
        const idsExistentes = new Set(instrucoesExistentes.map((i: { id: string }) => i.id));

        const idsRecebidos = new Set<string>();

        for (let index = 0; index < instrucoes.length; index++) {
          const instr = instrucoes[index] as {
            id?: string;
            texto: string;
            como_aplicar?: string;
            observacao?: string;
            procedimento_correcao?: string;
            materiais_utilizados?: string;
          };

          const dados = {
            ordem: index + 1,
            texto: instr.texto,
            como_aplicar: instr.como_aplicar || null,
            observacao: instr.observacao || null,
            procedimento_correcao: instr.procedimento_correcao || null,
            materiais_utilizados: instr.materiais_utilizados || null,
          };

          if (instr.id && idsExistentes.has(instr.id)) {
            // Instrução existente — atualizar sem tocar em faseAtual/fases
            await tx.atividadeCloneInstrucao.update({
              where: { id: instr.id },
              data: dados,
            });
            idsRecebidos.add(instr.id);
          } else {
            // Nova instrução — criar com InstrucaoFase padrão
            const novoId = randomUUID();
            await tx.atividadeCloneInstrucao.create({
              data: {
                id: novoId,
                atividadeCloneId,
                ...dados,
              },
            });
            // Criar 4 InstrucaoFase padrão para a nova instrução
            const fases: ("LINHA_BASE" | "INTERVENCAO" | "MANUTENCAO" | "GENERALIZACAO")[] = ["LINHA_BASE", "INTERVENCAO", "MANUTENCAO", "GENERALIZACAO"];
            await tx.instrucaoFase.createMany({
              data: [
                { id: randomUUID(), instrucaoId: novoId, fase: "LINHA_BASE", porcentagem_acerto: 80, qtd_sessoes_consecutivas: 1, fase_se_atingir: "INTERVENCAO", fase_se_nao_atingir: null },
                { id: randomUUID(), instrucaoId: novoId, fase: "INTERVENCAO", porcentagem_acerto: 80, qtd_sessoes_consecutivas: 1, fase_se_atingir: "MANUTENCAO", fase_se_nao_atingir: "LINHA_BASE" },
                { id: randomUUID(), instrucaoId: novoId, fase: "MANUTENCAO", porcentagem_acerto: 80, qtd_sessoes_consecutivas: 1, fase_se_atingir: "GENERALIZACAO", fase_se_nao_atingir: "INTERVENCAO" },
                { id: randomUUID(), instrucaoId: novoId, fase: "GENERALIZACAO", porcentagem_acerto: 80, qtd_sessoes_consecutivas: 1, fase_se_atingir: null, fase_se_nao_atingir: "MANUTENCAO" },
              ],
            });

            // Criar pontuações padrão por fase (copiar da atividade pai)
            const pontuacoesClone = await tx.atividadeClonePontuacao.findMany({
              where: { atividadeCloneId },
              orderBy: { ordem: "asc" },
            });
            if (pontuacoesClone.length > 0) {
              await tx.instrucaoPontuacao.createMany({
                data: fases.flatMap((f) =>
                  pontuacoesClone.map((p) => ({
                    id: randomUUID(),
                    instrucaoId: novoId,
                    fase: f,
                    ordem: p.ordem,
                    sigla: p.sigla,
                    grau: p.grau,
                  }))
                ),
              });
            }
            idsRecebidos.add(novoId);
          }
        }

        // Remover instruções que foram excluídas pelo usuário
        const idsParaRemover = [...idsExistentes].filter((id) => !idsRecebidos.has(id));
        if (idsParaRemover.length > 0) {
          await tx.atividadeCloneInstrucao.deleteMany({
            where: { id: { in: idsParaRemover } },
          });
        }
      }

      // 3. Atualizar pontuações (delete + recreate)
      if (pontuacoes !== undefined) {
        await tx.atividadeClonePontuacao.deleteMany({
          where: { atividadeCloneId },
        });

        if (pontuacoes.length > 0) {
          const pontuacaoData: Prisma.AtividadeClonePontuacaoCreateManyInput[] =
            pontuacoes.map(
              (
                pont: { sigla: string; grau: string },
                index: number
              ) => ({
                id: randomUUID(),
                atividadeCloneId,
                ordem: index + 1,
                sigla: pont.sigla,
                grau: pont.grau,
              })
            );

          await tx.atividadeClonePontuacao.createMany({ data: pontuacaoData });
        }
      }
    });

    // Retornar clone atualizado
    const cloneAtualizado = await prisma.pacienteAtividadeClone.findUnique({
      where: { id: atividadeCloneId },
      include: {
        instrucoes: { where: { ativo: true }, orderBy: { ordem: "asc" }, include: { fases: true } },
        pontuacoes: { orderBy: { ordem: "asc" } },
        fases: true,
        historico: { orderBy: { alterado_em: "desc" }, take: 5 },
      },
    });

    return NextResponse.json({
      success: true,
      data: cloneAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar clone:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
