import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface GraficosRelatorioProps {
  distribuicao: {
    curriculum: number;
    atividade: number;
    avaliacao: number;
    agendamento: number;
  };
}

export function GraficosRelatorio({ distribuicao }: GraficosRelatorioProps) {
  const total =
    distribuicao.curriculum +
    distribuicao.atividade +
    distribuicao.avaliacao +
    distribuicao.agendamento;

  if (total === 0) {
    return null;
  }

  const dados = [
    {
      label: "Planos Terapêuticos",
      valor: distribuicao.curriculum,
      percentual: (distribuicao.curriculum / total) * 100,
      cor: "bg-blue-600",
    },
    {
      label: "Atividades",
      valor: distribuicao.atividade,
      percentual: (distribuicao.atividade / total) * 100,
      cor: "bg-green-600",
    },
    {
      label: "Avaliações",
      valor: distribuicao.avaliacao,
      percentual: (distribuicao.avaliacao / total) * 100,
      cor: "bg-purple-600",
    },
    {
      label: "Agendamentos",
      valor: distribuicao.agendamento,
      percentual: (distribuicao.agendamento / total) * 100,
      cor: "bg-orange-600",
    },
  ].filter((d) => d.valor > 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Distribuição por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Tipo de Sessão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dados.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.valor} ({Math.round(item.percentual)}%)
                </span>
              </div>
              <Progress value={item.percentual} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Gráfico de Pizza Simplificado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dados.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`h-4 w-4 rounded ${item.cor}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.valor} sessões
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(item.percentual)}% do total
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{total} sessões</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
