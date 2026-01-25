/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  BookMarked,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Instrucao {
  id: string;
  ordem: number;
  texto: string;
  como_aplicar?: string;
  observacao?: string;
  procedimento_correcao?: string;
  materiais_utilizados?: string;
}

interface Pontuacao {
  id: string;
  ordem: number;
  sigla: string;
  grau: string;
}

interface Atividade {
  id: string;
  nome: string;
  tipo: string;
  metodologia?: string;
  qtd_tentativas_alvo?: number;
  instrucoes: Instrucao[];
  pontuacoes?: Pontuacao[];
}

interface CurriculumAtividade {
  id: string;
  ordem: number;
  atividade: Atividade;
}

interface Curriculum {
  id: string;
  nome: string;
  atividades: CurriculumAtividade[];
}

interface Paciente {
  id: string;
  name: string;
}

interface Sessao {
  id: string;
  pacienteId: string;
  curriculumId: string;
  status: string;
  iniciada_em: string;
  paciente: Paciente;
  curriculum: Curriculum;
  avaliacoes: AvaliacaoSalva[];
}

interface AvaliacaoSalva {
  id: string;
  atividadeId: string;
  instrucaoId: string;
  tentativa: number;
  nota: number;
  observacao?: string;
}

interface Avaliacao {
  instrucaoId: string;
  atividadeId: string;
  tentativa: number;
  nota: number;
  observacao: string;
}

export default function AplicarCurriculumPage() {
  const router = useRouter();
  const params = useParams();
  const sessaoId = params.sessaoId as string;
  const { user, isAuthenticated } = useAuth();

  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navegação entre atividades e instruções
  const [atividadeAtual, setAtividadeAtual] = useState(0);
  const [instrucaoAtual, setInstrucaoAtual] = useState(0);
  const [avaliacoes, setAvaliacoes] = useState<Map<string, Avaliacao>>(
    new Map()
  );

  // Estado das avaliações por tentativa (Map: tentativa -> {nota, observacao})
  const [avaliacoesTentativas, setAvaliacoesTentativas] = useState<Map<number, {nota: number | null, observacao: string}>>(
    new Map()
  );

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Iniciar Sessão", href: "/iniciar-sessao" },
    { label: "Aplicar Plano Terapêutico" },
  ];

  // Buscar dados da sessão
  const fetchSessao = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/sessoes-curriculum?id=${sessaoId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar sessão");
      }

      if (result.success) {
        setSessao(result.data);

        // Carregar avaliações já salvas
        if (result.data.avaliacoes && result.data.avaliacoes.length > 0) {
          const avaliacoesMap = new Map();
          result.data.avaliacoes.forEach((aval: AvaliacaoSalva) => {
            const key = `${aval.atividadeId}-${aval.instrucaoId}-${aval.tentativa}`;
            avaliacoesMap.set(key, {
              instrucaoId: aval.instrucaoId,
              atividadeId: aval.atividadeId,
              tentativa: aval.tentativa,
              nota: aval.nota,
              observacao: aval.observacao || "",
            });
          });
          setAvaliacoes(avaliacoesMap);
        }
      }
    } catch (err) {
      console.error("❌ Erro ao buscar sessão:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar sessão");
    } finally {
      setLoading(false);
    }
  };

  // Salvar todas as avaliações da instrução atual (todas as tentativas)
  const salvarAvaliacoesInstrucao = async () => {
    if (!sessao) {
      setError("Sessão não encontrada");
      return false;
    }

    const atividade = sessao.curriculum.atividades[atividadeAtual];
    if (!atividade) {
      setError("Atividade não encontrada");
      return false;
    }

    const instrucao = atividade.atividade.instrucoes[instrucaoAtual];
    if (!instrucao) {
      setError("Instrução não encontrada");
      return false;
    }

    const qtdTentativas = atividade.atividade.qtd_tentativas_alvo || 1;

    // Verificar se todas as tentativas foram avaliadas
    for (let t = 1; t <= qtdTentativas; t++) {
      const avalTentativa = avaliacoesTentativas.get(t);
      if (!avalTentativa || avalTentativa.nota === null) {
        setError(`Avalie a tentativa ${t} antes de continuar`);
        return false;
      }
    }

    try {
      setSalvando(true);
      setError(null);

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      // Salvar cada tentativa
      for (let t = 1; t <= qtdTentativas; t++) {
        const avalTentativa = avaliacoesTentativas.get(t)!;

        const response = await fetch("/api/sessoes-curriculum/avaliar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
          body: JSON.stringify({
            sessaoId: sessao.id,
            atividadeId: atividade.atividade.id,
            instrucaoId: instrucao.id,
            tentativa: t,
            nota: avalTentativa.nota,
            tipos_ajuda: [], // Removido
            observacao: avalTentativa.observacao || undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Erro ao salvar avaliação");
        }

        // Salvar no estado local
        const key = `${atividade.atividade.id}-${instrucao.id}-${t}`;
        const novaAvaliacao: Avaliacao = {
          instrucaoId: instrucao.id,
          atividadeId: atividade.atividade.id,
          tentativa: t,
          nota: avalTentativa.nota!,
          observacao: avalTentativa.observacao,
        };

        setAvaliacoes((prev) => new Map(prev).set(key, novaAvaliacao));
      }

      return true;
    } catch (err) {
      console.error("❌ Erro ao salvar avaliações:", err);
      setError(err instanceof Error ? err.message : "Erro ao salvar avaliações");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  // Avançar para próxima instrução ou atividade
  const proximaInstrucao = async () => {
    const sucesso = await salvarAvaliacoesInstrucao();

    if (sucesso && sessao) {
      const atividade = sessao.curriculum.atividades[atividadeAtual];

      if (instrucaoAtual < atividade.atividade.instrucoes.length - 1) {
        // Próxima instrução da mesma atividade
        setInstrucaoAtual((prev) => prev + 1);
      } else if (atividadeAtual < sessao.curriculum.atividades.length - 1) {
        // Próxima atividade
        setAtividadeAtual((prev) => prev + 1);
        setInstrucaoAtual(0);
      }
    }
  };

  // Voltar para instrução ou atividade anterior
  const instrucaoAnterior = () => {
    if (instrucaoAtual > 0) {
      setInstrucaoAtual((prev) => prev - 1);
    } else if (atividadeAtual > 0) {
      const atividadeAnterior = atividadeAtual - 1;
      const atividadeAnt = sessao!.curriculum.atividades[atividadeAnterior];
      const ultimaInstrucao = atividadeAnt.atividade.instrucoes.length - 1;
      setAtividadeAtual(atividadeAnterior);
      setInstrucaoAtual(ultimaInstrucao);
    }
  };

  // Navegar para uma atividade específica
  const navegarParaAtividade = (indice: number) => {
    if (!sessao) return;

    // Limpar estado das avaliações de tentativas ao trocar de atividade
    setAvaliacoesTentativas(new Map());

    // Atualizar os índices - SEMPRE reseta instrução para 0
    setAtividadeAtual(indice);
    setInstrucaoAtual(0);
  };

  // Finalizar sessão
  const finalizarSessao = async () => {
    console.log("🏁 finalizarSessao chamada");
    if (!sessao) {
      console.log("❌ Sessão não encontrada");
      return;
    }

    // Calcular total de avaliações (instruções × tentativas)
    const totalAvaliacoes = sessao.curriculum.atividades.reduce(
      (total, atv) => {
        const qtdTentativas = atv.atividade.qtd_tentativas_alvo || 1;
        return total + (atv.atividade.instrucoes.length * qtdTentativas);
      },
      0
    );

    console.log("📊 Validando:", { avaliacoesSize: avaliacoes.size, totalAvaliacoes });

    // Verificar se todas as avaliações foram registradas
    if (avaliacoes.size !== totalAvaliacoes) {
      const errorMsg = `Avalie todas as tentativas antes de finalizar (${avaliacoes.size}/${totalAvaliacoes})`;
      console.log("❌", errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      setFinalizando(true);
      setError(null);

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/sessoes-curriculum/finalizar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          sessaoId: sessao.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao finalizar sessão");
      }

      // Redirecionar para lista de sessões ou dashboard
      router.push("/iniciar-sessao");
    } catch (err) {
      console.error("❌ Erro ao finalizar sessão:", err);
      setError(err instanceof Error ? err.message : "Erro ao finalizar sessão");
    } finally {
      setFinalizando(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user && sessaoId) {
      fetchSessao();
    }
  }, [isAuthenticated, user, sessaoId]);

  // Carregar avaliações da instrução atual quando navegar
  useEffect(() => {
    if (!sessao) return;

    const atividade = sessao.curriculum.atividades[atividadeAtual];
    if (!atividade) return;

    const instrucao = atividade.atividade.instrucoes[instrucaoAtual];
    if (!instrucao) return;

    const qtdTentativas = atividade.atividade.qtd_tentativas_alvo || 1;
    const tentativasMap = new Map<number, {nota: number | null, observacao: string}>();

    // Carregar avaliações já salvas para esta instrução
    for (let t = 1; t <= qtdTentativas; t++) {
      const key = `${atividade.atividade.id}-${instrucao.id}-${t}`;
      const avalSalva = avaliacoes.get(key);

      if (avalSalva) {
        tentativasMap.set(t, {
          nota: avalSalva.nota,
          observacao: avalSalva.observacao || ""
        });
      }
    }

    setAvaliacoesTentativas(tentativasMap);
  }, [sessao, atividadeAtual, instrucaoAtual]);

  if (loading) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando sessão...</p>
        </div>
      </MainLayout>
    );
  }

  if (error && !sessao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Erro ao carregar sessão</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/iniciar-sessao")}>
            Voltar para Iniciar Sessão
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!sessao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sessão não encontrada</h3>
          <Button onClick={() => router.push("/iniciar-sessao")}>
            Voltar para Iniciar Sessão
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Validar se atividade e instrução existem
  const atividade = sessao.curriculum.atividades[atividadeAtual];
  if (!atividade) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Atividade não encontrada</h3>
          <Button onClick={() => router.push("/iniciar-sessao")}>
            Voltar para Iniciar Sessão
          </Button>
        </div>
      </MainLayout>
    );
  }

  const instrucao = atividade.atividade.instrucoes[instrucaoAtual];
  if (!instrucao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Instrução não encontrada</h3>
          <p className="text-muted-foreground mb-4">
            Índice de instrução inválido para esta atividade
          </p>
          <Button onClick={() => router.push("/iniciar-sessao")}>
            Voltar para Iniciar Sessão
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Calcular total de avaliações (instruções × tentativas)
  const totalAvaliacoes = sessao.curriculum.atividades.reduce(
    (total, atv) => {
      const qtdTentativas = atv.atividade.qtd_tentativas_alvo || 1;
      return total + (atv.atividade.instrucoes.length * qtdTentativas);
    },
    0
  );
  const progresso = (avaliacoes.size / totalAvaliacoes) * 100;

  const isUltimaInstrucao =
    instrucaoAtual === atividade.atividade.instrucoes.length - 1 &&
    atividadeAtual === sessao.curriculum.atividades.length - 1;
  const todasAvaliadas = avaliacoes.size === totalAvaliacoes;

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header com informações da sessão */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Aplicar Plano Terapêutico
          </h1>
          <p className="text-muted-foreground">
            Paciente: <strong>{sessao.paciente.name}</strong> • Curriculum:{" "}
            <strong>{sessao.curriculum.nome}</strong>
          </p>
        </div>

        {/* Painel de Navegação de Atividades */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              Atividades do Curriculum ({sessao.curriculum.atividades.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sessao.curriculum.atividades.map((atv, idx) => {
                // Verificar se todas as instruções E todas as tentativas foram avaliadas
                const qtdTentativas = atv.atividade.qtd_tentativas_alvo || 1;
                const todasInstrucoesAvaliadas = atv.atividade.instrucoes.every((instr) => {
                  // Verificar se todas as tentativas desta instrução foram avaliadas
                  for (let t = 1; t <= qtdTentativas; t++) {
                    const key = `${atv.atividade.id}-${instr.id}-${t}`;
                    if (!avaliacoes.has(key)) {
                      return false;
                    }
                  }
                  return true;
                });
                const isAtual = idx === atividadeAtual;

                return (
                  <Button
                    key={atv.id}
                    variant={isAtual ? "default" : "outline"}
                    size="sm"
                    onClick={() => navegarParaAtividade(idx)}
                    className={`flex-shrink-0 min-w-[120px] justify-between ${
                      todasInstrucoesAvaliadas && !isAtual
                        ? "border-green-500 bg-green-50 hover:bg-green-100"
                        : ""
                    }`}
                  >
                    <span className="text-xs font-medium truncate">
                      {idx + 1}. {atv.atividade.nome}
                    </span>
                    {todasInstrucoesAvaliadas && (
                      <CheckCircle2 className="h-4 w-4 ml-1 flex-shrink-0 text-green-600" />
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Progresso */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progresso Geral da Sessão
                </span>
                <span className="font-medium">
                  {avaliacoes.size} de {totalAvaliacoes} atividades
                </span>
              </div>
              <Progress value={progresso} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Instrução Atual */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Atividade {atividadeAtual + 1}: {atividade.atividade.nome}
                  </Badge>
                  <Badge variant="outline">Instrução {instrucao.ordem}</Badge>
                </CardTitle>
                <CardDescription>
                  Instrução {instrucaoAtual + 1} de {atividade.atividade.instrucoes.length}
                  {" • "}
                  Total: {avaliacoes.size}/{totalAvaliacoes}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações da instrução */}
            <div className="space-y-3">
              <div className="p-4 bg-primary/5 border-l-4 border-primary rounded">
                <p className="text-sm font-semibold text-primary mb-1">Instrução:</p>
                <p className="text-lg font-medium">{instrucao.texto}</p>
              </div>

              {instrucao.como_aplicar && (
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm font-semibold text-blue-700 mb-1">Como Aplicar:</p>
                  <p className="text-sm text-gray-700">{instrucao.como_aplicar}</p>
                </div>
              )}

              {instrucao.observacao && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-sm font-semibold text-yellow-700 mb-1">Observação:</p>
                  <p className="text-sm text-gray-700">{instrucao.observacao}</p>
                </div>
              )}
            </div>

            {/* Tentativas */}
            <div className="space-y-8">
              {Array.from({ length: atividade.atividade.qtd_tentativas_alvo || 1 }, (_, index) => {
                const tentativa = index + 1;
                const avalTentativa = avaliacoesTentativas.get(tentativa) || { nota: null, observacao: "" };

                return (
                  <div key={tentativa} className="p-4 border-2 rounded-lg space-y-4 bg-white">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-blue-600">
                        Tentativa {tentativa}/{atividade.atividade.qtd_tentativas_alvo || 1}
                      </Badge>
                      {avalTentativa.nota !== null && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </div>

                    {/* Respostas */}
                    <div className="space-y-2">
                      <Label className="text-base">Resposta *</Label>
                      {atividade.atividade.pontuacoes && atividade.atividade.pontuacoes.length > 0 ? (
                        <>
                          <div className={`grid gap-2 ${
                            atividade.atividade.pontuacoes.length <= 4 ? 'grid-cols-4' :
                            atividade.atividade.pontuacoes.length === 5 ? 'grid-cols-5' :
                            'grid-cols-6'
                          }`}>
                            {atividade.atividade.pontuacoes.map((pontuacao, idx) => (
                              <Button
                                key={pontuacao.id}
                                type="button"
                                variant={avalTentativa.nota === idx ? "default" : "outline"}
                                className={`h-14 text-lg font-bold ${
                                  avalTentativa.nota === idx ? "" : "hover:bg-primary/10"
                                }`}
                                onClick={() => {
                                  setAvaliacoesTentativas(prev => {
                                    const newMap = new Map(prev);
                                    newMap.set(tentativa, { ...avalTentativa, nota: idx });
                                    return newMap;
                                  });
                                }}
                              >
                                {pontuacao.sigla}
                              </Button>
                            ))}
                          </div>
                          <div className={`grid gap-2 text-xs text-center text-muted-foreground ${
                            atividade.atividade.pontuacoes.length <= 4 ? 'grid-cols-4' :
                            atividade.atividade.pontuacoes.length === 5 ? 'grid-cols-5' :
                            'grid-cols-6'
                          }`}>
                            {atividade.atividade.pontuacoes.map((pontuacao) => (
                              <div key={pontuacao.id}>{pontuacao.grau}</div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-5 gap-2">
                            {[0, 1, 2, 3, 4].map((value) => (
                              <Button
                                key={value}
                                type="button"
                                variant={avalTentativa.nota === value ? "default" : "outline"}
                                className={`h-14 text-lg font-bold ${
                                  avalTentativa.nota === value ? "" : "hover:bg-primary/10"
                                }`}
                                onClick={() => {
                                  setAvaliacoesTentativas(prev => {
                                    const newMap = new Map(prev);
                                    newMap.set(tentativa, { ...avalTentativa, nota: value });
                                    return newMap;
                                  });
                                }}
                              >
                                {value}
                              </Button>
                            ))}
                          </div>
                          <div className="grid grid-cols-5 gap-2 text-xs text-center text-muted-foreground">
                            <div>Falhou</div>
                            <div>Ruim</div>
                            <div>Regular</div>
                            <div>Bom</div>
                            <div>Perfeito</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Observação */}
                    <div className="space-y-2">
                      <Label htmlFor={`observacao-${tentativa}`}>Observações (opcional)</Label>
                      <Textarea
                        id={`observacao-${tentativa}`}
                        placeholder="Anote observações sobre o desempenho..."
                        value={avalTentativa.observacao}
                        onChange={(e) => {
                          setAvaliacoesTentativas(prev => {
                            const newMap = new Map(prev);
                            newMap.set(tentativa, { ...avalTentativa, observacao: e.target.value });
                            return newMap;
                          });
                        }}
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navegação */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={instrucaoAnterior}
                disabled={atividadeAtual === 0 && instrucaoAtual === 0 || salvando}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>

              {!isUltimaInstrucao ? (
                <Button
                  onClick={proximaInstrucao}
                  disabled={salvando}
                >
                  {salvando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      Salvar e Próxima
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    console.log("🔍 Botão Finalizar clicado");
                    console.log("📊 Avaliações salvas:", avaliacoes.size);
                    console.log("📊 Total esperado:", totalAvaliacoes);
                    console.log("✅ Todas avaliadas?", todasAvaliadas);

                    const sucesso = await salvarAvaliacoesInstrucao();
                    console.log("💾 Salvamento bem-sucedido?", sucesso);

                    if (sucesso && todasAvaliadas) {
                      console.log("✅ Chamando finalizarSessao...");
                      finalizarSessao();
                    } else {
                      console.log("❌ Não finalizou:", { sucesso, todasAvaliadas });
                    }
                  }}
                  disabled={salvando || finalizando}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {salvando || finalizando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {finalizando ? "Finalizando..." : "Salvando..."}
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Salvar e Finalizar Sessão
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
