"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

function TaxaBarra({ taxa }: { taxa: number }) {
  const pct = Math.min(Math.round(taxa * 100), 100)
  const cor = taxa >= 1 ? "bg-red-500" : taxa >= 0.8 ? "bg-amber-500" : taxa >= 0.5 ? "bg-green-500" : "bg-blue-400"
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium w-10 text-right tabular-nums ${taxa >= 1 ? "text-red-600" : taxa >= 0.8 ? "text-amber-600" : taxa >= 0.5 ? "text-green-600" : "text-muted-foreground"}`}>
        {formatarTaxa(taxa)}
        {taxa > 1 && " ⚠"}
      </span>
    </div>
  )
}

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
      <div className="rounded-md border">
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
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum profissional encontrado para os filtros selecionados.
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
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Atendendo agora</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>

                <TableCell>
                  <div className="font-medium text-sm">{prof.nome}</div>
                  <div className="text-xs text-muted-foreground">{prof.especialidade}</div>
                  {!prof.tem_grade && (
                    <Badge variant="outline" className="mt-1 text-xs text-amber-600 border-amber-300">
                      grade não configurada
                    </Badge>
                  )}
                </TableCell>

                <TableCell>
                  {prof.tem_grade ? (
                    <TaxaBarra taxa={prof.taxa_ocupacao} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right tabular-nums text-sm">{prof.total_agendamentos}</TableCell>

                <TableCell className="text-right tabular-nums text-sm">
                  {formatarMinutos(prof.minutos_agendados)}
                </TableCell>

                <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                  {prof.tem_grade ? formatarMinutos(prof.minutos_disponiveis) : "—"}
                </TableCell>

                <TableCell className="text-right">
                  {prof.faltas > 0 && (
                    <span className="text-xs font-medium text-orange-600">{prof.faltas}</span>
                  )}
                  {prof.cancelamentos > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">({prof.cancelamentos} canc.)</span>
                  )}
                  {prof.faltas === 0 && prof.cancelamentos === 0 && (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onConfigurarGrade(prof.id, prof.nome)}
                          aria-label={`Configurar grade de ${prof.nome}`}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Configurar grade</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/agenda?profissionalId=${prof.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Ver agenda de ${prof.nome}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Ver na agenda</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href="/salas/mapa-ocupacao">
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ver mapa de salas">
                            <LayoutGrid className="h-3.5 w-3.5" />
                          </Button>
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
