/* eslint-disable react-hooks/exhaustive-deps */
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  BookMarked,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Target,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ProtectedRoute from "@/components/ProtectedRoute";

// ============ Interfaces ============

interface InstrucaoPontuacao {
  id: string;
  fase: string;
  ordem: number;
  sigla: string;
  grau: string;
}

interface Instrucao {
  id: string;
  ordem: number;
  texto: string;
  faseAtual?: string;
  qtd_tentativas_alvo?: number;
  como_aplicar?: string;
  observacao?: string;
  procedimento_correcao?: string;
  materiais_utilizados?: string;
  pontuacoes?: InstrucaoPontuacao[];
}

interface Pontuacao {
  id: string;
  ordem: number;
  sigla: string;
  grau: string;
}

// Item plano para navegação: cada instrução selecionada é um item
interface InstrucaoNavItem {
  clone: AtividadeClone;
  instrucao: Instrucao;
  pontuacoesFase: Pontuacao[];
}

interface AtividadeClone {
  id: string;
  atividadeOriginalId: string | null;
  ordem: number;
  nome: string;
  protocolo?: string;
  habilidade?: string;
  tipo_ensino?: string;
  qtd_alvos_sessao?: number;
  qtd_tentativas_alvo?: number;
  faseAtual: string;
  instrucoes: Instrucao[];
  pontuacoes?: Pontuacao[];
}

interface Paciente {
  id: string;
  nome: string;
}

interface Curriculum {
  id: string;
  nome: string;
}

interface AvaliacaoSalva {
  id: string;
  atividadeId: string;
  atividadeCloneId?: string;
  instrucaoId: string;
  tentativa: number;
  nota: number;
  observacao?: string;
}

interface Sessao {
  id: string;
  pacienteId: string;
  curriculumId: string;
  status: string;
  iniciada_em: string;
  paciente: Paciente;
  curriculum: Curriculum;
  atividadesClone: AtividadeClone[];
  avaliacoes: AvaliacaoSalva[];
  instrucoesSelecionadas?: InstrucaoSelecionada[];
}

interface Avaliacao {
  instrucaoId: string;
  atividadeId: string;
  atividadeCloneId: string;
  tentativa: number;
  nota: number;
  observacao: string;
}

interface InstrucaoEvolucaoResultado {
  instrucaoId: string;
  textoInstrucao: string;
  avancou: boolean;
  regrediu: boolean;
  faseAnterior: string;
  faseNova: string;
  stats: {
    totalTentativas: number;
    tentativasCorretas: number;
    porcentagemAcerto: number;
    porcentagemCriterio: number;
    qtdSessoesConsecutivas: number;
    atingiuCriterio: boolean;
  };
}

interface EvolucaoResultado {
  atividadeCloneId: string;
  nomeAtividade: string;
  progressoAtividade: number;
  instrucoes: InstrucaoEvolucaoResultado[];
}

interface InstrucaoSelecionada {
  instrucaoId: string;
  atividadeCloneId: string;
}

interface ResultadoSessao {
  pacienteNome: string;
  curriculumNome: string;
  iniciadaEm: string;
  finalizadaEm: string;
  evolucao: EvolucaoResultado[];
}

// ============ Fase Badge ============

const FASE_CONFIG: Record<string, { label: string; color: string }> = {
  LINHA_BASE: { label: "Linha de Base", color: "bg-gray-500" },
  INTERVENCAO: { label: "Intervenção", color: "bg-blue-500" },
  MANUTENCAO: { label: "Manutenção", color: "bg-green-500" },
  GENERALIZACAO: { label: "Generalização", color: "bg-amber-500" },
};

function FaseBadge({ fase }: { fase: string }) {
  const config = FASE_CONFIG[fase] || { label: fase, color: "bg-gray-400" };
  return (
    <Badge className={`${config.color} text-white text-xs`}>
      {config.label}
    </Badge>
  );
}

// ============ Componente Principal ============

function AplicarCurriculumPageContent() {
  const router = useRouter();
  const params = useParams();
  const sessaoId = params.sessaoId as string;
  const { user, isAuthenticated } = useAuth();

  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultadoSessao, setResultadoSessao] = useState<ResultadoSessao | null>(null);

  // Navegação plana — cada instrução selecionada é um item
  const [itemAtual, setItemAtual] = useState(0);
  const [avaliacoes, setAvaliacoes] = useState<Map<string, Avaliacao>>(
    new Map()
  );

  // Estado das avaliações por tentativa
  const [avaliacoesTentativas, setAvaliacoesTentativas] = useState<
    Map<number, { nota: number | null; observacao: string }>
  >(new Map());

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Iniciar Sessão", href: "/iniciar-sessao" },
    { label: "Aplicar Plano Terapêutico" },
  ];

  // ============ Fetch sessão ============

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
          const avaliacoesMap = new Map<string, Avaliacao>();
          result.data.avaliacoes.forEach((aval: AvaliacaoSalva) => {
            const cloneId = aval.atividadeCloneId || aval.atividadeId;
            const key = `${cloneId}-${aval.instrucaoId}-${aval.tentativa}`;
            avaliacoesMap.set(key, {
              instrucaoId: aval.instrucaoId,
              atividadeId: aval.atividadeId,
              atividadeCloneId: cloneId,
              tentativa: aval.tentativa,
              nota: aval.nota,
              observacao: aval.observacao || "",
            });
          });
          setAvaliacoes(avaliacoesMap);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar sessão:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar sessão"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============ Salvar avaliações ============

  const salvarAvaliacoesInstrucao = async () => {
    if (!sessao) {
      setError("Sessão não encontrada");
      return false;
    }

    const item = itensNavegacao[itemAtual];
    if (!item) {
      setError("Instrução não encontrada");
      return false;
    }

    const clone = item.clone;
    const instrucao = item.instrucao;
    const qtdTentativas = instrucao.qtd_tentativas_alvo || 1;

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
            atividadeId: clone.atividadeOriginalId || clone.id,
            atividadeCloneId: clone.id,
            instrucaoId: instrucao.id,
            tentativa: t,
            nota: avalTentativa.nota,
            tipos_ajuda: [],
            observacao: avalTentativa.observacao || undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Erro ao salvar avaliação");
        }

        // Salvar no estado local
        const key = `${clone.id}-${instrucao.id}-${t}`;
        const novaAvaliacao: Avaliacao = {
          instrucaoId: instrucao.id,
          atividadeId: clone.atividadeOriginalId || clone.id,
          atividadeCloneId: clone.id,
          tentativa: t,
          nota: avalTentativa.nota!,
          observacao: avalTentativa.observacao,
        };

        setAvaliacoes((prev) => new Map(prev).set(key, novaAvaliacao));
      }

      return true;
    } catch (err) {
      console.error("Erro ao salvar avaliações:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao salvar avaliações"
      );
      return false;
    } finally {
      setSalvando(false);
    }
  };

  // ============ Navegação ============

  const proximaInstrucao = async () => {
    const sucesso = await salvarAvaliacoesInstrucao();
    if (sucesso && itemAtual < itensNavegacao.length - 1) {
      setItemAtual((prev) => prev + 1);
    }
  };

  const instrucaoAnterior = () => {
    if (itemAtual > 0) {
      setItemAtual((prev) => prev - 1);
    }
  };

  const navegarParaItem = (indice: number) => {
    setAvaliacoesTentativas(new Map());
    setItemAtual(indice);
  };

  // ============ Finalizar ============

  const finalizarSessao = async () => {
    if (!sessao) return;

    const totalAvaliacoes = itensNavegacao.reduce((total, item) => {
      return total + (item.instrucao.qtd_tentativas_alvo || 1);
    }, 0);

    if (avaliacoes.size < totalAvaliacoes) {
      setError(
        `Avalie todas as tentativas antes de finalizar (${avaliacoes.size}/${totalAvaliacoes})`
      );
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

      // Exibir modal de resultado
      setResultadoSessao({
        pacienteNome: result.data.paciente?.nome || sessao.paciente.nome,
        curriculumNome: result.data.curriculum?.nome || sessao.curriculum.nome,
        iniciadaEm: result.data.iniciada_em,
        finalizadaEm: result.data.finalizada_em,
        evolucao: result.evolucao || [],
      });
    } catch (err) {
      console.error("Erro ao finalizar sessão:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao finalizar sessão"
      );
    } finally {
      setFinalizando(false);
    }
  };

  // ============ Effects ============

  useEffect(() => {
    if (isAuthenticated && user && sessaoId) {
      fetchSessao();
    }
  }, [isAuthenticated, user, sessaoId]);

  // Carregar avaliações da instrução atual quando navegar
  useEffect(() => {
    if (!sessao || itensNavegacao.length === 0) return;

    const item = itensNavegacao[itemAtual];
    if (!item) return;

    const qtdTentativas = item.instrucao.qtd_tentativas_alvo || 1;
    const tentativasMap = new Map<
      number,
      { nota: number | null; observacao: string }
    >();

    for (let t = 1; t <= qtdTentativas; t++) {
      const key = `${item.clone.id}-${item.instrucao.id}-${t}`;
      const avalSalva = avaliacoes.get(key);

      if (avalSalva) {
        tentativasMap.set(t, {
          nota: avalSalva.nota,
          observacao: avalSalva.observacao || "",
        });
      }
    }

    setAvaliacoesTentativas(tentativasMap);
  }, [sessao, itemAtual]);

  // ============ Render: Loading ============

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
          <h3 className="text-lg font-medium mb-2">
            Erro ao carregar sessão
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/iniciar-sessao")}>
            Voltar para Iniciar Sessão
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!sessao || !sessao.atividadesClone || sessao.atividadesClone.length === 0) {
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

  // ============ Construir lista plana de itens de navegação ============

  // Helper: pegar pontuações da instrução filtradas por fase (com "+" por último)
  const getPontuacoesFase = (instr: Instrucao): Pontuacao[] => {
    const fase = instr.faseAtual || "LINHA_BASE";
    return (instr.pontuacoes || [])
      .filter((p) => p.fase === fase)
      .sort((a, b) => {
        if (a.sigla === "+") return 1;
        if (b.sigla === "+") return -1;
        return a.ordem - b.ordem;
      })
      .map((p) => ({ id: p.id, ordem: p.ordem, sigla: p.sigla, grau: p.grau }));
  };

  const instrucoesSel = sessao.instrucoesSelecionadas ?? [];
  const instrucaoIdsSet = new Set(instrucoesSel.map((s) => s.instrucaoId));

  // Lista plana: cada instrução selecionada é um item independente
  const itensNavegacao: InstrucaoNavItem[] = [];
  for (const clone of sessao.atividadesClone) {
    const instrucoesFiltradas = instrucoesSel.length > 0
      ? clone.instrucoes.filter((i) => instrucaoIdsSet.has(i.id))
      : clone.instrucoes;
    for (const instr of instrucoesFiltradas) {
      itensNavegacao.push({
        clone,
        instrucao: instr,
        pontuacoesFase: getPontuacoesFase(instr),
      });
    }
  }

  // ============ Render: Dados ============

  const currentItem = itensNavegacao[itemAtual];
  if (!currentItem) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Instrução não encontrada
          </h3>
          <Button onClick={() => router.push("/iniciar-sessao")}>
            Voltar para Iniciar Sessão
          </Button>
        </div>
      </MainLayout>
    );
  }

  const { clone, instrucao, pontuacoesFase } = currentItem;

  // Calcular progresso
  const totalAvaliacoes = itensNavegacao.reduce((total, item) => {
    return total + (item.instrucao.qtd_tentativas_alvo || 1);
  }, 0);
  const progresso = totalAvaliacoes > 0 ? (avaliacoes.size / totalAvaliacoes) * 100 : 0;

  const isUltimaInstrucao = itemAtual === itensNavegacao.length - 1;
  const todasAvaliadas = avaliacoes.size >= totalAvaliacoes;

  return (
    <>
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Aplicar Plano Terapêutico
          </h1>
          <p className="text-muted-foreground">
            Paciente: <strong>{sessao.paciente.nome}</strong> • Curriculum:{" "}
            <strong>{sessao.curriculum.nome}</strong>
          </p>
        </div>

        {/* Painel de Navegação — cada instrução selecionada é um item */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              Instruções da Sessão ({itensNavegacao.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {itensNavegacao.map((nav, idx) => {
                const qtdTentativas = nav.instrucao.qtd_tentativas_alvo || 1;
                let avaliada = true;
                for (let t = 1; t <= qtdTentativas; t++) {
                  const key = `${nav.clone.id}-${nav.instrucao.id}-${t}`;
                  if (!avaliacoes.has(key)) { avaliada = false; break; }
                }
                const isAtual = idx === itemAtual;

                return (
                  <Button
                    key={`${nav.clone.id}-${nav.instrucao.id}`}
                    variant={isAtual ? "default" : "outline"}
                    size="sm"
                    onClick={() => navegarParaItem(idx)}
                    className={`flex-shrink-0 min-w-[160px] max-w-[260px] justify-between ${
                      avaliada && !isAtual
                        ? "border-green-500 bg-green-50 hover:bg-green-100"
                        : ""
                    }`}
                  >
                    <span className="text-xs font-medium truncate">
                      {idx + 1}. {nav.clone.nome} - {nav.instrucao.texto}
                    </span>
                    <span className="flex items-center gap-1 ml-1">
                      {nav.instrucao.faseAtual && <FaseBadge fase={nav.instrucao.faseAtual} />}
                      {avaliada && (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                      )}
                    </span>
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
                  {avaliacoes.size} de {totalAvaliacoes} avaliações
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
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {clone.nome}
                  </Badge>
                  {instrucao.faseAtual && <FaseBadge fase={instrucao.faseAtual} />}
                </CardTitle>
                <CardDescription>
                  Instrução {itemAtual + 1} de {itensNavegacao.length}
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
                <p className="text-sm font-semibold text-primary mb-1">
                  Instrução:
                </p>
                <p className="text-lg font-medium">{instrucao.texto}</p>
              </div>

              {instrucao.como_aplicar && (
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm font-semibold text-blue-700 mb-1">
                    Como Aplicar:
                  </p>
                  <p className="text-sm text-gray-700">
                    {instrucao.como_aplicar}
                  </p>
                </div>
              )}

              {instrucao.observacao && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-sm font-semibold text-yellow-700 mb-1">
                    Observação:
                  </p>
                  <p className="text-sm text-gray-700">
                    {instrucao.observacao}
                  </p>
                </div>
              )}
            </div>

            {/* Tentativas */}
            <div className="space-y-8">
              {Array.from(
                { length: instrucao.qtd_tentativas_alvo || 1 },
                (_, index) => {
                  const tentativa = index + 1;
                  const avalTentativa = avaliacoesTentativas.get(tentativa) || {
                    nota: null,
                    observacao: "",
                  };

                  return (
                    <div
                      key={tentativa}
                      className="p-4 border-2 rounded-lg space-y-4 bg-white"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-600">
                          Tentativa {tentativa}/
                          {instrucao.qtd_tentativas_alvo || 1}
                        </Badge>
                        {avalTentativa.nota !== null && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>

                      {/* Respostas — pontuações por instrução/fase */}
                      <div className="space-y-2">
                        <Label className="text-base">Resposta *</Label>
                        {pontuacoesFase.length > 0 ? (
                          <>
                            <div
                              className={`grid gap-2`}
                              style={{
                                gridTemplateColumns: `repeat(${Math.min(pontuacoesFase.length, 8)}, minmax(0, 1fr))`,
                              }}
                            >
                              {pontuacoesFase.map(
                                (pontuacao, idx) => {
                                  const isUltimo = idx === pontuacoesFase.length - 1;
                                  const isPrimeiro = idx === 0;
                                  const isSelecionado = avalTentativa.nota === idx;
                                  return (
                                    <Button
                                      key={pontuacao.id}
                                      type="button"
                                      variant={
                                        isSelecionado
                                          ? "default"
                                          : "outline"
                                      }
                                      className={`h-14 text-lg font-bold ${
                                        isSelecionado
                                          ? isUltimo
                                            ? "bg-green-600 hover:bg-green-700"
                                            : isPrimeiro
                                              ? "bg-red-600 hover:bg-red-700"
                                              : ""
                                          : "hover:bg-primary/10"
                                      }`}
                                      onClick={() => {
                                        setAvaliacoesTentativas((prev) => {
                                          const newMap = new Map(prev);
                                          newMap.set(tentativa, {
                                            ...avalTentativa,
                                            nota: idx,
                                          });
                                          return newMap;
                                        });
                                      }}
                                    >
                                      {pontuacao.sigla}
                                    </Button>
                                  );
                                }
                              )}
                            </div>
                            <div
                              className={`grid gap-2 text-xs text-center text-muted-foreground`}
                              style={{
                                gridTemplateColumns: `repeat(${Math.min(pontuacoesFase.length, 8)}, minmax(0, 1fr))`,
                              }}
                            >
                              {pontuacoesFase.map(
                                (pontuacao) => (
                                  <div key={pontuacao.id}>
                                    {pontuacao.grau}
                                  </div>
                                )
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                            <p className="text-sm">
                              Esta instrução não possui pontuações configuradas para a fase atual. Configure no painel de Evolução.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Observação */}
                      <div className="space-y-2">
                        <Label htmlFor={`observacao-${tentativa}`}>
                          Observações (opcional)
                        </Label>
                        <Textarea
                          id={`observacao-${tentativa}`}
                          placeholder="Anote observações sobre o desempenho..."
                          value={avalTentativa.observacao}
                          onChange={(e) => {
                            setAvaliacoesTentativas((prev) => {
                              const newMap = new Map(prev);
                              newMap.set(tentativa, {
                                ...avalTentativa,
                                observacao: e.target.value,
                              });
                              return newMap;
                            });
                          }}
                          rows={2}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Navegação */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={instrucaoAnterior}
                disabled={itemAtual === 0 || salvando}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>

              {!isUltimaInstrucao ? (
                <Button onClick={proximaInstrucao} disabled={salvando}>
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
                    const sucesso = await salvarAvaliacoesInstrucao();
                    if (sucesso && todasAvaliadas) {
                      finalizarSessao();
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

    {/* Modal de Resultado da Sessão */}
    {resultadoSessao && (
      <Dialog open={true} onOpenChange={() => router.push("/iniciar-sessao")}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          {/* Header colorido */}
          <div className="bg-gradient-to-r from-primary/90 to-primary px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-xl flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Sessão Finalizada!
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2 text-sm text-primary-foreground/80 space-y-0.5">
              <p><span className="font-medium">Paciente:</span> {resultadoSessao.pacienteNome}</p>
              <p><span className="font-medium">Curriculum:</span> {resultadoSessao.curriculumNome}</p>
              {resultadoSessao.iniciadaEm && resultadoSessao.finalizadaEm && (
                <p>
                  <span className="font-medium">Duração:</span>{" "}
                  {Math.round(
                    (new Date(resultadoSessao.finalizadaEm).getTime() -
                      new Date(resultadoSessao.iniciadaEm).getTime()) /
                      60000
                  )}{" "}
                  min
                </p>
              )}
            </div>
          </div>

          {/* Resumo geral por instrução */}
          {resultadoSessao.evolucao.length > 0 && (() => {
            const todasInstrucoes = resultadoSessao.evolucao.flatMap(e => e.instrucoes);
            const avancaram = todasInstrucoes.filter(i => i.avancou).length;
            const regrediram = todasInstrucoes.filter(i => i.regrediu).length;
            const mantiveram = todasInstrucoes.filter(i => !i.avancou && !i.regrediu).length;
            return (
              <div className="grid grid-cols-4 divide-x border-b bg-muted/40">
                {[
                  { label: "Instruções", value: todasInstrucoes.length, color: "text-foreground" },
                  { label: "Avançaram", value: avancaram, color: "text-green-600" },
                  { label: "Regrediram", value: regrediram, color: "text-red-500" },
                  { label: "Mantiveram", value: mantiveram, color: "text-muted-foreground" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 text-center">
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Detalhes por atividade → instruções */}
          <ScrollArea className="max-h-[380px]">
            <div className="divide-y">
              {resultadoSessao.evolucao.map((ev, i) => (
                <div key={i} className="px-6 py-4 space-y-3">
                  {/* Header da atividade com progresso */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{ev.nomeAtividade}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${ev.progressoAtividade}%` }} />
                      </div>
                      <span>{ev.progressoAtividade}%</span>
                    </div>
                  </div>

                  {/* Instruções da atividade */}
                  <div className="space-y-3 pl-2">
                    {ev.instrucoes.map((instr, j) => {
                      const mudouFase = instr.faseNova !== instr.faseAnterior;
                      const pct = instr.stats.porcentagemAcerto;
                      const criterio = instr.stats.porcentagemCriterio;
                      const atingiu = instr.stats.atingiuCriterio;

                      return (
                        <div key={j} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                          {/* Nome instrução + badge */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs text-muted-foreground leading-snug flex-1">{instr.textoInstrucao}</span>
                            {instr.avancou && (
                              <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0 gap-1 text-xs">
                                <TrendingUp className="h-3 w-3" /> Avançou
                              </Badge>
                            )}
                            {instr.regrediu && (
                              <Badge className="bg-red-100 text-red-600 border-red-200 shrink-0 gap-1 text-xs">
                                <TrendingDown className="h-3 w-3" /> Regrediu
                              </Badge>
                            )}
                            {!instr.avancou && !instr.regrediu && (
                              <Badge variant="outline" className="text-muted-foreground shrink-0 gap-1 text-xs">
                                <Minus className="h-3 w-3" /> Manteve
                              </Badge>
                            )}
                          </div>

                          {/* Fase anterior → nova */}
                          <div className="flex items-center gap-2">
                            <FaseBadge fase={instr.faseAnterior} />
                            {mudouFase && (
                              <>
                                <span className="text-muted-foreground text-xs">→</span>
                                <FaseBadge fase={instr.faseNova} />
                              </>
                            )}
                          </div>

                          {/* Barra de acerto */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Acerto: <span className={`font-semibold ml-0.5 ${atingiu ? "text-green-600" : "text-red-500"}`}>{pct}%</span>
                              </span>
                              <span>Critério: ≥{criterio}%</span>
                            </div>
                            <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${atingiu ? "bg-green-500" : "bg-red-400"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                              <div className="absolute top-0 h-full w-0.5 bg-foreground/40" style={{ left: `${criterio}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{instr.stats.tentativasCorretas}/{instr.stats.totalTentativas} corretas</span>
                              {atingiu
                                ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Atingiu</span>
                                : <span className="text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Não atingiu</span>
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {resultadoSessao.evolucao.length === 0 && (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">
              Nenhuma instrução avaliada nesta sessão.
            </div>
          )}

          <Separator />
          <DialogFooter className="px-6 py-4">
            <Button onClick={() => router.push("/iniciar-sessao")} className="w-full">
              Concluir e Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}

export default function AplicarCurriculumPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'sessoes', action: 'CREATE' }}>
      <AplicarCurriculumPageContent />
    </ProtectedRoute>
  );
}
