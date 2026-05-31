"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OcupacaoProfissional } from "@/types/ocupacao-profissional"
interface GraficosOcupacaoProps {
  profissionais: OcupacaoProfissional[]
}

function corBarra(taxa: number): string {
  if (taxa >= 1) return "#ef4444"
  if (taxa >= 0.8) return "#f59e0b"
  if (taxa >= 0.5) return "#22c55e"
  return "#60a5fa"
}

interface TaxaPayload {
  taxa: number
  full: string
}

interface TooltipEntry {
  payload?: TaxaPayload
  dataKey?: string
  name?: string
  value?: number
}

function TaxaTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  if (!d) return null
  return (
    <div className="bg-background border rounded shadow px-3 py-2 text-xs">
      <div className="font-medium">{d.full}</div>
      <div>Taxa: {d.taxa}%</div>
    </div>
  )
}

interface HorasEntry {
  dataKey?: string
  name?: string
  value?: number
}

function HorasTooltip({ active, payload }: { active?: boolean; payload?: HorasEntry[] }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-background border rounded shadow px-3 py-2 text-xs space-y-1">
      {payload.map((p, i) => (
        <div key={i}>
          <span className="font-medium">{p.name === "agendadas" ? "Agendadas" : "Disponíveis"}: </span>
          {p.value}h
        </div>
      ))}
    </div>
  )
}

export function GraficosOcupacao({ profissionais }: GraficosOcupacaoProps) {
  const comGrade = profissionais.filter((p) => p.tem_grade)

  const dadosTaxa = [...comGrade]
    .sort((a, b) => b.taxa_ocupacao - a.taxa_ocupacao)
    .map((p) => ({
      nome: p.nome.split(" ")[0] + (p.nome.split(" ")[1] ? " " + p.nome.split(" ")[1][0] + "." : ""),
      taxa: Math.round(p.taxa_ocupacao * 100),
      full: p.nome,
      raw: p.taxa_ocupacao,
    }))

  const dadosHoras = [...profissionais]
    .sort((a, b) => b.minutos_agendados - a.minutos_agendados)
    .slice(0, 10)
    .map((p) => ({
      nome: p.nome.split(" ")[0],
      agendadas: Math.round((p.minutos_agendados / 60) * 10) / 10,
      disponiveis: Math.round((p.minutos_disponiveis / 60) * 10) / 10,
    }))

  if (profissionais.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhum dado para exibir. Ajuste os filtros e clique em Filtrar.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Taxa de ocupação por profissional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Taxa de Ocupação por Profissional</CardTitle>
        </CardHeader>
        <CardContent>
          {comGrade.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum profissional com grade configurada.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, dadosTaxa.length * 36)}>
              <BarChart data={dadosTaxa} layout="vertical" margin={{ left: 8, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, Math.max(100, ...dadosTaxa.map((d) => d.taxa))]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 12 }} />
                <RechartTooltip content={<TaxaTooltip />} />
                <ReferenceLine x={100} stroke="#ef4444" strokeDasharray="4 4" />
                <Bar dataKey="taxa" radius={[0, 4, 4, 0]}>
                  {dadosTaxa.map((entry, i) => (
                    <Cell key={i} fill={corBarra(entry.raw)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Horas agendadas vs disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Horas Agendadas vs Disponíveis (top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(200, dadosHoras.length * 36)}>
            <BarChart data={dadosHoras} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => `${v}h`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 12 }} />
              <RechartTooltip content={<HorasTooltip />} />
              <Bar dataKey="disponiveis" fill="#e2e8f0" name="disponiveis" radius={[0, 2, 2, 0]} />
              <Bar dataKey="agendadas" fill="#3b82f6" name="agendadas" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
