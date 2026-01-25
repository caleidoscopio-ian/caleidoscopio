import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, Users, TrendingUp, Clock } from "lucide-react";

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resumo.totalSessoes}</div>
          <p className="text-xs text-muted-foreground">No período selecionado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sessões Concluídas</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {resumo.sessoesFinalizadas}
          </div>
          <p className="text-xs text-muted-foreground">
            {resumo.totalSessoes > 0
              ? Math.round((resumo.sessoesFinalizadas / resumo.totalSessoes) * 100)
              : 0}
            % do total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pacientes Atendidos</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {resumo.pacientesUnicos}
          </div>
          <p className="text-xs text-muted-foreground">Pacientes únicos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {resumo.taxaConclusao}%
          </div>
          <p className="text-xs text-muted-foreground">
            {resumo.taxaConclusao >= 80 ? "Excelente" : resumo.taxaConclusao >= 60 ? "Bom" : "Regular"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {resumo.horasTotais}h
          </div>
          <p className="text-xs text-muted-foreground">
            Média: {resumo.totalSessoes > 0 ? (resumo.horasTotais / resumo.totalSessoes).toFixed(1) : 0}h por sessão
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
