/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  CheckCircle2,
  Save,
  X,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Tarefa {
  id: string;
  ordem: number | null;
  pergunta: string;
  descricao: string | null;
  criterios_pontuacao: string | null;
  nivel: { descricao: string } | null;
  habilidade: { habilidade: string } | null;
}

interface Pontuacao {
  id: string;
  ordem: number;
  tipo: string;
  valor: number;
}

interface Sessao {
  id: string;
  status: string;
  iniciada_em: string;
  paciente: {
    id: string;
    name: string;
  };
  avaliacao: {
    id: string;
    nome: string;
    tipo: string;
    tarefas: Tarefa[];
    pontuacoes: Pontuacao[];
  };
  respostas: Array<{
    tarefaId: string;
    pontuacao: number | null;
    observacao: string | null;
  }>;
}

const TIPOS_PONTUACAO: Record<string, string> = {
  SEMPRE_100: "Sempre (100%)",
  FREQUENTEMENTE_75: "Frequentemente (75%)",
  AS_VEZES_50: "Às Vezes (50%)",
  RARAMENTE_25: "Raramente (25%)",
  NUNCA_0: "Nunca (0%)",
  NAO_SE_APLICA: "Não se Aplica",
};

export default function AplicarAvaliacaoPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tarefaAtual, setTarefaAtual] = useState(0);
  const [respostas, setRespostas] = useState<
    Record<string, { pontuacao: number | null; observacao: string }>
  >({});
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [observacoesGerais, setObservacoesGerais] = useState("");

  const sessaoId = params.id as string;

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Iniciar Sessão", href: "/iniciar-sessao" },
    { label: "Aplicar Avaliação" },
  ];

  useEffect(() => {
    const fetchSessao = async () => {
      try {
        setLoading(true);
        if (!user) return;

        const userDataEncoded = btoa(JSON.stringify(user));
        const response = await fetch(`/api/sessoes-avaliacao?id=${sessaoId}`, {
          headers: {
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        const result = await response.json();

        if (result.success) {
          setSessao(result.data);

          // Carregar respostas já salvas
          const respostasMap: Record<
            string,
            { pontuacao: number | null; observacao: string }
          > = {};
          result.data.respostas?.forEach((resposta: any) => {
            respostasMap[resposta.tarefaId] = {
              pontuacao: resposta.pontuacao,
              observacao: resposta.observacao || "",
            };
          });
          setRespostas(respostasMap);
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessao();
  }, [sessaoId, user]);

  const salvarResposta = async (
    tarefaId: string,
    pontuacao: number | null,
    observacao: string
  ) => {
    try {
      if (!user) return;

      const userDataEncoded = btoa(JSON.stringify(user));
      await fetch("/api/sessoes-avaliacao", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          sessaoId,
          tarefaId,
          pontuacao,
          observacao,
        }),
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const handlePontuacao = (pontuacao: number) => {
    const tarefa = tarefas[tarefaAtual];
    const novasRespostas = {
      ...respostas,
      [tarefa.id]: {
        pontuacao,
        observacao: respostas[tarefa.id]?.observacao || "",
      },
    };
    setRespostas(novasRespostas);
    salvarResposta(tarefa.id, pontuacao, novasRespostas[tarefa.id].observacao);
  };

  const handleObservacao = (observacao: string) => {
    const tarefa = tarefas[tarefaAtual];
    const novasRespostas = {
      ...respostas,
      [tarefa.id]: {
        pontuacao: respostas[tarefa.id]?.pontuacao || null,
        observacao,
      },
    };
    setRespostas(novasRespostas);
    salvarResposta(tarefa.id, novasRespostas[tarefa.id].pontuacao, observacao);
  };

  const finalizarSessao = async () => {
    try {
      setSaving(true);
      if (!user) return;

      const userDataEncoded = btoa(JSON.stringify(user));
      const response = await fetch("/api/sessoes-avaliacao", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          sessaoId,
          finalizar: true,
          observacoes_gerais: observacoesGerais,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push("/iniciar-sessao");
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !sessao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const tarefas = sessao.avaliacao.tarefas;
  const tarefa = tarefas[tarefaAtual];
  const progresso = Math.round(((tarefaAtual + 1) / tarefas.length) * 100);
  const respostasPreenchidas = Object.keys(respostas).filter(
    (k) => respostas[k].pontuacao !== null
  ).length;

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header com informações da sessão */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Aplicar Avaliação
          </h1>
          <p className="text-muted-foreground">
            Paciente: <strong>{sessao.paciente.name}</strong> • Avaliação:{" "}
            <strong>{sessao.avaliacao.nome}</strong>
          </p>
        </div>

        {/* Progresso */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progresso da Avaliação
                </span>
                <span className="font-medium">
                  {respostasPreenchidas} de {tarefas.length} tarefas
                </span>
              </div>
              <Progress value={progresso} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Tarefa Atual */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">Tarefa {tarefaAtual + 1}</Badge>
                  {respostas[tarefa.id]?.pontuacao !== null &&
                    respostas[tarefa.id]?.pontuacao !== undefined && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                </CardTitle>
                <CardDescription>
                  {tarefaAtual + 1} de {tarefas.length}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {tarefa.nivel && (
                  <Badge variant="secondary" className="text-xs">
                    {tarefa.nivel.descricao}
                  </Badge>
                )}
                {tarefa.habilidade && (
                  <Badge variant="outline" className="text-xs">
                    {tarefa.habilidade.habilidade}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Texto da tarefa */}
            <div className="p-4 bg-primary/5 border-l-4 border-primary rounded">
              <p className="text-lg font-medium">{tarefa.pergunta}</p>
              {tarefa.descricao && (
                <p className="text-sm text-muted-foreground mt-2">
                  {tarefa.descricao}
                </p>
              )}
              {tarefa.criterios_pontuacao && (
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Critérios de Pontuação:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tarefa.criterios_pontuacao}
                  </p>
                </div>
              )}
            </div>

            {/* Avaliação */}
            <div className="space-y-4">
              <div>
                <Label className="text-base">Selecione a Pontuação *</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Avalie o desempenho do paciente nesta tarefa
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {sessao.avaliacao.pontuacoes.map((pont) => (
                    <Button
                      key={pont.id}
                      type="button"
                      variant={
                        respostas[tarefa.id]?.pontuacao === pont.valor
                          ? "default"
                          : "outline"
                      }
                      className={`h-auto py-3 flex flex-col items-center justify-center ${
                        respostas[tarefa.id]?.pontuacao === pont.valor
                          ? ""
                          : "hover:bg-primary/10"
                      }`}
                      onClick={() => handlePontuacao(pont.valor)}
                    >
                      <span className="font-semibold text-sm">
                        {TIPOS_PONTUACAO[pont.tipo]}
                      </span>
                      <span className="text-xs opacity-80 mt-1">
                        {pont.valor === -1 ? "N/A" : `${pont.valor}%`}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observações (opcional)</Label>
                <Textarea
                  id="observacao"
                  placeholder="Anote observações sobre o desempenho..."
                  value={respostas[tarefa.id]?.observacao || ""}
                  onChange={(e) => handleObservacao(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Navegação */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setTarefaAtual(Math.max(0, tarefaAtual - 1))}
                disabled={tarefaAtual === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>

              {tarefaAtual < tarefas.length - 1 ? (
                <Button onClick={() => setTarefaAtual(tarefaAtual + 1)}>
                  Próxima
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setShowFinalizar(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Finalizar Avaliação
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog Finalizar */}
        <AlertDialog open={showFinalizar} onOpenChange={setShowFinalizar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalizar Avaliação?</AlertDialogTitle>
              <AlertDialogDescription>
                Você respondeu {respostasPreenchidas} de {tarefas.length}{" "}
                tarefas.
                {respostasPreenchidas < tarefas.length && (
                  <span className="block mt-2 text-yellow-600">
                    Atenção: Existem {tarefas.length - respostasPreenchidas}{" "}
                    tarefas sem pontuação.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="obs-gerais">Observações Gerais da Sessão</Label>
              <Textarea
                id="obs-gerais"
                placeholder="Adicione observações sobre a sessão..."
                rows={4}
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={finalizarSessao} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Finalizar
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
