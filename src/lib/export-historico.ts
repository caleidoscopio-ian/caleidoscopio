"use client";

import type { AtendimentoHistorico, HistoricoResumo } from "@/types/historico-atendimento";
import { STATUS_AGENDAMENTO_LABELS } from "@/types/agendamento";
import { formatBRL } from "@/lib/preco-procedimento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function fmtDt(iso: string | null): string {
  if (!iso) return "";
  return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
}

function fmtHr(iso: string | null): string {
  if (!iso) return "";
  return format(new Date(iso), "HH:mm", { locale: ptBR });
}

function fmtMin(min: number | null): string {
  if (min === null) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export function exportarCSV(
  linhas: AtendimentoHistorico[],
  periodo: { inicio: string; fim: string }
): void {
  const cabecalho = [
    "Data",
    "Início",
    "Fim",
    "Duração",
    "Status",
    "Paciente",
    "Profissional",
    "Especialidade",
    "Procedimento",
    "Código",
    "Convênio",
    "Valor",
    "Origem Valor",
    "Sala",
    "Filial",
    "Chegada",
    "Início Real",
    "Fim Real",
    "Tempo Espera",
    "Duração Real",
    "Motivo Falta",
    "Observações",
  ];

  const escape = (v: string | null | undefined): string => {
    if (!v) return "";
    const s = String(v);
    if (s.includes(";") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = linhas.map((l) => [
    escape(fmtDt(l.data_hora)),
    escape(fmtHr(l.data_hora)),
    escape(fmtHr(l.horario_fim)),
    escape(fmtMin(l.duracao_minutos)),
    escape(STATUS_AGENDAMENTO_LABELS[l.status] ?? l.status),
    escape(l.paciente.nome),
    escape(l.profissional.nome),
    escape(l.profissional.especialidade),
    escape(l.procedimento?.nome ?? ""),
    escape(l.procedimento?.codigo ?? ""),
    escape(l.convenio?.nome ?? "Particular"),
    escape(l.valor !== null ? String(l.valor).replace(".", ",") : ""),
    escape(l.origem_valor ?? ""),
    escape(l.sala ?? ""),
    escape(l.filial ?? ""),
    escape(fmtHr(l.hora_chegada)),
    escape(fmtHr(l.hora_inicio_real)),
    escape(fmtHr(l.hora_fim_real)),
    escape(fmtMin(l.tempo_espera_min)),
    escape(fmtMin(l.duracao_real_min)),
    escape(l.motivo_falta ?? ""),
    escape(l.observacoes ?? ""),
  ]);

  const conteudo =
    "﻿" +
    [cabecalho, ...rows].map((r) => r.join(";")).join("\r\n");

  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historico-atendimentos_${fmtDt(periodo.inicio).replace(/\//g, "-")}_${fmtDt(periodo.fim).replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF ─────────────────────────────────────────────────────────────────────

export async function exportarPDF(
  linhas: AtendimentoHistorico[],
  periodo: { inicio: string; fim: string },
  resumo: HistoricoResumo
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const periodoStr = `${fmtDt(periodo.inicio)} a ${fmtDt(periodo.fim)}`;

  // Cabeçalho
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Histórico de Atendimentos", 14, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${periodoStr}`, 14, 22);

  // KPIs em linha
  const kpiY = 28;
  const kpis = [
    `Realizados: ${resumo.total_atendimentos}`,
    `Valor Total: ${formatBRL(resumo.valor_total)}`,
    `Ticket Médio: ${formatBRL(resumo.ticket_medio)}`,
    `Faltas: ${resumo.faltas}`,
    `Cancelamentos: ${resumo.cancelamentos}`,
  ];
  doc.setFontSize(8);
  kpis.forEach((k, i) => doc.text(k, 14 + i * 56, kpiY));

  // Tabela
  autoTable(doc, {
    startY: kpiY + 6,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 18 }, // Data
      1: { cellWidth: 20 }, // Horário
      2: { cellWidth: 14 }, // Status
      3: { cellWidth: 34 }, // Paciente
      4: { cellWidth: 30 }, // Profissional
      5: { cellWidth: 30 }, // Procedimento
      6: { cellWidth: 18 }, // Convênio
      7: { cellWidth: 18 }, // Valor
      8: { cellWidth: 18 }, // Sala
      9: { cellWidth: 18 }, // Filial
      10: { cellWidth: 20 }, // Chegada/Início/Fim Real
      11: { cellWidth: 16 }, // Espera
    },
    head: [[
      "Data", "Horário", "Status", "Paciente",
      "Profissional", "Procedimento", "Convênio",
      "Valor", "Sala", "Filial",
      "Horários Reais", "Espera",
    ]],
    body: linhas.map((l) => [
      fmtDt(l.data_hora),
      `${fmtHr(l.data_hora)}–${fmtHr(l.horario_fim)}`,
      STATUS_AGENDAMENTO_LABELS[l.status] ?? l.status,
      l.paciente.nome,
      l.profissional.nome,
      l.procedimento?.nome ?? "—",
      l.convenio?.nome ?? "Particular",
      l.valor !== null ? formatBRL(l.valor) : "—",
      l.sala ?? "—",
      l.filial ?? "—",
      [
        l.hora_chegada ? `Ch: ${fmtHr(l.hora_chegada)}` : "",
        l.hora_inicio_real ? `In: ${fmtHr(l.hora_inicio_real)}` : "",
        l.hora_fim_real ? `Fi: ${fmtHr(l.hora_fim_real)}` : "",
      ].filter(Boolean).join("\n") || "—",
      fmtMin(l.tempo_espera_min) || "—",
    ]),
    didDrawPage: (hookData) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.text(
        `Página ${hookData.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" }
      );
    },
  });

  doc.save(
    `historico-atendimentos_${fmtDt(periodo.inicio).replace(/\//g, "-")}_${fmtDt(periodo.fim).replace(/\//g, "-")}.pdf`
  );
}
