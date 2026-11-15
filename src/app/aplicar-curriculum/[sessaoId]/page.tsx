/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
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
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  BookOpen,
  Check,
  Layers,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Target,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SIGLA_ERRO, SIGLA_INDEPENDENTE } from "@/lib/pontuacao";
import {
  ActionButton,
  Carregando,
  EstadoVazio,
  FasePill,
  PageHeader,
  Panel,
  StatusPill,
} from "@/components/kit";

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
  como_aplicar?: string;
  observacao?: string;
  procedimento_correcao?: string;
  materiais_utilizados?: string;
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

// ============ Destaque (faixa colorida das orientações) ============

const TONS_DESTAQUE = {
  brand: "bg-brand-soft/70 before:bg-brand text-brand",
  info: "bg-info-soft before:bg-info text-info-ink",
  danger: "bg-danger-soft before:bg-danger text-danger-ink",
  success: "bg-success-soft before:bg-success text-success-ink",
  warning: "bg-warning-soft before:bg-warning text-warning-ink",
} as const;

function Destaque({
  tom,
  rotulo,
  principal,
  children,
}: {
  tom: keyof typeof TONS_DESTAQUE;
  rotulo: string;
  principal?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl py-3.5 pr-4 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1 ${TONS_DESTAQUE[tom]}`}
    >
      <p className="text-[0.75rem] font-semibold tracking-wide uppercase">{rotulo}</p>
      <div className={principal ? "mt-1 text-lg font-semibold text-ink" : "mt-1 text-sm text-ink-2"}>
        {children}
      </div>
    </div>
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
        <Carregando texto="Carregando sessão..." className="py-24" />
      </MainLayout>
    );
  }

  if (error && !sessao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="py-16">
          <EstadoVazio
            icone={<AlertCircle />}
            titulo="Erro ao carregar sessão"
            texto={error}
            acao={
              <ActionButton onClick={() => router.push("/iniciar-sessao")}>
                Voltar para Iniciar Sessão
              </ActionButton>
            }
          />
        </div>
      </MainLayout>
    );
  }

  if (!sessao || !sessao.atividadesClone || sessao.atividadesClone.length === 0) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="py-16">
          <EstadoVazio
            icone={<AlertCircle />}
            titulo="Sessão não encontrada"
            acao={
              <ActionButton onClick={() => router.push("/iniciar-sessao")}>
                Voltar para Iniciar Sessão
              </ActionButton>
            }
          />
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
        <div className="py-16">
          <EstadoVazio
            icone={<AlertCircle />}
            titulo="Instrução não encontrada"
            acao={
              <ActionButton onClick={() => router.push("/iniciar-sessao")}>
                Voltar para Iniciar Sessão
              </ActionButton>
            }
          />
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
      <div className="space-y-7">
        <PageHeader
          titulo="Aplicar Plano Terapêutico"
          subtitulo={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5">
                <User className="size-4" />
                Paciente: <strong className="font-semibold text-ink">{sessao.paciente.nome}</strong>
              </span>
              <span aria-hidden="true" className="text-ink-4">·</span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4" />
                Curriculum: <strong className="font-semibold text-ink">{sessao.curriculum.nome}</strong>
              </span>
            </span>
          }
        />

        {/* Instrução atual (esquerda) + progresso e lista (coluna lateral fixa) */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-ink">
                <AlertCircle className="size-5 shrink-0" />
                {error}
              </div>
            )}

            <Panel
              icone={<ClipboardCheck />}
              titulo={
                <span className="flex flex-wrap items-center gap-2">
                  <StatusPill tom="info" className="text-[0.8rem]">
                    {clone.nome}
                  </StatusPill>
                  {instrucao.faseAtual && <FasePill fase={instrucao.faseAtual} />}
                </span>
              }
              subtitulo={
                <span className="tabular">
                  Instrução {itemAtual + 1} de {itensNavegacao.length} · Total: {avaliacoes.size}/{totalAvaliacoes}
                </span>
              }
              rodape={
                <>
                  <ActionButton
                    variant="secondary"
                    className="border-hairline"
                    onClick={instrucaoAnterior}
                    disabled={itemAtual === 0 || salvando}
                  >
                    <ArrowLeft />
                    Anterior
                  </ActionButton>

                  {!isUltimaInstrucao ? (
                    <ActionButton onClick={proximaInstrucao} disabled={salvando}>
                      {salvando ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          Salvar e Próxima
                          <ArrowRight />
                        </>
                      )}
                    </ActionButton>
                  ) : (
                    <ActionButton
                      onClick={async () => {
                        const sucesso = await salvarAvaliacoesInstrucao();
                        if (sucesso && todasAvaliadas) {
                          finalizarSessao();
                        }
                      }}
                      disabled={salvando || finalizando}
                      className="bg-success text-white shadow-[0_8px_20px_-8px_var(--success)] hover:bg-success/90"
                    >
                      {salvando || finalizando ? (
                        <>
                          <Loader2 className="animate-spin" />
                          {finalizando ? "Finalizando..." : "Salvando..."}
                        </>
                      ) : (
                        <>
                          <ClipboardCheck />
                          Salvar e Finalizar Sessão
                        </>
                      )}
                    </ActionButton>
                  )}
                </>
              }
            >
              <div className="space-y-6">
                {/* Informações da instrução: faixa colorida à esquerda, cada uma no seu tom */}
                <div className="space-y-2.5">
                  <Destaque tom="brand" rotulo="Instrução:" principal>
                    {instrucao.texto}
                  </Destaque>
                  {clone.como_aplicar && (
                    <Destaque tom="info" rotulo="Como Aplicar:">
                      {clone.como_aplicar}
                    </Destaque>
                  )}
                  {clone.observacao && (
                    <Destaque tom="warning" rotulo="Observação:">
                      {clone.observacao}
                    </Destaque>
                  )}
                  {clone.procedimento_correcao && (
                    <Destaque tom="danger" rotulo="Procedimento de Correção:">
                      {clone.procedimento_correcao}
                    </Destaque>
                  )}
                  {clone.materiais_utilizados && (
                    <Destaque tom="success" rotulo="Materiais Utilizados:">
                      {clone.materiais_utilizados}
                    </Destaque>
                  )}
                </div>

                {/* Tentativas */}
                <div className="space-y-4">
                  {Array.from(
                    { length: instrucao.qtd_tentativas_alvo || 1 },
                    (_, index) => {
                      const tentativa = index + 1;
                      const avalTentativa = avaliacoesTentativas.get(tentativa) || {
                        nota: null,
                        observacao: "",
                      };
                      const colunas = `repeat(${Math.min(pontuacoesFase.length, 8)}, minmax(0, 1fr))`;

                      return (
                        <div
                          key={tentativa}
                          className="space-y-4 rounded-[1.4rem] border border-hairline bg-surface p-4 md:p-5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="tabular rounded-full bg-brand px-3 py-1 text-[0.75rem] font-semibold text-white">
                              Tentativa {tentativa}/{instrucao.qtd_tentativas_alvo || 1}
                            </span>
                            {avalTentativa.nota !== null && (
                              <CheckCircle2 className="size-5 text-success-ink" />
                            )}
                          </div>

                          {/* Respostas — pontuações por instrução/fase */}
                          <div className="space-y-2">
                            <p className="text-[0.85rem] font-semibold text-ink-2">Resposta *</p>
                            {pontuacoesFase.length > 0 ? (
                              <>
                                <div
                                  className="grid gap-2"
                                  role="radiogroup"
                                  aria-label={`Resposta da tentativa ${tentativa}`}
                                  style={{ gridTemplateColumns: colunas }}
                                >
                                  {pontuacoesFase.map((pontuacao, idx) => {
                                    // Verde/vermelho pela sigla, para o destaque
                                    // nunca contradizer o que o cálculo considera acerto
                                    const isUltimo = pontuacao.sigla === SIGLA_INDEPENDENTE;
                                    const isPrimeiro = pontuacao.sigla === SIGLA_ERRO;
                                    const isSelecionado = avalTentativa.nota === idx;
                                    return (
                                      <button
                                        key={pontuacao.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelecionado}
                                        aria-label={`${pontuacao.sigla}: ${pontuacao.grau}`}
                                        className={`h-14 rounded-2xl text-lg font-bold transition focus-visible:ring-4 focus-visible:ring-brand-ring focus-visible:outline-none ${
                                          isSelecionado
                                            ? isUltimo
                                              ? "bg-success text-white shadow-[0_8px_20px_-10px_var(--success)]"
                                              : isPrimeiro
                                                ? "bg-danger text-white shadow-[0_8px_20px_-10px_var(--danger)]"
                                                : "bg-brand text-white shadow-[0_8px_20px_-10px_var(--brand)]"
                                            : "bg-surface-muted text-ink hover:bg-brand-soft"
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
                                      </button>
                                    );
                                  })}
                                </div>
                                <div
                                  className="grid gap-2 text-center text-[0.7rem] leading-tight text-ink-3"
                                  style={{ gridTemplateColumns: colunas }}
                                >
                                  {pontuacoesFase.map((pontuacao) => (
                                    <div key={pontuacao.id}>{pontuacao.grau}</div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning-ink">
                                Esta instrução não possui pontuações configuradas para a fase atual. Configure no painel de Evolução.
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
                              className="resize-none py-3"
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </Panel>
          </div>

          {/* Coluna lateral: progresso (noturno) + lista de instruções */}
          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Panel variant="night" icone={<ClipboardCheck />} titulo="Progresso Geral da Sessão">
              <p className="tabular text-[3rem] leading-none font-bold tracking-[-0.04em] text-white">
                {Math.round(progresso)}%
              </p>
              <p className="tabular mt-2 text-sm text-white/70">
                {avaliacoes.size} de {totalAvaliacoes} avaliações
              </p>
              <div
                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progresso)}
              >
                <div className="h-full rounded-full bg-white" style={{ width: `${progresso}%` }} />
              </div>
            </Panel>

            <Panel icone={<Layers />} titulo={<>Instruções da Sessão ({itensNavegacao.length})</>}>
              <ol className="scrollbar-none -mx-1 -mt-2 flex gap-2 overflow-x-auto px-1 pb-1 xl:max-h-[28rem] xl:flex-col xl:overflow-x-visible xl:overflow-y-auto">
                {itensNavegacao.map((nav, idx) => {
                  const qtdTentativas = nav.instrucao.qtd_tentativas_alvo || 1;
                  let avaliada = true;
                  for (let t = 1; t <= qtdTentativas; t++) {
                    const key = `${nav.clone.id}-${nav.instrucao.id}-${t}`;
                    if (!avaliacoes.has(key)) { avaliada = false; break; }
                  }
                  const isAtual = idx === itemAtual;

                  return (
                    <li key={`${nav.clone.id}-${nav.instrucao.id}`} className="shrink-0 xl:shrink">
                      <button
                        type="button"
                        aria-current={isAtual ? "step" : undefined}
                        onClick={() => navegarParaItem(idx)}
                        className={`flex w-[15rem] items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none xl:w-full ${
                          isAtual
                            ? "bg-brand text-white"
                            : avaliada
                              ? "bg-success-soft hover:bg-success-soft/70"
                              : "bg-surface-muted hover:bg-brand-soft/60"
                        }`}
                      >
                        <span
                          className={`tabular grid size-7 shrink-0 place-items-center rounded-full text-[0.75rem] font-semibold ${
                            isAtual
                              ? "bg-white/20 text-white"
                              : avaliada
                                ? "bg-success text-white"
                                : "bg-surface text-ink-2"
                          }`}
                        >
                          {avaliada ? <Check className="size-4" /> : idx + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[0.8rem] font-semibold ${isAtual ? "text-white" : "text-ink"}`}>
                            {nav.instrucao.texto}
                          </span>
                          <span className={`block truncate text-[0.7rem] ${isAtual ? "text-white/75" : "text-ink-3"}`}>
                            {nav.clone.nome}
                          </span>
                        </span>
                        {nav.instrucao.faseAtual && (
                          <FasePill
                            fase={nav.instrucao.faseAtual}
                            className={`shrink-0 ${isAtual ? "bg-white/20 text-white" : ""}`}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          </aside>
        </div>
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
                  { label: "Avançaram", value: avancaram, color: "text-success-ink" },
                  { label: "Regrediram", value: regrediram, color: "text-danger-ink" },
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
                        <div key={j} className="rounded-2xl bg-surface-muted p-3 space-y-2">
                          {/* Nome instrução + badge */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs text-muted-foreground leading-snug flex-1">{instr.textoInstrucao}</span>
                            {instr.avancou && (
                              <Badge className="bg-success-soft text-success-ink border-success-soft shrink-0 gap-1 text-xs">
                                <TrendingUp className="h-3 w-3" /> Avançou
                              </Badge>
                            )}
                            {instr.regrediu && (
                              <Badge className="bg-danger-soft text-danger-ink border-danger-soft shrink-0 gap-1 text-xs">
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
                            <FasePill fase={instr.faseAnterior} />
                            {mudouFase && (
                              <>
                                <span className="text-muted-foreground text-xs">→</span>
                                <FasePill fase={instr.faseNova} />
                              </>
                            )}
                          </div>

                          {/* Barra de acerto */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Acerto: <span className={`font-semibold ml-0.5 ${atingiu ? "text-success-ink" : "text-danger-ink"}`}>{pct}%</span>
                              </span>
                              <span>Critério: ≥{criterio}%</span>
                            </div>
                            <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${atingiu ? "bg-success" : "bg-danger"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                              <div className="absolute top-0 h-full w-0.5 bg-foreground/40" style={{ left: `${criterio}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{instr.stats.tentativasCorretas}/{instr.stats.totalTentativas} corretas</span>
                              {atingiu
                                ? <span className="text-success-ink flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Atingiu</span>
                                : <span className="text-danger-ink flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Não atingiu</span>
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
