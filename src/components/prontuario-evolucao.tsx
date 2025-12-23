"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Activity,
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  User,
  FileText,
} from "lucide-react";

interface Sessao {
  id: string;
  pacienteId: string;
  atividadeId: string;
  profissionalId: string;
  iniciada_em: string;
  finalizada_em?: string;
  observacoes_gerais?: string;
  status: "EM_ANDAMENTO" | "FINALIZADA" | "CANCELADA";
  createdAt: string;
  updatedAt: string;
  atividade: {
    id: string;
    nome: string;
    tipo: string;
    metodologia?: string;
  };
  profissional: {
    id: string;
    nome: string;
    especialidade: string;
  };
  avaliacoes: Array<{
    id: string;
    nota: number;
    tipos_ajuda: string[];
    observacao?: string;
    instrucao: {
      id: string;
      texto: string;
      ordem: number;
    };
  }>;
}

interface ProntuarioEvolucaoProps {
  pacienteId: string;
}

export function ProntuarioEvolucao({ pacienteId }: ProntuarioEvolucaoProps) {
  const { user } = useAuth();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessoes = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const userDataEncoded = btoa(JSON.stringify(user));

        const response = await fetch("/api/sessoes", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Erro ao buscar sessões");
        }

        if (result.success) {
          // Filtrar sessões do paciente e ordenar por data (mais recente primeiro)
          const sessoesDoPaciente = result.data
            .filter((s: Sessao) => s.pacienteId === pacienteId)
            .sort((a: Sessao, b: Sessao) =>
              new Date(b.iniciada_em).getTime() - new Date(a.iniciada_em).getTime()
            );
          setSessoes(sessoesDoPaciente);
        } else {
          throw new Error(result.error || "Erro desconhecido");
        }
      } catch (err) {
        console.error("❌ Erro ao buscar sessões:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao carregar sessões"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSessoes();
  }, [pacienteId, user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calcularDuracao = (inicio: string, fim?: string) => {
    if (!fim) return null;

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);
    const diffMs = fimDate.getTime() - inicioDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} min`;
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

  const calcularMediaNotas = (avaliacoes: Sessao["avaliacoes"]) => {
    if (avaliacoes.length === 0) return null;

    const soma = avaliacoes.reduce((acc, av) => acc + av.nota, 0);
    const media = soma / avaliacoes.length;
    return media.toFixed(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FINALIZADA":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Finalizada
          </Badge>
        );
      case "EM_ANDAMENTO":
        return (
          <Badge variant="outline" className="border-blue-600 text-blue-600">
            <PlayCircle className="h-3 w-3 mr-1" />
            Em Andamento
          </Badge>
        );
      case "CANCELADA":
        return (
          <Badge variant="outline" className="border-red-600 text-red-600">
            Cancelada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando evolução clínica...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Erro ao carregar evolução</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (sessoes.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhuma sessão encontrada</h3>
        <p className="text-muted-foreground">
          Este paciente ainda não possui sessões de atividades cadastradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Sessões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessoes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finalizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {sessoes.filter((s) => s.status === "FINALIZADA").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {sessoes.filter((s) => s.status === "EM_ANDAMENTO").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Sessões */}
      <div className="space-y-4">
        {sessoes.map((sessao) => {
          const media = calcularMediaNotas(sessao.avaliacoes);
          const duracao = calcularDuracao(sessao.iniciada_em, sessao.finalizada_em);

          return (
            <Card key={sessao.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {sessao.atividade.nome}
                      </CardTitle>
                      {getStatusBadge(sessao.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(sessao.iniciada_em)}</span>
                      {duracao && (
                        <>
                          <span>•</span>
                          <Clock className="h-4 w-4" />
                          <span>{duracao}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {media && (
                    <div className="text-right">
                      <div className="text-2xl font-bold">{media}</div>
                      <div className="text-sm text-muted-foreground">Média</div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Informações da Atividade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-muted-foreground">
                      Tipo de Atividade
                    </label>
                    <p>{sessao.atividade.tipo.replace(/_/g, " ")}</p>
                  </div>
                  {sessao.atividade.metodologia && (
                    <div>
                      <label className="font-medium text-muted-foreground">
                        Metodologia
                      </label>
                      <p>{sessao.atividade.metodologia}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Profissional */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <User className="h-4 w-4" />
                    <span>Profissional</span>
                  </div>
                  <div className="pl-6">
                    <p className="font-medium">{sessao.profissional.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {sessao.profissional.especialidade}
                    </p>
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-muted-foreground">
                      Iniciada em
                    </label>
                    <p>{formatDateTime(sessao.iniciada_em)}</p>
                  </div>
                  {sessao.finalizada_em && (
                    <div>
                      <label className="font-medium text-muted-foreground">
                        Finalizada em
                      </label>
                      <p>{formatDateTime(sessao.finalizada_em)}</p>
                    </div>
                  )}
                </div>

                {/* Avaliações */}
                {sessao.avaliacoes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                        <FileText className="h-4 w-4" />
                        <span>Avaliações ({sessao.avaliacoes.length} instruções)</span>
                      </div>
                      <div className="space-y-2 pl-6">
                        {sessao.avaliacoes.slice(0, 3).map((av) => (
                          <div
                            key={av.id}
                            className="flex items-center justify-between text-sm border-l-2 border-muted pl-3 py-1"
                          >
                            <span className="text-muted-foreground">
                              {av.instrucao.texto}
                            </span>
                            <Badge variant="outline">Nota: {av.nota}</Badge>
                          </div>
                        ))}
                        {sessao.avaliacoes.length > 3 && (
                          <p className="text-sm text-muted-foreground italic">
                            + {sessao.avaliacoes.length - 3} avaliações
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Observações */}
                {sessao.observacoes_gerais && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Observações Gerais
                      </label>
                      <p className="text-sm mt-2 whitespace-pre-wrap">
                        {sessao.observacoes_gerais}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
