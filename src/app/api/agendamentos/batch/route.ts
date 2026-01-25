import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { StatusAgendamento } from "@/types/agendamento";

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
    if (!hasPermission(user, "create_patients")) {
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
    const [hourInicio, minuteInicio] = horario.split(":").map(Number);
    const [hourFim, minuteFim] = horario_fim.split(":").map(Number);

    for (const dataStr of datas) {
      try {
        // Criar data/hora combinando data e horário
        const dataHora = new Date(dataStr);
        dataHora.setHours(hourInicio, minuteInicio, 0, 0);

        const dataFim = new Date(dataStr);
        dataFim.setHours(hourFim, minuteFim, 0, 0);

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
        console.error(`Erro ao criar agendamento para data ${dataStr}:`, error);
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
    console.error("❌ Erro ao criar agendamentos em massa:", error);

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
