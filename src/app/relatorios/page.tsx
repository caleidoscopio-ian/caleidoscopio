"use client";

import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Calendar, TrendingUp, FileText, ArrowRight } from "lucide-react";

export default function RelatoriosPage() {
  const router = useRouter();

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Relatórios" },
  ];

  const relatorios = [
    {
      id: "profissionais",
      titulo: "Relatório de Profissionais",
      descricao: "Visualize os atendimentos realizados por cada terapeuta, com estatísticas detalhadas e exportação em PDF.",
      icone: Users,
      cor: "text-blue-600",
      bgCor: "bg-blue-50",
      href: "/relatorios/profissionais",
      disponivel: true,
    },
    {
      id: "pacientes",
      titulo: "Relatório de Pacientes",
      descricao: "Acompanhe o histórico completo de atendimentos, evolução e progresso de cada paciente.",
      icone: FileText,
      cor: "text-green-600",
      bgCor: "bg-green-50",
      href: "/relatorios/pacientes",
      disponivel: false,
    },
    {
      id: "agendamentos",
      titulo: "Relatório de Agendamentos",
      descricao: "Analise a ocupação da agenda, taxa de comparecimento e cancelamentos.",
      icone: Calendar,
      cor: "text-purple-600",
      bgCor: "bg-purple-50",
      href: "/relatorios/agendamentos",
      disponivel: false,
    },
    {
      id: "desempenho",
      titulo: "Relatório de Desempenho",
      descricao: "Métricas e indicadores de desempenho da clínica, produtividade e resultados.",
      icone: TrendingUp,
      cor: "text-orange-600",
      bgCor: "bg-orange-50",
      href: "/relatorios/desempenho",
      disponivel: false,
    },
  ];

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">
            Selecione o tipo de relatório que deseja visualizar
          </p>
        </div>

        {/* Cards de Relatórios */}
        <div className="grid gap-6 md:grid-cols-2">
          {relatorios.map((relatorio) => {
            const Icone = relatorio.icone;

            return (
              <Card
                key={relatorio.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  !relatorio.disponivel ? "opacity-60" : "cursor-pointer hover:border-primary"
                }`}
                onClick={() => {
                  if (relatorio.disponivel) {
                    router.push(relatorio.href);
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div
                      className={`p-3 rounded-lg ${relatorio.bgCor} ${relatorio.cor}`}
                    >
                      <Icone className="h-6 w-6" />
                    </div>
                    {!relatorio.disponivel && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                        Em breve
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-4">{relatorio.titulo}</CardTitle>
                  <CardDescription>{relatorio.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant={relatorio.disponivel ? "default" : "outline"}
                    className="w-full"
                    disabled={!relatorio.disponivel}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (relatorio.disponivel) {
                        router.push(relatorio.href);
                      }
                    }}
                  >
                    {relatorio.disponivel ? (
                      <>
                        Acessar Relatório
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      "Em desenvolvimento"
                    )}
                  </Button>
                </CardContent>

                {/* Decoração visual */}
                {relatorio.disponivel && (
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 ${relatorio.bgCor} opacity-20 rounded-full -mr-16 -mt-16`}
                  ></div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
