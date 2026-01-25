"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileDown } from "lucide-react";
import { FiltrosRelatorio } from "@/components/relatorios/filtros-relatorio";
import { ResumoCards } from "@/components/relatorios/resumo-cards";
import { TabelaAtendimentos } from "@/components/relatorios/tabela-atendimentos";
import { GraficosRelatorio } from "@/components/relatorios/graficos-relatorio";

interface Resumo {
  totalSessoes: number;
  sessoesFinalizadas: number;
  pacientesUnicos: number;
  taxaConclusao: number;
  horasTotais: number;
}

interface Distribuicao {
  curriculum: number;
  atividade: number;
  avaliacao: number;
  agendamento: number;
}

interface Atendimento {
  id: string;
  tipo: "curriculum" | "atividade" | "avaliacao" | "agendamento";
  paciente: {
    id: string;
    nome: string;
    nascimento: Date | null;
  };
  profissional: {
    id: string;
    nome: string;
    especialidade: string;
  };
  data_hora: Date;
  finalizada_em: Date | null;
  status: string;
  nome: string;
  observacoes: string | null;
  sala?: string;
}

interface AtendimentosPorPaciente {
  paciente: {
    id: string;
    nome: string;
    nascimento: Date | null;
  };
  atendimentos: Atendimento[];
}

export default function RelatoriosProfissionaisPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [distribuicao, setDistribuicao] = useState<Distribuicao | null>(null);
  const [agrupados, setAgrupados] = useState<AtendimentosPorPaciente[]>([]);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Relatórios de Profissionais" },
  ];

  const buscarRelatorio = async (filtros: {
    profissionais: string[];
    dataInicio: string;
    dataFim: string;
    tipo: string;
    status: string;
  }) => {
    try {
      setLoading(true);

      if (!user) return;

      const params = new URLSearchParams();
      if (filtros.profissionais.length > 0) {
        params.set("profissionais", filtros.profissionais.join(","));
      }
      if (filtros.dataInicio) params.set("dataInicio", filtros.dataInicio);
      if (filtros.dataFim) params.set("dataFim", filtros.dataFim);
      if (filtros.tipo && filtros.tipo !== "todos") params.set("tipo", filtros.tipo);
      if (filtros.status && filtros.status !== "todos") params.set("status", filtros.status);

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/relatorios/profissionais?${params.toString()}`, {
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success) {
        setResumo(result.data.resumo);
        setDistribuicao(result.data.distribuicao);
        setAgrupados(result.data.agrupados);
      } else {
        console.error("Erro:", result.error);
      }
    } catch (error) {
      console.error("Erro ao buscar relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    // TODO: Implementar exportação PDF
    alert("Exportação PDF será implementada");
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios de Profissionais</h1>
            <p className="text-muted-foreground">
              Visualize e exporte relatórios de atendimentos
            </p>
          </div>
          {resumo && (
            <Button onClick={exportarPDF} variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          )}
        </div>

        {/* Filtros */}
        <FiltrosRelatorio onBuscar={buscarRelatorio} />

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && resumo && (
          <>
            {/* Cards de Resumo */}
            <ResumoCards resumo={resumo} />

            {/* Gráficos */}
            {distribuicao && (
              <GraficosRelatorio distribuicao={distribuicao} />
            )}

            {/* Tabela de Atendimentos */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento de Atendimentos</CardTitle>
                <CardDescription>
                  Visualização agrupada por paciente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TabelaAtendimentos agrupados={agrupados} />
              </CardContent>
            </Card>
          </>
        )}

        {!loading && !resumo && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Selecione os filtros e clique em &quot;Buscar&quot; para gerar o relatório
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
