import { Calendar, CheckCircle2, Users, TrendingUp, Clock } from "lucide-react";
import { StatCard } from "@/components/kit";

interface ResumoCardsProps {
  resumo: {
    totalSessoes: number;
    sessoesFinalizadas: number;
    pacientesUnicos: number;
    taxaConclusao: number;
    horasTotais: number;
  };
}

export function ResumoCards({ resumo }: ResumoCardsProps) {
  return (
    <div className="anim-escalonada grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard
        tom="blue"
        size="sm"
        icone={<Calendar />}
        rotulo="Total de Sessões"
        valor={resumo.totalSessoes}
        hint="No período selecionado"
      />

      <StatCard
        tom="lavender"
        size="sm"
        icone={<CheckCircle2 />}
        rotulo="Sessões Concluídas"
        valor={<span className="text-success-ink">{resumo.sessoesFinalizadas}</span>}
        hint={<>{resumo.totalSessoes > 0 ? Math.round((resumo.sessoesFinalizadas / resumo.totalSessoes) * 100) : 0} % do total</>}
      />

      <StatCard
        tom="mint"
        size="sm"
        icone={<Users className="text-brand" />}
        rotulo="Pacientes Atendidos"
        valor={<span className="text-brand">{resumo.pacientesUnicos}</span>}
        hint="Pacientes únicos"
      />

      <StatCard
        tom="peach"
        size="sm"
        icone={<TrendingUp />}
        rotulo="Taxa de Conclusão"
        valor={<>{resumo.taxaConclusao}%</>}
        hint={resumo.taxaConclusao >= 80 ? "Excelente" : resumo.taxaConclusao >= 60 ? "Bom" : "Regular"}
      />

      <StatCard
        tom="blue"
        size="sm"
        icone={<Clock />}
        rotulo="Total de Horas"
        valor={<span className="text-warning-ink">{<>{resumo.horasTotais}h</>}</span>}
        hint={<>Média: {resumo.totalSessoes > 0 ? (resumo.horasTotais / resumo.totalSessoes).toFixed(1) : 0}h por sessão</>}
      />
    </div>
  );
}
