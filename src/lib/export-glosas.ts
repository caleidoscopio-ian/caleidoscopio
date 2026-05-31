"use client";

import type { Glosa, GlosaResumo } from "@/types/glosa";
import { CATEGORIA_GLOSA_LABEL, STATUS_GLOSA_LABEL } from "@/types/glosa";
import { formatBRL } from "@/lib/preco-procedimento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function fmtDt(iso: string | null): string {
  if (!iso) return "";
  return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
}

function esc(v: string | null | undefined): string {
  if (!v) return "";
  const s = String(v);
  return s.includes(";") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function fmtVal(v: number | null): string {
  if (v === null) return "";
  return String(v).replace(".", ",");
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export function exportarGlosasCSV(
  linhas: Glosa[],
  periodo: { inicio: string; fim: string }
): void {
  const cabecalho = [
    "Data Glosa", "Data Atendimento", "Paciente", "Profissional", "Procedimento",
    "Convênio", "Categoria", "Código Glosa", "Motivo", "Status",
    "Valor Cobrado", "Valor Glosado", "Valor Recuperado", "Observações",
  ];

  const rows = linhas.map((l) => [
    esc(fmtDt(l.data_glosa)),
    esc(fmtDt(l.data_atendimento)),
    esc(l.paciente.nome),
    esc(l.profissional?.nome ?? ""),
    esc(l.procedimento?.nome ?? ""),
    esc(l.convenio?.nome ?? "Particular"),
    esc(CATEGORIA_GLOSA_LABEL[l.categoria]),
    esc(l.codigo_glosa ?? ""),
    esc(l.motivo),
    esc(STATUS_GLOSA_LABEL[l.status]),
    esc(fmtVal(l.valor_cobrado)),
    esc(fmtVal(l.valor_glosado)),
    esc(l.valor_recuperado !== null ? fmtVal(l.valor_recuperado) : ""),
    esc(l.observacoes ?? ""),
  ]);

  const conteudo = "﻿" + [cabecalho, ...rows].map((r) => r.join(";")).join("\r\n");
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `glosas_${fmtDt(periodo.inicio).replace(/\//g, "-")}_${fmtDt(periodo.fim).replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF ─────────────────────────────────────────────────────────────────────

export async function exportarGlosasPDF(
  linhas: Glosa[],
  periodo: { inicio: string; fim: string },
  resumo: GlosaResumo
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const periodoStr = `${fmtDt(periodo.inicio)} a ${fmtDt(periodo.fim)}`;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Atendimentos Glosados", 14, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${periodoStr}`, 14, 22);

  const kpiY = 28;
  const kpis = [
    `Total: ${resumo.total_glosas}`,
    `Valor Glosado: ${formatBRL(resumo.valor_glosado_total)}`,
    `Recuperado: ${formatBRL(resumo.valor_recuperado_total)}`,
    `Em Recurso: ${formatBRL(resumo.valor_em_recurso)}`,
    `Taxa Recuperação: ${Math.round(resumo.taxa_recuperacao * 100)}%`,
    `Taxa Glosa: ${Math.round(resumo.taxa_glosa * 100)}%`,
  ];
  doc.setFontSize(8);
  kpis.forEach((k, i) => doc.text(k, 14 + i * 46, kpiY));

  autoTable(doc, {
    startY: kpiY + 6,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: {
      0: { cellWidth: 20 }, 1: { cellWidth: 20 }, 2: { cellWidth: 34 },
      3: { cellWidth: 30 }, 4: { cellWidth: 28 }, 5: { cellWidth: 22 },
      6: { cellWidth: 22 }, 7: { cellWidth: 20 }, 8: { cellWidth: 20 },
      9: { cellWidth: 20 },
    },
    head: [[
      "Data Glosa", "Dt. Atend.", "Paciente", "Profissional",
      "Procedimento", "Convênio", "Categoria", "Status",
      "Vl. Cobrado", "Vl. Glosado", "Vl. Recuperado",
    ]],
    body: linhas.map((l) => [
      fmtDt(l.data_glosa),
      fmtDt(l.data_atendimento),
      l.paciente.nome,
      l.profissional?.nome ?? "—",
      l.procedimento?.nome ?? "—",
      l.convenio?.nome ?? "Particular",
      CATEGORIA_GLOSA_LABEL[l.categoria],
      STATUS_GLOSA_LABEL[l.status],
      formatBRL(l.valor_cobrado),
      formatBRL(l.valor_glosado),
      l.valor_recuperado !== null ? formatBRL(l.valor_recuperado) : "—",
    ]),
    didDrawPage: (d) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.text(
        `Página ${d.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" }
      );
    },
  });

  doc.save(`glosas_${fmtDt(periodo.inicio).replace(/\//g, "-")}_${fmtDt(periodo.fim).replace(/\//g, "-")}.pdf`);
}
