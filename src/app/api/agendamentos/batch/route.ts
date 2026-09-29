import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { StatusAgendamento } from "@/types/agendamento";
import { registrarErroApi } from "@/lib/erro-prisma";

// API para criar múltiplos agendamentos de uma vez
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Agendamentos Batch - Criando agendamentos em massa...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Agendamentos Batch - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, "create_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para criar agendamentos" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      pacienteId,
      profissionalId,
      datas, // Array de strings ISO de datas
      horario, // String "HH:mm" - horário de início
      horario_fim, // String "HH:mm" - horário de término
      salaId,
      procedimento,
      status = StatusAgendamento.AGENDADO,
      observacoes,
      valor_particular,
      // Quando a recorrência é adicionada a um agendamento que já existe
      // (editar um avulso e ligar a repetição), o id dele vem aqui para que
      // todas as ocorrências fiquem na mesma série
      agendamentoOrigemId,
    } = body;

    // Validações
    if (!pacienteId || !profissionalId || !datas || !Array.isArray(datas) || datas.length === 0 || !horario || !horario_fim || !salaId) {
      return NextResponse.json(
        { error: "Paciente, profissional, sala, datas (array), horário de início e fim são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se paciente existe e pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se profissional existe e pertence à clínica
    const profissional = await prisma.profissional.findFirst({
      where: {
        id: profissionalId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!profissional) {
      return NextResponse.json(
        { error: "Profissional não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se sala existe (obrigatória agora)
    const salaExistente = await prisma.sala.findFirst({
      where: {
        id: salaId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!salaExistente) {
      return NextResponse.json(
        { error: "Sala não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar procedimento se fornecido
    if (procedimento) {
      const procedimentoExistente = await prisma.procedimento.findFirst({
        where: {
          id: procedimento,
          tenantId: user.tenant.id,
          ativo: true,
        },
      });

      if (!procedimentoExistente) {
        return NextResponse.json(
          { error: "Procedimento não encontrado ou não pertence a esta clínica" },
          { status: 404 }
        );
      }
    }

    // Processar cada data
    const resultados = [];

    // Cada item de `datas` já chega como instante completo, montado no fuso do
    // navegador. O servidor NÃO recombina data + horário: em produção ele roda
    // em UTC e `setHours(9, 0)` gravava 09:00 UTC, ou seja 06:00 no horário de
    // Brasília. Daqui só sai a duração, que independe de fuso.
    const [hourInicio, minuteInicio] = horario.split(":").map(Number);
    const [hourFim, minuteFim] = horario_fim.split(":").map(Number);
    const duracaoMinutos = hourFim * 60 + minuteFim - (hourInicio * 60 + minuteInicio);

    if (!Number.isFinite(duracaoMinutos) || duracaoMinutos <= 0) {
      return NextResponse.json(
        { error: "Horário de término deve ser maior que o horário de início" },
        { status: 400 }
      );
    }

    // Agrupa os agendamentos desta recorrência para permitir excluir, cancelar
    // ou editar "este e os futuros" / "toda a série" depois.
    let serieId: string | null = datas.length > 1 ? randomUUID() : null;

    if (agendamentoOrigemId) {
      const origem = await prisma.agendamento.findFirst({
        where: {
          id: agendamentoOrigemId,
          paciente: { tenantId: user.tenant.id }, // 🔒 isolamento de tenant
        },
        select: { id: true, serieId: true },
      });

      if (!origem) {
        return NextResponse.json(
          { error: "Agendamento de origem não encontrado ou não pertence a esta clínica" },
          { status: 404 }
        );
      }

      // Reaproveita a série existente; se o agendamento era avulso, cria a
      // série agora e marca a origem, para ela entrar nas operações em lote
      serieId = origem.serieId ?? randomUUID();
      if (!origem.serieId) {
        await prisma.agendamento.update({
          where: { id: origem.id },
          data: { serieId },
        });
      }
    }

    // Mesmo valor particular para todas as ocorrências da recorrência
    const valorParticularNormalizado =
      valor_particular === null || valor_particular === undefined || valor_particular === ""
        ? null
        : Number.isFinite(Number(valor_particular)) && Number(valor_particular) >= 0
          ? Number(valor_particular)
          : null;

    for (const dataStr of datas) {
      try {
        // Instante recebido do cliente, usado como está
        const dataHora = new Date(dataStr);

        if (Number.isNaN(dataHora.getTime())) {
          resultados.push({
            data: dataStr,
            success: false,
            error: "Data inválida",
          });
          continue;
        }

        const dataFim = new Date(dataHora.getTime() + duracaoMinutos * 60000);

        // Verificar conflito de profissional
        const agendamentosProf = await prisma.agendamento.findMany({
          where: {
            profissionalId,
            status: {
              notIn: [StatusAgendamento.CANCELADO, StatusAgendamento.FALTOU],
            },
          },
          select: {
            id: true,
            data_hora: true,
            horario_fim: true,
          },
        });

        const conflitoProf = agendamentosProf.find((ag) => {
          const agInicio = new Date(ag.data_hora);
          const agFim = new Date(ag.horario_fim);
          return dataHora < agFim && dataFim > agInicio;
        });

        if (conflitoProf) {
          resultados.push({
            data: dataStr,
            success: false,
            error: "Profissional já possui agendamento neste horário",
          });
          continue;
        }

        // Verificar conflito de sala (se sala foi informada)
        if (salaId) {
          const agendamentosSala = await prisma.agendamento.findMany({
            where: {
              salaId,
              status: {
                notIn: [StatusAgendamento.CANCELADO, StatusAgendamento.FALTOU],
              },
            },
            select: {
              id: true,
              data_hora: true,
              horario_fim: true,
            },
          });

          const conflitoSala = agendamentosSala.find((ag) => {
            const agInicio = new Date(ag.data_hora);
            const agFim = new Date(ag.horario_fim);
            return dataHora < agFim && dataFim > agInicio;
          });

          if (conflitoSala) {
            resultados.push({
              data: dataStr,
              success: false,
              error: "Sala já está ocupada neste horário",
            });
            continue;
          }
        }

        // Criar agendamento
        const agendamento = await prisma.agendamento.create({
          data: {
            pacienteId,
            profissionalId,
            data_hora: dataHora,
            horario_fim: dataFim,
            duracao_minutos: Math.round((dataFim.getTime() - dataHora.getTime()) / 60000), // Calcular para compatibilidade
            salaId: salaId,
            sala: salaId,
            procedimentoId: procedimento || null,
            status,
            observacoes,
            valor_particular: valorParticularNormalizado,
            serieId,
          },
          include: {
            paciente: {
              select: {
                id: true,
                nome: true,
                foto: true,
                cor_agenda: true,
              },
            },
            profissional: {
              select: {
                id: true,
                nome: true,
                especialidade: true,
              },
            },
            salaRelacao: {
              select: {
                id: true,
                nome: true,
                cor: true,
              },
            },
            procedimento: {
              select: {
                id: true,
                nome: true,
                codigo: true,
                cor: true,
              },
            },
          },
        });

        resultados.push({
          data: dataStr,
          success: true,
          agendamento,
        });
      } catch (error) {
        registrarErroApi({ rota: "/api/agendamentos/batch", acao: "POST" }, error);
        resultados.push({
          data: dataStr,
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    const sucessos = resultados.filter((r) => r.success).length;
    const falhas = resultados.filter((r) => !r.success).length;

    console.log(
      `✅ Agendamento em massa concluído: ${sucessos} sucessos, ${falhas} falhas`
    );

    return NextResponse.json({
      success: true,
      message: `${sucessos} agendamento(s) criado(s) com sucesso, ${falhas} falha(s)`,
      resultados,
      resumo: {
        total: resultados.length,
        sucessos,
        falhas,
      },
    });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/agendamentos/batch", acao: "POST" }, error);

    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido", ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
