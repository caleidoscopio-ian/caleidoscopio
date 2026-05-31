"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CalendarCheck, Clock, Users, TrendingUp, AlertTriangle } from "lucide-react"
import { formatarTaxa } from "@/lib/ocupacao"
import type { OcupacaoResumo, OcupacaoProfissional } from "@/types/ocupacao-profissional"

interface KpiCardsProps {
  resumo: OcupacaoResumo
  profissionais: OcupacaoProfissional[]
}

export function KpiCards({ resumo, profissionais }: KpiCardsProps) {
  const maisOcupado = profissionais
    .filter((p) => p.tem_grade)
    .sort((a, b) => b.taxa_ocupacao - a.taxa_ocupacao)[0] ?? null

  const taxaColor =
    resumo.taxa_media >= 1 ? "text-red-600" :
    resumo.taxa_media >= 0.8 ? "text-amber-600" :
    resumo.taxa_media >= 0.5 ? "text-green-600" :
    "text-blue-600"

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Taxa média */}
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Taxa Média
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${taxaColor}`}>
            {formatarTaxa(resumo.taxa_media)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {resumo.profissionais_sem_grade > 0 && (
              <span className="text-amber-600">{resumo.profissionais_sem_grade} sem grade</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Atendimentos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <CalendarCheck className="h-3.5 w-3.5" />
            Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resumo.total_agendamentos}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            ativos no período
          </p>
        </CardContent>
      </Card>

      {/* Horas agendadas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Horas Ocupadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resumo.horas_agendadas}h</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {resumo.horas_disponiveis > 0
              ? `de ${resumo.horas_disponiveis}h disponíveis`
              : "sem grade configurada"}
          </p>
        </CardContent>
      </Card>

      {/* Atendendo agora */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            Atendendo Agora
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-600">{resumo.atendendo_agora}</div>
            {resumo.atendendo_agora > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">profissional(is)</p>
        </CardContent>
      </Card>

      {/* Mais ocupado */}
      <Card className="col-span-1 md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            Maior Ocupação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {maisOcupado ? (
            <>
              <div className="text-sm font-semibold truncate">{maisOcupado.nome.split(' ')[0]}</div>
              <div className={`text-xl font-bold ${maisOcupado.taxa_ocupacao >= 1 ? 'text-red-600' : maisOcupado.taxa_ocupacao >= 0.8 ? 'text-amber-600' : 'text-green-600'}`}>
                {formatarTaxa(maisOcupado.taxa_ocupacao)}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">—</div>
          )}
        </CardContent>
      </Card>

      {/* Absenteísmo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Absenteísmo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {profissionais.reduce((s, p) => s + p.faltas, 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            faltas · {profissionais.reduce((s, p) => s + p.cancelamentos, 0)} cancelamentos
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
