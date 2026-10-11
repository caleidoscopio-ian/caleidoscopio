"use client";

// Exportação dos relatórios da central (Módulo 25, Fase 4).
//
// Exporta a partir do resultado JÁ carregado na tela, sem refazer a consulta.
// O motivo não é economia de requisição: é garantia de que o arquivo e a tela
// mostram o mesmo número. Refazer a agregação no momento do download abriria
// espaço para o dado ter mudado no meio.
//
// Três saídas:
//   resumo CSV    — uma linha por grupo, em todos os níveis, como na tela
//   detalhe CSV   — linha a linha; para o repasse, é a lista de pagamento
//   PDF           — resumo paginado, para anexar ou imprimir
//
// Nada aqui é gated por permissão de EXPORT: o dado já está na tela de quem
// clica, então bloquear o download seria teatro. A permissão que importa é a
// de ver o relatório, verificada na rota da API.

import { achatar } from "@/lib/relatorios/agregacao";
import { formatarChaveMes, valorParaExportacao } from "@/lib/relatorios/formatacao";
import type { ColunaDetalhe, Dimensao, GrupoRelatorio, Metrica, TotalRelatorio } from "@/types/relatorio";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ContextoExportacao {
  titulo: string;
  periodo: { inicio: string; fim: string };
  agrupamento: string[];
  dimensoes: Dimensao[];
  metricas: Metrica[];
  colunasDetalhe: ColunaDetalhe[];
  grupos: GrupoRelatorio[];
  total: TotalRelatorio;
  /** acrescentado ao nome do arquivo — usado na exportação de um grupo só */
  sufixo?: string;
  /** nome da clínica, para o cabeçalho e o nome do arquivo */
  clinica?: string | null;
  /** filtros ativos, já com rótulo legível — sem isso o PDF impresso não diz
   *  de que recorte ele veio */
  filtros?: { rotulo: string; valor: string }[];
}

const LOGO = "/caleido_logox.png";
/** largura em px da logo reduzida: ~30mm a 300dpi */
const LOGO_PX = 400;

const dia = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : format(d, "dd/MM/yyyy", { locale: ptBR });
};

const dataHora = (valor: unknown): string => {
  if (typeof valor !== "string") return "";
  const d = new Date(valor);
  return isNaN(d.getTime()) ? "" : format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
};

const slug = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // NFD + remoção dos acentos
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

function nomeArquivo(ctx: ContextoExportacao, tipo: string, ext: string): string {
  // A clínica entra no nome do arquivo, não numa linha de metadado dentro do
  // CSV: linha extra acima do cabeçalho quebra a importação em planilha.
  const partes = [
    ctx.clinica ? slug(ctx.clinica) : "",
    slug(ctx.titulo),
    tipo,
    dia(ctx.periodo.inicio).replace(/\//g, "-"),
    dia(ctx.periodo.fim).replace(/\//g, "-"),
  ];
  // o recorte vem logo depois do relatório: agrupa "o quê" antes de "como/quando"
  if (ctx.sufixo) partes.splice(2, 0, slug(ctx.sufixo));
  return `${partes.filter(Boolean).join("_")}.${ext}`;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

/** Escapa a célula para CSV com separador `;` */
function celula(v: string | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function baixar(conteudo: string, nome: string, mime: string): void {
  // BOM para o Excel reconhecer UTF-8 e não quebrar os acentos
  const blob = new Blob(["﻿" + conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

const montarCsv = (linhas: string[][]): string =>
  linhas.map((l) => l.map(celula).join(";")).join("\r\n");

/**
 * Resumo agrupado: uma linha por grupo, em todos os níveis.
 *
 * As colunas de nível vêm preenchidas em cascata (o nome do pai repetido nas
 * linhas dos filhos) porque é assim que a planilha consegue filtrar e dar
 * subtotal. Na tela a hierarquia é visual; no CSV precisa ser dado.
 */
export function exportarResumoCSV(ctx: ContextoExportacao): void {
  const rotuloDim = (c: string) => ctx.dimensoes.find((d) => d.chave === c)?.rotulo ?? c;
  const visiveis = ctx.metricas.filter((m) => m.padrao !== false);

  const cabecalho = [
    "Nível",
    ...ctx.agrupamento.map(rotuloDim),
    ...visiveis.map((m) => m.rotulo),
    "Atendimentos sem valor",
  ];

  const linhas: string[][] = [
    [
      "Total",
      ...ctx.agrupamento.map(() => ""),
      ...visiveis.map((m) => valorParaExportacao(ctx.total.metricas[m.chave] ?? null, m.tipo)),
      String(Object.values(ctx.total.semValor).reduce((a, b) => Math.max(a, b), 0) || ""),
    ],
  ];

  // caminho corrente por nível, para repetir o pai nas linhas dos filhos
  const caminho: string[] = [];
  const andar = (grupos: GrupoRelatorio[]) => {
    for (const g of grupos) {
      caminho[g.nivel] = g.rotulo;
      caminho.length = g.nivel + 1;
      linhas.push([
        String(g.nivel + 1),
        ...ctx.agrupamento.map((_, i) => caminho[i] ?? ""),
        ...visiveis.map((m) => valorParaExportacao(g.metricas[m.chave] ?? null, m.tipo)),
        String(Object.values(g.semValor).reduce((a, b) => Math.max(a, b), 0) || ""),
      ]);
      andar(g.subgrupos);
    }
  };
  andar(ctx.grupos);

  baixar(
    montarCsv([cabecalho, ...linhas]),
    nomeArquivo(ctx, "resumo", "csv"),
    "text/csv;charset=utf-8;"
  );
}

/** Detalhamento linha a linha, com as colunas declaradas no catálogo */
export function exportarDetalheCSV(ctx: ContextoExportacao): void {
  const rotuloDim = (c: string) => ctx.dimensoes.find((d) => d.chave === c)?.rotulo ?? c;

  const cabecalho = [
    ...ctx.agrupamento.map(rotuloDim),
    ...ctx.colunasDetalhe.map((c) => c.rotulo),
  ];

  const linhas: string[][] = [];
  const caminho: string[] = [];
  const andar = (grupos: GrupoRelatorio[]) => {
    for (const g of grupos) {
      caminho[g.nivel] = g.rotulo;
      caminho.length = g.nivel + 1;
      for (const l of g.detalhe) {
        const d = l.detalhe ?? {};
        linhas.push([
          ...ctx.agrupamento.map((_, i) => caminho[i] ?? ""),
          ...ctx.colunasDetalhe.map((c) => {
            const v = d[c.chave] ?? null;
            if (c.tipo === "data") return dataHora(v);
            if (c.tipo === "moeda" || c.tipo === "numero")
              return valorParaExportacao(typeof v === "number" ? v : null, "moeda");
            if (c.tipo === "duracao")
              return valorParaExportacao(typeof v === "number" ? v : null, "contagem");
            return v === null ? "" : String(v);
          }),
        ]);
      }
      andar(g.subgrupos);
    }
  };
  andar(ctx.grupos);

  baixar(
    montarCsv([cabecalho, ...linhas]),
    nomeArquivo(ctx, "detalhado", "csv"),
    "text/csv;charset=utf-8;"
  );
}

/** Há detalhe para exportar? (a rota pode ter vindo com detalhe=0) */
export function temDetalhe(grupos: GrupoRelatorio[]): boolean {
  return achatar(grupos).some((g) => g.detalhe.length > 0);
}

// ── PDF ─────────────────────────────────────────────────────────────────────

/**
 * Carrega a logo e devolve como data URI, já reduzida.
 *
 * Feito no momento da exportação, não embutido no bundle: o PNG tem 110 KB e
 * viraria ~147 KB de base64 carregados por todo mundo que abre a central, para
 * servir só a quem clica em exportar.
 *
 * Reduzir importa: a imagem original tem 3329 px de largura e entra no PDF a
 * ~30 mm. Sem reduzir, o arquivo ficaria desnecessariamente pesado.
 *
 * Devolve null em qualquer falha — PDF sem logo é melhor que exportação quebrada.
 */
async function carregarLogo(): Promise<{ dataUrl: string; proporcao: number } | null> {
  try {
    const img = new Image();
    img.src = LOGO;
    await new Promise<void>((ok, erro) => {
      img.onload = () => ok();
      img.onerror = () => erro(new Error("logo não carregou"));
    });

    const proporcao = img.naturalHeight / img.naturalWidth;
    const canvas = document.createElement("canvas");
    canvas.width = LOGO_PX;
    canvas.height = Math.round(LOGO_PX * proporcao);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // fundo branco: o PNG tem transparência e o PDF não compõe alpha
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/png"), proporcao };
  } catch {
    return null;
  }
}

export async function exportarPDF(ctx: ContextoExportacao): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const visiveis = ctx.metricas.filter((m) => m.padrao !== false);
  const rotuloDim = (c: string) => ctx.dimensoes.find((d) => d.chave === c)?.rotulo ?? c;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const MARGEM = 14;

  const logo = await carregarLogo();

  // ── Cabeçalho ───────────────────────────────────────────────────────────
  // A logo fica à esquerda e o texto começa depois dela; sem logo, o texto
  // ocupa a margem. Assim o layout não abre um buraco quando a imagem falha.
  const LOGO_MM = 26;
  let x = MARGEM;
  let alturaLogo = 0;
  if (logo) {
    try {
      const altura = LOGO_MM * logo.proporcao;
      doc.addImage(logo.dataUrl, "PNG", MARGEM, 10, LOGO_MM, altura);
      x = MARGEM + LOGO_MM + 6;
      alturaLogo = 10 + altura;
    } catch {
      // `addImage` decodifica o PNG e lança se não conseguir. Sem este catch,
      // uma logo corrompida derrubaria a exportação inteira — o relatório vale
      // muito mais que o enfeite.
      x = MARGEM;
      alturaLogo = 0;
    }
  }

  // Clínica em destaque: um relatório impresso circula fora da tela, e sem
  // isso não dá para saber de qual unidade de negócio ele veio.
  let y = 14;
  if (ctx.clinica) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100);
    doc.text(ctx.clinica.toUpperCase(), x, y);
    doc.setTextColor(0);
    y += 6;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(ctx.titulo, x, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(
    `Período: ${dia(ctx.periodo.inicio)} a ${dia(ctx.periodo.fim)}   ·   ` +
      `Agrupado por: ${ctx.agrupamento.map(rotuloDim).join(" > ") || "—"}`,
    x,
    y
  );
  y += 5;

  // Filtros ativos: sem eles o PDF não diz de que recorte veio
  const filtrosAtivos = (ctx.filtros ?? []).filter((f) => f.valor);
  if (filtrosAtivos.length > 0) {
    doc.setFontSize(8);
    doc.text(
      `Filtros: ${filtrosAtivos.map((f) => `${f.rotulo}: ${f.valor}`).join("   ·   ")}`,
      x,
      y
    );
    y += 5;
  }
  if (ctx.sufixo) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`Recorte: ${ctx.sufixo}`, x, y);
    doc.setFont("helvetica", "normal");
    y += 5;
  }
  doc.setTextColor(0);

  // linha divisória abaixo do bloco de cabeçalho (nunca acima da logo)
  const yLinha = Math.max(y + 1, alturaLogo + 3);
  doc.setDrawColor(210);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, yLinha, larguraPagina - MARGEM, yLinha);

  // ── Totais ──────────────────────────────────────────────────────────────
  const yTotais = yLinha + 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const totais = [
    `Registros: ${ctx.total.linhas}`,
    ...visiveis.map((m) => `${m.rotulo}: ${textoPdf(ctx.total.metricas[m.chave] ?? null, m)}`),
  ];
  const larguraTotal = (larguraPagina - MARGEM * 2) / Math.max(totais.length, 1);
  totais.forEach((txt, i) => doc.text(txt, MARGEM + i * larguraTotal, yTotais));

  // Linhas: um registro por grupo, indentado por nível
  const corpo: string[][] = [];
  const andar = (grupos: GrupoRelatorio[]) => {
    for (const g of grupos) {
      corpo.push([
        `${"    ".repeat(g.nivel)}${g.rotulo}`,
        String(g.linhas),
        ...visiveis.map((m) => textoPdf(g.metricas[m.chave] ?? null, m)),
      ]);
      andar(g.subgrupos);
    }
  };
  andar(ctx.grupos);

  autoTable(doc, {
    startY: yTotais + 5,
    styles: { fontSize: 7.5, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 20, halign: "right" } },
    head: [[ctx.agrupamento.map(rotuloDim).join(" > ") || "Grupo", "Qtd.", ...visiveis.map((m) => m.rotulo)]],
    body: corpo,
    didParseCell: (d) => {
      // métricas à direita; "—" em cinza para não parecer zero
      if (d.section === "body" && d.column.index >= 2) d.cell.styles.halign = "right";
      if (d.section === "body" && d.cell.text.join("") === "—") d.cell.styles.textColor = 150;
    },
    didDrawPage: (hook) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Página ${hook.pageNumber} de ${doc.getNumberOfPages()}`,
        doc.internal.pageSize.getWidth() - MARGEM,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" }
      );
      doc.text(
        [ctx.clinica, `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`]
          .filter(Boolean)
          .join("  ·  "),
        MARGEM,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  doc.save(nomeArquivo(ctx, "resumo", "pdf"));
}

/** Mesma formatação da tela, mas sem depender do Intl do navegador no PDF */
function textoPdf(valor: number | null, m: Metrica): string {
  if (valor === null || !Number.isFinite(valor)) return "—";
  if (m.tipo === "moeda") return `R$ ${valor.toFixed(2).replace(".", ",")}`;
  if (m.tipo === "percentual") return `${valor.toFixed(1).replace(".", ",")}%`;
  if (m.tipo === "contagem") return String(Math.round(valor));
  if (m.tipo === "duracao") {
    const total = Math.round(valor);
    const h = Math.floor(total / 60);
    const min = total % 60;
    return h === 0 ? `${min}min` : min === 0 ? `${h}h` : `${h}h ${min}min`;
  }
  return valor.toFixed(1).replace(".", ",");
}

/** Rótulo do mês para o cabeçalho de recorte, quando o grupo é um mês */
export const rotuloRecorte = (g: GrupoRelatorio): string =>
  g.dimensao === "mes" && g.id ? formatarChaveMes(g.id) : g.rotulo;
