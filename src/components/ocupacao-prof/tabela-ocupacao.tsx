"use client"

import { useState } from "react"
import { StatusPill, PersonAvatar, EstadoVazio } from "@/components/kit"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Settings2, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, LayoutGrid } from "lucide-react"
import { formatarMinutos, formatarTaxa } from "@/lib/ocupacao"
import type { OcupacaoProfissional } from "@/types/ocupacao-profissional"
import Link from "next/link"

interface TabelaOcupacaoProps {
  profissionais: OcupacaoProfissional[]
  onConfigurarGrade: (profissionalId: string, nome: string) => void
}

type OrdenarPor = "nome" | "taxa" | "agendamentos" | "faltas"
type Direcao = "asc" | "desc"

/** Trilho + numero, como no v2: `h-2` em `surface-sunken`, barra na cor da
 *  faixa e numero com largura fixa para a coluna nao dancar.
 *
 *  O texto usa o token `-ink`, nao a cor cheia da barra: o v2 pinta o numero
 *  com a mesma cor do preenchimento, e ai "52%" em verde reprova no contraste
 *  (ver a regra "Texto de status usa -ink" em frontend.md). */
function TaxaBarra({ taxa }: { taxa: number }) {
  const pct = Math.min(Math.round(taxa * 100), 100)
  const barra =
    taxa >= 1 ? "bg-danger" : taxa >= 0.8 ? "bg-warning" : taxa >= 0.5 ? "bg-success" : "bg-brand"
  const texto =
    taxa >= 1
      ? "text-danger-ink"
      : taxa >= 0.8
        ? "text-warning-ink"
        : taxa >= 0.5
          ? "text-success-ink"
          : "text-ink-2"
  return (
    <div className="flex min-w-[9rem] items-center gap-2.5">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barra}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`tabular flex w-12 items-center justify-end gap-1 text-[0.78rem] font-semibold ${texto}`}
      >
        {formatarTaxa(taxa)}
        {taxa > 1 && <span title="Acima da grade cadastrada">⚠</span>}
      </span>
    </div>
  )
}

/** Acao de linha: circulo de 32px sem moldura, que so acende no hover. */
const ACAO =
  "grid size-8 place-items-center rounded-full text-ink-3 transition " +
  "hover:bg-surface hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

export function TabelaOcupacao({ profissionais, onConfigurarGrade }: TabelaOcupacaoProps) {
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>("taxa")
  const [direcao, setDirecao] = useState<Direcao>("desc")

  const toggleOrdem = (col: OrdenarPor) => {
    if (ordenarPor === col) setDirecao((d) => (d === "asc" ? "desc" : "asc"))
    else { setOrdenarPor(col); setDirecao("desc") }
  }

  const sorted = [...profissionais].sort((a, b) => {
    let va: number | string = 0, vb: number | string = 0
    if (ordenarPor === "nome") { va = a.nome; vb = b.nome }
    else if (ordenarPor === "taxa") { va = a.taxa_ocupacao; vb = b.taxa_ocupacao }
    else if (ordenarPor === "agendamentos") { va = a.total_agendamentos; vb = b.total_agendamentos }
    else if (ordenarPor === "faltas") { va = a.faltas; vb = b.faltas }
    if (typeof va === "string") return direcao === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
    return direcao === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })

  const SortIcon = ({ col }: { col: OrdenarPor }) => {
    if (ordenarPor !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return direcao === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
  }

  return (
    <TooltipProvider>
      <div className="scrollbar-none overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>
                <button className="flex items-center text-xs font-medium" onClick={() => toggleOrdem("nome")}>
                  Profissional <SortIcon col="nome" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center text-xs font-medium" onClick={() => toggleOrdem("taxa")}>
                  Taxa de Ocupação <SortIcon col="taxa" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button className="flex items-center text-xs font-medium ml-auto" onClick={() => toggleOrdem("agendamentos")}>
                  Atendimentos <SortIcon col="agendamentos" />
                </button>
              </TableHead>
              <TableHead className="text-right text-xs">Horas Agend.</TableHead>
              <TableHead className="text-right text-xs">Disponíveis</TableHead>
              <TableHead className="text-right">
                <button className="flex items-center text-xs font-medium ml-auto" onClick={() => toggleOrdem("faltas")}>
                  Faltas <SortIcon col="faltas" />
                </button>
              </TableHead>
              <TableHead className="text-right text-xs">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow className="bg-transparent">
                <TableCell colSpan={8}>
                  <EstadoVazio titulo="Nenhum profissional encontrado para os filtros selecionados." />
                </TableCell>
              </TableRow>
            )}
            {sorted.map((prof) => (
              <TableRow key={prof.id} className="group">
                {/* Indicador atendendo agora */}
                <TableCell className="w-8 pr-0">
                  {prof.atendendo_agora && (
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="relative flex h-2.5 w-2.5 mx-auto">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Atendendo agora</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <PersonAvatar nome={prof.nome} tamanho={36} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{prof.nome}</p>
                      <p className="truncate text-[0.75rem] text-ink-3">{prof.especialidade}</p>
                      {!prof.tem_grade && (
                        <StatusPill tom="warning" className="mt-1">
                          grade não configurada
                        </StatusPill>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {prof.tem_grade ? (
                    <TaxaBarra taxa={prof.taxa_ocupacao} />
                  ) : (
                    <span className="text-ink-4">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <span className="tabular font-medium text-ink">{prof.total_agendamentos}</span>
                </TableCell>

                <TableCell className="hidden text-right md:table-cell">
                  <span className="tabular">{formatarMinutos(prof.minutos_agendados)}</span>
                </TableCell>

                <TableCell className="hidden text-right md:table-cell">
                  <span className="tabular text-ink-3">
                    {prof.tem_grade ? formatarMinutos(prof.minutos_disponiveis) : "—"}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <span className="tabular whitespace-nowrap">
                    {prof.faltas > 0 && (
                      <span className="font-semibold text-[color:var(--kpi-peach-ink)]">
                        {prof.faltas}
                      </span>
                    )}
                    {prof.cancelamentos > 0 && (
                      <span className="ml-1 text-[0.75rem] text-ink-3">
                        ({prof.cancelamentos} canc.)
                      </span>
                    )}
                    {prof.faltas === 0 && prof.cancelamentos === 0 && (
                      <span className="text-ink-4">—</span>
                    )}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={ACAO}
                          onClick={() => onConfigurarGrade(prof.id, prof.nome)}
                          aria-label={`Configurar grade de ${prof.nome}`}
                        >
                          <Settings2 className="size-4" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Configurar grade</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/agenda?profissionalId=${prof.id}`}
                          className={ACAO}
                          aria-label={`Ver agenda de ${prof.nome}`}
                        >
                          <ExternalLink className="size-4" aria-hidden />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Ver na agenda</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href="/salas/mapa-ocupacao"
                          className={ACAO}
                          aria-label="Ver mapa de salas"
                        >
                          <LayoutGrid className="size-4" aria-hidden />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Ver mapa de salas</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
