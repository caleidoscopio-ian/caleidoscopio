"use client";

// Tabela com subtotais por nível, no modelo do Feegow: cada grupo é uma linha
// clicável que abre os subgrupos e, no último nível, o detalhamento linha a
// linha.
//
// Duas escolhas de leitura:
//  - "—" significa SEM VALOR (procedimento sem preço cadastrado). Zero é "R$ 0,00".
//    Um grupo com linhas sem valor ganha um aviso no rótulo, para o número não
//    parecer menor do que deveria por engano.
//  - A linha de total fica no topo, fixa, para não precisar rolar até o fim.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatarDuracao, formatarMetrica, SEM_VALOR } from "@/lib/relatorios/formatacao";
import { BotoesExportacao } from "@/components/relatorios/botoes-exportacao";
import type { ContextoExportacao } from "@/lib/relatorios/exportacao";
import { rotuloRecorte } from "@/lib/relatorios/exportacao";
import type {
  ColunaDetalhe,
  Dimensao,
  GrupoRelatorio,
  Metrica,
  TotalRelatorio,
} from "@/types/relatorio";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  grupos: GrupoRelatorio[];
  total: TotalRelatorio;
  metricas: Metrica[];
  dimensoes: Dimensao[];
  agrupamento: string[];
  /** colunas do detalhamento, declaradas pelo relatório no catálogo */
  colunasDetalhe: ColunaDetalhe[];
  /** base para a exportação por grupo; null esconde os botões de recorte */
  contextoExportacao?: ContextoExportacao | null;
}

export function TabelaAgrupada({
  grupos,
  total,
  metricas,
  dimensoes,
  agrupamento,
  colunasDetalhe,
  contextoExportacao = null,
}: Props) {
  const visiveis = metricas.filter((m) => m.padrao !== false);
  const rotuloDim = (chave: string) =>
    dimensoes.find((d) => d.chave === chave)?.rotulo ?? chave;

  if (grupos.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center">
        <p className="text-sm font-medium">Nenhum registro no período</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste o período ou remova um filtro. Vale lembrar que este relatório conta apenas
          atendimentos com status <strong>Atendido</strong> — agendamentos que não passaram pelo
          check-in não aparecem.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-4 py-2.5 font-medium">
              {agrupamento.map(rotuloDim).join(" › ")}
            </th>
            {visiveis.map((m) => (
              <th key={m.chave} className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                {m.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Total geral primeiro: é o número que mais se olha */}
          <tr className="border-b bg-primary/5 font-semibold">
            <td className="px-4 py-2.5">
              Total geral
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {total.linhas} {total.linhas === 1 ? "atendimento" : "atendimentos"}
              </span>
            </td>
            {visiveis.map((m) => (
              <td key={m.chave} className="px-4 py-2.5 text-right whitespace-nowrap">
                <Celula valor={total.metricas[m.chave]} metrica={m} semValor={total.semValor[m.chave]} />
              </td>
            ))}
          </tr>

          {grupos.map((g, i) => (
            <LinhaGrupo
              key={`${g.dimensao}-${g.id ?? g.rotulo}-${i}`}
              grupo={g}
              metricas={visiveis}
              dimensoes={dimensoes}
              colunasDetalhe={colunasDetalhe}
              contextoExportacao={contextoExportacao}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinhaGrupo({
  grupo,
  metricas,
  dimensoes,
  colunasDetalhe,
  contextoExportacao,
}: {
  grupo: GrupoRelatorio;
  metricas: Metrica[];
  dimensoes: Dimensao[];
  colunasDetalhe: ColunaDetalhe[];
  contextoExportacao: ContextoExportacao | null;
}) {
  const [aberto, setAberto] = useState(grupo.nivel === 0);
  const temDetalhe = grupo.detalhe.length > 0 && colunasDetalhe.length > 0;
  const temFilhos = grupo.subgrupos.length > 0 || temDetalhe;

  return (
    <>
      <tr
        className={cn(
          "border-b transition-colors",
          temFilhos && "cursor-pointer hover:bg-muted/40",
          grupo.nivel === 0 && "font-medium",
          grupo.nivel === 1 && "text-[13px]",
          grupo.nivel === 2 && "text-[13px] text-muted-foreground"
        )}
        onClick={() => temFilhos && setAberto((a) => !a)}
      >
        <td className="px-4 py-2" style={{ paddingLeft: `${16 + grupo.nivel * 22}px` }}>
          <span className="flex items-center gap-1.5">
            {temFilhos ? (
              aberto ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="w-3.5" />
            )}
            <span className={cn(grupo.id === null && "italic text-muted-foreground")}>
              {grupo.rotulo}
            </span>
            <Badge variant="secondary" className="ml-1 font-normal">
              {grupo.linhas}
            </Badge>
            {contextoExportacao && (
              <BotoesExportacao
                compacto
                contexto={{
                  ...contextoExportacao,
                  // O recorte é o grupo: sua própria subárvore e seu subtotal
                  grupos: [grupo],
                  total: {
                    linhas: grupo.linhas,
                    metricas: grupo.metricas,
                    semValor: grupo.semValor,
                  },
                  sufixo: rotuloRecorte(grupo),
                }}
              />
            )}
          </span>
        </td>
        {metricas.map((m) => (
          <td key={m.chave} className="px-4 py-2 text-right whitespace-nowrap">
            <Celula valor={grupo.metricas[m.chave]} metrica={m} semValor={grupo.semValor[m.chave]} />
          </td>
        ))}
      </tr>

      {aberto &&
        grupo.subgrupos.map((s, i) => (
          <LinhaGrupo
            key={`${s.dimensao}-${s.id ?? s.rotulo}-${i}`}
            grupo={s}
            metricas={metricas}
            dimensoes={dimensoes}
            colunasDetalhe={colunasDetalhe}
            contextoExportacao={contextoExportacao}
          />
        ))}

      {aberto && grupo.subgrupos.length === 0 && temDetalhe && (
        <tr>
          <td colSpan={metricas.length + 1} className="bg-muted/20 p-0">
            <Detalhamento grupo={grupo} colunas={colunasDetalhe} />
          </td>
        </tr>
      )}
    </>
  );
}

function Detalhamento({
  grupo,
  colunas,
}: {
  grupo: GrupoRelatorio;
  colunas: ColunaDetalhe[];
}) {
  const alinhaDireita = (c: ColunaDetalhe) =>
    c.tipo === "moeda" || c.tipo === "numero" || c.tipo === "duracao";

  return (
    <div className="px-4 py-3">
      <div className="overflow-x-auto rounded border bg-background">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              {colunas.map((c) => (
                <th
                  key={c.chave}
                  className={cn(
                    "px-3 py-1.5 font-medium whitespace-nowrap",
                    alinhaDireita(c) && "text-right"
                  )}
                >
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupo.detalhe.map((l) => {
              const d = l.detalhe ?? {};
              return (
                <tr key={l.id} className="border-b last:border-0">
                  {colunas.map((c) => (
                    <CelulaDetalhe key={c.chave} coluna={c} valores={d} />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {grupo.detalheTruncado && (
        <p className="mt-2 text-xs text-muted-foreground">
          Mostrando os primeiros registros deste grupo. Use um filtro mais estreito para ver o
          restante.
        </p>
      )}
    </div>
  );
}

function CelulaDetalhe({
  coluna,
  valores,
}: {
  coluna: ColunaDetalhe;
  valores: Record<string, string | number | null>;
}) {
  const bruto = valores[coluna.chave] ?? null;
  const numerico = typeof bruto === "number" ? bruto : null;
  const alinhaDireita =
    coluna.tipo === "moeda" || coluna.tipo === "numero" || coluna.tipo === "duracao";

  let texto: string;
  if (coluna.tipo === "data") {
    const data = typeof bruto === "string" ? new Date(bruto) : null;
    texto = data && !isNaN(data.getTime()) ? format(data, "dd/MM/yy HH:mm", { locale: ptBR }) : SEM_VALOR;
  } else if (coluna.tipo === "moeda") {
    texto = formatarMetrica(numerico, "moeda");
  } else if (coluna.tipo === "duracao") {
    texto = formatarDuracao(numerico);
  } else if (coluna.tipo === "numero") {
    texto = formatarMetrica(numerico, "numero");
  } else {
    texto = bruto === null || bruto === "" ? SEM_VALOR : String(bruto);
  }

  const vazio = bruto === null || bruto === "";
  // `avisoQuandoZero` aponta para um campo irmão: valendo 0, a célula explica
  // por que aquele número não é confiável como histórico (ex.: valor
  // recalculado em vez de carimbado).
  const mostrarAviso =
    !!coluna.avisoQuandoZero && !vazio && valores[coluna.avisoQuandoZero] === 0;

  // Líquido negativo é erro de cadastro de repasse: destacar em vez de esconder
  const negativo = numerico !== null && numerico < 0;

  return (
    <td
      className={cn("px-3 py-1.5", alinhaDireita && "text-right whitespace-nowrap")}
    >
      <span
        className={cn(
          vazio && "text-muted-foreground",
          negativo && "font-medium text-destructive"
        )}
      >
        {texto}
      </span>
      {mostrarAviso && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="ml-1 inline h-3 w-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{coluna.avisoTexto ?? "Valor derivado, não congelado."}</TooltipContent>
        </Tooltip>
      )}
    </td>
  );
}

function Celula({
  valor,
  metrica,
  semValor,
}: {
  valor: number | null;
  metrica: Metrica;
  semValor?: number;
}) {
  const texto = formatarMetrica(valor, metrica.tipo);

  if (!semValor) {
    return <span className={cn(valor === null && "text-muted-foreground")}>{texto}</span>;
  }

  // Há linhas sem valor dentro deste grupo: o número está certo, mas é parcial
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2">
          {texto}
          <Info className="h-3 w-3 text-amber-600" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {semValor} {semValor === 1 ? "atendimento" : "atendimentos"} sem valor cadastrado
        {valor === null
          ? " — nenhum valor disponível neste grupo."
          : " não entraram neste número."}
      </TooltipContent>
    </Tooltip>
  );
}
