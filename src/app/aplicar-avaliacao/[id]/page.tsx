/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
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
  ClipboardList,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  ActionButton,
  Carregando,
  EstadoVazio,
  PageHeader,
  Panel,
  PersonAvatar,
} from "@/components/kit";

interface Tarefa {
  id: string;
  ordem: number | null;
  pergunta: string;
  descricao: string | null;
  criterios_pontuacao: string | null;
  numero?: number | null;
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
    nome: string;
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

function AplicarAvaliacaoPageContent() {
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

  // Navegar para uma tarefa específica
  const navegarParaTarefa = (indice: number) => {
    if (!sessao) return;
    if (indice < 0 || indice >= tarefas.length) return;
    setTarefaAtual(indice);
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
        <Carregando texto="Carregando avaliação..." className="py-24" />
      </MainLayout>
    );
  }

  const tarefas = sessao.avaliacao.tarefas;

  // Validar se a tarefa existe
  if (!tarefas || tarefas.length === 0) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="py-16">
          <EstadoVazio
            icone={<ClipboardList />}
            titulo="Nenhuma tarefa encontrada"
            texto="Esta avaliação não possui tarefas cadastradas."
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

  const tarefa = tarefas[tarefaAtual];
  if (!tarefa) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="py-16">
          <EstadoVazio
            icone={<ClipboardList />}
            titulo="Tarefa não encontrada"
            texto="Índice de tarefa inválido para esta avaliação."
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

  const progresso = Math.round(((tarefaAtual + 1) / tarefas.length) * 100);
  const respostasPreenchidas = Object.keys(respostas).filter(
    (k) => respostas[k].pontuacao !== null
  ).length;

  const respondida = respostas[tarefa.id]?.pontuacao !== null && respostas[tarefa.id]?.pontuacao !== undefined;

  // Nível e habilidade: no cabeçalho do painel em telas largas, no corpo em
  // telas estreitas (onde o cabeçalho não tem espaço)
  const marcadores = (
    <>
      {tarefa.nivel && (
        <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-[0.72rem] font-medium text-ink-2">
          {tarefa.nivel.descricao}
        </span>
      )}
      {tarefa.habilidade && (
        <span className="rounded-full border border-hairline px-2.5 py-1 text-[0.72rem] font-medium text-ink-2">
          {tarefa.habilidade.habilidade}
          {tarefa.numero != null && ` · Número: ${tarefa.numero}`}
        </span>
      )}
    </>
  );

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-7">
        <PageHeader
          titulo="Aplicar Avaliação"
          subtitulo={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Paciente: <strong className="font-semibold text-ink">{sessao.paciente.nome}</strong>
              </span>
              <span aria-hidden="true" className="text-ink-4">·</span>
              <span>
                Avaliação: <strong className="font-semibold text-ink">{sessao.avaliacao.nome}</strong>
              </span>
            </span>
          }
          acoes={<PersonAvatar nome={sessao.paciente.nome} tamanho={52} />}
        />

        {/* Navegação de tarefas (esquerda) + tarefa atual (direita) — 1 : 1.6 */}
        <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">
          <Panel icone={<ClipboardList />} titulo={<>Tarefas da Avaliação ({tarefas.length})</>}>
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1 xl:grid xl:max-h-[30rem] xl:grid-cols-3 xl:overflow-y-auto">
              {tarefas.map((trf, idx) => {
                const tarefaRespondida =
                  respostas[trf.id]?.pontuacao !== null && respostas[trf.id]?.pontuacao !== undefined;
                const isAtual = idx === tarefaAtual;

                return (
                  <button
                    key={trf.id}
                    type="button"
                    aria-current={isAtual ? "step" : undefined}
                    onClick={() => navegarParaTarefa(idx)}
                    className={`flex h-10 min-w-[6.5rem] shrink-0 items-center justify-between gap-1.5 rounded-full px-3.5 text-[0.78rem] font-medium transition focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none ${
                      isAtual
                        ? "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(47,85,240,0.7)]"
                        : tarefaRespondida
                          ? "bg-success-soft text-success-ink hover:brightness-95"
                          : "bg-surface-muted text-ink-2 hover:bg-brand-soft/60"
                    }`}
                  >
                    Tarefa {idx + 1}
                    {tarefaRespondida && <CheckCircle2 className="size-4 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-2 border-t border-hairline pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-3">Progresso da Avaliação</span>
                <span className="tabular font-semibold text-ink">
                  {respostasPreenchidas} de {tarefas.length} tarefas
                </span>
              </div>
              <Progress
                value={progresso}
                className="h-2 bg-surface-sunken [&>[data-slot=progress-indicator]]:rounded-full [&>[data-slot=progress-indicator]]:bg-brand"
              />
            </div>
          </Panel>

          <Panel
            titulo={
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-brand-soft px-3 py-1 text-[0.85rem] font-semibold text-brand">
                  Tarefa {tarefaAtual + 1}
                </span>
                {respondida && <CheckCircle2 className="size-5 text-success-ink" />}
              </span>
            }
            subtitulo={`${tarefaAtual + 1} de ${tarefas.length}`}
            acoes={<div className="hidden flex-wrap justify-end gap-1.5 sm:flex">{marcadores}</div>}
            rodape={
              <>
                <ActionButton
                  variant="secondary"
                  onClick={() => setTarefaAtual(Math.max(0, tarefaAtual - 1))}
                  disabled={tarefaAtual === 0}
                >
                  <ArrowLeft />
                  Anterior
                </ActionButton>

                {tarefaAtual < tarefas.length - 1 ? (
                  <ActionButton onClick={() => setTarefaAtual(tarefaAtual + 1)}>
                    Próxima
                    <ArrowRight />
                  </ActionButton>
                ) : (
                  <ActionButton
                    onClick={() => setShowFinalizar(true)}
                    className="bg-success text-white shadow-[0_8px_20px_-8px_var(--success)] hover:bg-success/90"
                  >
                    <CheckCircle2 />
                    Finalizar Avaliação
                  </ActionButton>
                )}
              </>
            }
          >
            <div className="space-y-6">
              <div className="flex flex-wrap gap-1.5 sm:hidden">{marcadores}</div>

              {/* Texto da tarefa */}
              <div className="rounded-2xl border-l-4 border-brand bg-brand-soft/50 p-4 md:p-5">
                <p className="text-[1.1rem] leading-snug font-semibold text-ink">{tarefa.pergunta}</p>
                {tarefa.descricao && <p className="mt-2 text-sm text-ink-3">{tarefa.descricao}</p>}
                {tarefa.criterios_pontuacao && (
                  <div className="mt-3 border-t border-brand/15 pt-3">
                    <p className="mb-1 text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                      Critérios de Pontuação:
                    </p>
                    <p className="text-sm text-ink-3">{tarefa.criterios_pontuacao}</p>
                  </div>
                )}
              </div>

              {/* Pontuação */}
              <div>
                <p className="text-[0.95rem] font-semibold text-ink">
                  Selecione a Pontuação <span className="text-danger-ink">*</span>
                </p>
                <p className="mb-3 text-sm text-ink-3">Avalie o desempenho do paciente nesta tarefa</p>
                <div role="radiogroup" aria-label="Pontuação" className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {sessao.avaliacao.pontuacoes.map((pont) => {
                    const selecionada = respostas[tarefa.id]?.pontuacao === pont.valor;
                    return (
                      <button
                        key={pont.id}
                        type="button"
                        role="radio"
                        aria-checked={selecionada}
                        onClick={() => handlePontuacao(pont.valor)}
                        className={`flex flex-col items-center justify-center rounded-2xl px-3 py-3.5 text-center transition focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none active:scale-[0.98] ${
                          selecionada
                            ? "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(47,85,240,0.7)]"
                            : "bg-surface-muted text-ink hover:bg-brand-soft/60"
                        }`}
                      >
                        <span className="text-sm font-semibold">{TIPOS_PONTUACAO[pont.tipo]}</span>
                        <span className={`tabular mt-1 text-xs ${selecionada ? "text-white/80" : "text-ink-3"}`}>
                          {pont.valor === -1 ? "N/A" : `${pont.valor}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="observacao">Observações (opcional)</Label>
                <Textarea
                  id="observacao"
                  placeholder="Anote observações sobre o desempenho..."
                  value={respostas[tarefa.id]?.observacao || ""}
                  onChange={(e) => handleObservacao(e.target.value)}
                  rows={3}
                  className="min-h-24"
                />
              </div>
            </div>
          </Panel>
        </div>

        {/* Dialog Finalizar */}
        <AlertDialog open={showFinalizar} onOpenChange={setShowFinalizar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalizar Avaliação?</AlertDialogTitle>
              <AlertDialogDescription>
                Você respondeu {respostasPreenchidas} de {tarefas.length}{" "}
                tarefas.
                {respostasPreenchidas < tarefas.length && (
                  <span className="mt-2 block text-warning-ink">
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

export default function AplicarAvaliacaoPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'sessoes', action: 'CREATE' }}>
      <AplicarAvaliacaoPageContent />
    </ProtectedRoute>
  );
}
