"use client"

// Fileira de indicadores de /taxa-ocupacao, no `StatCard` do kit v2.
//
// `tom="white"` e `size="sm"` nos seis: o gradiente pastel do v2 é a linha de
// destaque do dashboard, uma por produto. Seis gradientes lado a lado viram
// ruído, e esta é uma plataforma para TEA — `frontend.md` pede o contrário.
//
// A cor vive onde é limiar: no número (taxa acima de 100%, absenteísmo) e no
// ícone. A classe do filho vence a do `StatCard`, então não é preciso prop nova.

import { Activity, CalendarCheck, Clock, Users, TrendingUp, AlertTriangle } from "lucide-react"
import { formatarTaxa } from "@/lib/ocupacao"
import type { OcupacaoResumo, OcupacaoProfissional } from "@/types/ocupacao-profissional"
import { StatCard } from "@/components/kit"

interface KpiCardsProps {
  resumo: OcupacaoResumo
  profissionais: OcupacaoProfissional[]
}

/** Faixa da taxa → tinta. Acima de 100% é vermelho porque é agendamento fora
 *  da grade, não desempenho: a leitura certa é "confira a grade". */
function tintaDaTaxa(taxa: number): string {
  if (taxa >= 1) return "text-danger-ink"
  if (taxa >= 0.8) return "text-warning-ink"
  if (taxa >= 0.5) return "text-success-ink"
  return "text-brand"
}

export function KpiCards({ resumo, profissionais }: KpiCardsProps) {
  const maisOcupado =
    profissionais.filter((p) => p.tem_grade).sort((a, b) => b.taxa_ocupacao - a.taxa_ocupacao)[0] ??
    null

  const faltas = profissionais.reduce((s, p) => s + p.faltas, 0)
  const cancelamentos = profissionais.reduce((s, p) => s + p.cancelamentos, 0)

  return (
    <div className="anim-escalonada grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <StatCard
        tom="blue"
        size="sm"
        icone={<TrendingUp className="text-brand" />}
        rotulo="Taxa Média"
        valor={
          <span className={tintaDaTaxa(resumo.taxa_media)}>
            {formatarTaxa(resumo.taxa_media)}
          </span>
        }
        hint={
          resumo.profissionais_sem_grade > 0 ? (
            <span className="text-warning-ink">
              {resumo.profissionais_sem_grade} sem grade no período
            </span>
          ) : undefined
        }
      />

      <StatCard
        tom="lavender"
        size="sm"
        icone={<CalendarCheck />}
        rotulo="Agendamentos"
        valor={resumo.total_agendamentos}
        hint="ativos no período"
      />

      <StatCard
        tom="mint"
        size="sm"
        icone={<Clock />}
        rotulo="Horas Ocupadas"
        valor={`${resumo.horas_agendadas}h`}
        hint={
          resumo.horas_disponiveis > 0
            ? `de ${resumo.horas_disponiveis}h disponíveis`
            : "sem grade configurada"
        }
      />

      <StatCard
        tom="peach"
        size="sm"
        icone={<Activity />}
        rotulo="Atendendo Agora"
        valor={
          <span className="inline-flex items-center gap-2">
            <span className="text-success-ink">{resumo.atendendo_agora}</span>
            {resumo.atendendo_agora > 0 && (
              <span className="relative flex size-2.5" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
            )}
          </span>
        }
        hint="profissional(is)"
      />

      <StatCard
        tom="blue"
        size="sm"
        icone={<Users />}
        rotulo="Maior Ocupação"
        valor={
          maisOcupado ? (
            <span className={tintaDaTaxa(maisOcupado.taxa_ocupacao)}>
              {formatarTaxa(maisOcupado.taxa_ocupacao)}
            </span>
          ) : (
            <span className="text-ink-3">—</span>
          )
        }
        hint={maisOcupado ? maisOcupado.nome.split(" ")[0] : undefined}
      />

      <StatCard
        tom="lavender"
        size="sm"
        icone={<AlertTriangle />}
        rotulo="Absenteísmo"
        valor={<span className="text-warning-ink">{faltas}</span>}
        hint={`faltas · ${cancelamentos} cancelamentos`}
      />
    </div>
  )
}
