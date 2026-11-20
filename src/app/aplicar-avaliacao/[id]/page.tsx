"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
import {
  TODOS,
  type Filtro,
  filtrarPorNivel,
  filtrarTarefas,
  opcoesHabilidade,
  opcoesNivel,
  posicaoInicial,
  proximoGrupo,
  trocarNivel,
  usaDimensao,
} from "@/lib/filtro-tarefas-avaliacao";

interface Tarefa {
  id: string;
  ordem: number | null;
  pergunta: string;
  descricao: string | null;
  criterios_pontuacao: string | null;
  numero?: number | null;
  nivel: { id: string; ordem: number; descricao: string } | null;
  habilidade: { id: string; ordem: number; habilidade: string } | null;
}

interface Pontuacao {
  id: string;
  ordem: number;
  tipo: string;
  valor: number;
}

interface RespostaSalva {
  tarefaId: string;
  pontuacao: number | null;
  observacao: string | null;
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
  respostas: RespostaSalva[];
}

type MapaRespostas = Record<string, { pontuacao: number | null; observacao: string }>;

const TIPOS_PONTUACAO: Record<string, string> = {
  SEMPRE_100: "Sempre (100%)",
  FREQUENTEMENTE_75: "Frequentemente (75%)",
  AS_VEZES_50: "Às Vezes (50%)",
  RARAMENTE_25: "Raramente (25%)",
  NUNCA_0: "Nunca (0%)",
  NAO_SE_APLICA: "Não se Aplica",
};

const SEM_TAREFAS: Tarefa[] = [];

const estaRespondida = (respostas: MapaRespostas, tarefaId: string) =>
  respostas[tarefaId]?.pontuacao !== null && respostas[tarefaId]?.pontuacao !== undefined;

function AplicarAvaliacaoPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tarefaAtualId, setTarefaAtualId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>({ nivel: TODOS, habilidade: TODOS });
  const [respostas, setRespostas] = useState<MapaRespostas>({});
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
          const dados = result.data as Sessao;
          setSessao(dados);

          // Carregar respostas já salvas
          const respostasMap: MapaRespostas = {};
          dados.respostas?.forEach((resposta) => {
            respostasMap[resposta.tarefaId] = {
              pontuacao: resposta.pontuacao,
              observacao: resposta.observacao || "",
            };
          });
          setRespostas(respostasMap);

          // Abre no primeiro nível/atividade com tarefa sem resposta
          const inicio = posicaoInicial(dados.avaliacao.tarefas ?? [], (id) =>
            estaRespondida(respostasMap, id)
          );
          setFiltro(inicio.filtro);
          setTarefaAtualId(inicio.tarefaId);
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessao();
  }, [sessaoId, user]);

  // ── Filtro Nível › Atividade ─────────────────────────────────────────────
  const todasTarefas = sessao?.avaliacao.tarefas ?? SEM_TAREFAS;

  const nivelOpcoes = useMemo(() => opcoesNivel(todasTarefas), [todasTarefas]);
  const todasHabilidades = useMemo(() => opcoesHabilidade(todasTarefas), [todasTarefas]);
  // Socially Savvy não tem nível: o filtro some em vez de oferecer só "Sem nível"
  const mostrarNivel = usaDimensao(nivelOpcoes);
  const mostrarHabilidade = usaDimensao(todasHabilidades);

  // A Atividade depende do Nível: só as habilidades que existem nele
  const habilidadeOpcoes = useMemo(
    () => opcoesHabilidade(filtrarPorNivel(todasTarefas, filtro.nivel)),
    [todasTarefas, filtro.nivel]
  );

  const tarefasVisiveis = useMemo(
    () => filtrarTarefas(todasTarefas, filtro),
    [todasTarefas, filtro]
  );

  const proximo = useMemo(() => proximoGrupo(todasTarefas, filtro), [todasTarefas, filtro]);

  const filtroAtivo = filtro.nivel !== TODOS || filtro.habilidade !== TODOS;

  const rotuloGrupo = (g: Filtro) => {
    const partes: string[] = [];
    // Nível só entra no rótulo quando muda — "Próxima: TATO" basta dentro do mesmo nível
    if (g.nivel !== TODOS && (g.habilidade === TODOS || g.nivel !== filtro.nivel)) {
      partes.push(nivelOpcoes.find((o) => o.valor === g.nivel)?.rotulo ?? "");
    }
    if (g.habilidade !== TODOS) {
      partes.push(todasHabilidades.find((o) => o.valor === g.habilidade)?.rotulo ?? "");
    }
    return partes.filter(Boolean).join(" · ");
  };

  /**
   * Aplica o filtro na hora. A tarefa atual continua se ainda estiver na lista;
   * senão vai para a primeira da lista (`primeira`) ou para a primeira sem
   * resposta (`pendente`).
   */
  const aplicarFiltro = (novo: Filtro, destino: "primeira" | "pendente") => {
    const lista = filtrarTarefas(todasTarefas, novo);
    setFiltro(novo);
    if (destino === "primeira") {
      setTarefaAtualId(lista[0]?.id ?? null);
      return;
    }
    if (lista.some((t) => t.id === tarefaAtualId)) return;
    const alvo = lista.find((t) => !estaRespondida(respostas, t.id)) ?? lista[0];
    setTarefaAtualId(alvo?.id ?? null);
  };

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

  // Validar se a tarefa existe
  if (todasTarefas.length === 0) {
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

  // Posição DENTRO do filtro: a numeração recomeça a cada nível/atividade
  const posicaoEncontrada = tarefasVisiveis.findIndex((t) => t.id === tarefaAtualId);
  const posicao = posicaoEncontrada >= 0 ? posicaoEncontrada : 0;
  const tarefa = tarefasVisiveis[posicao];

  if (!tarefa) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="py-16">
          <EstadoVazio
            icone={<ClipboardList />}
            titulo="Tarefa não encontrada"
            texto="Nenhuma tarefa corresponde ao filtro selecionado."
            acao={
              <ActionButton onClick={() => aplicarFiltro({ nivel: TODOS, habilidade: TODOS }, "pendente")}>
                Mostrar todas as tarefas
              </ActionButton>
            }
          />
        </div>
      </MainLayout>
    );
  }

  const handlePontuacao = (pontuacao: number) => {
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
    const novasRespostas = {
      ...respostas,
      [tarefa.id]: {
        pontuacao: respostas[tarefa.id]?.pontuacao ?? null,
        observacao,
      },
    };
    setRespostas(novasRespostas);
    salvarResposta(tarefa.id, novasRespostas[tarefa.id].pontuacao, observacao);
  };

  const respostasPreenchidas = todasTarefas.filter((t) => estaRespondida(respostas, t.id)).length;
  const respondidasNoFiltro = tarefasVisiveis.filter((t) => estaRespondida(respostas, t.id)).length;
  const progresso = Math.round((respostasPreenchidas / todasTarefas.length) * 100);
  const progressoFiltro = Math.round((respondidasNoFiltro / tarefasVisiveis.length) * 100);
  const rotuloSelecao = filtro.habilidade !== TODOS ? "Nesta atividade" : "Neste nível";

  const respondida = estaRespondida(respostas, tarefa.id);
  const ehUltimaDoFiltro = posicao === tarefasVisiveis.length - 1;

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

  const classeFiltro = "h-9 w-full rounded-full border-hairline bg-surface-muted text-[0.8rem]";

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
          <Panel icone={<ClipboardList />} titulo={<>Tarefas da Avaliação ({tarefasVisiveis.length})</>}>
            {(mostrarNivel || mostrarHabilidade) && (
              <div className="mb-4 space-y-2">
                <div className={`grid gap-3 ${mostrarNivel && mostrarHabilidade ? "grid-cols-2" : "grid-cols-1"}`}>
                  {mostrarNivel && (
                    <div className="space-y-1.5">
                      <Label htmlFor="filtro-nivel" className="text-xs text-ink-3">
                        Nível
                      </Label>
                      <Select
                        value={filtro.nivel}
                        onValueChange={(v) => aplicarFiltro(trocarNivel(todasTarefas, filtro, v), "pendente")}
                      >
                        <SelectTrigger id="filtro-nivel" className={classeFiltro}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TODOS}>Todos os níveis</SelectItem>
                          {nivelOpcoes.map((o) => (
                            <SelectItem key={o.valor} value={o.valor}>
                              {o.rotulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {mostrarHabilidade && (
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="filtro-atividade" className="text-xs text-ink-3">
                        Atividade
                      </Label>
                      <Select
                        value={filtro.habilidade}
                        onValueChange={(v) => aplicarFiltro({ ...filtro, habilidade: v }, "pendente")}
                      >
                        <SelectTrigger id="filtro-atividade" className={classeFiltro}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TODOS}>Todas as atividades</SelectItem>
                          {habilidadeOpcoes.map((o) => (
                            <SelectItem key={o.valor} value={o.valor}>
                              {o.rotulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <p className="text-xs text-ink-3" aria-live="polite">
                  {filtroAtivo
                    ? `Exibindo ${tarefasVisiveis.length} de ${todasTarefas.length} tarefas`
                    : `Exibindo todas as ${todasTarefas.length} tarefas`}
                </p>
              </div>
            )}

            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1 xl:grid xl:max-h-[30rem] xl:grid-cols-3 xl:overflow-y-auto">
              {tarefasVisiveis.map((trf, idx) => {
                const tarefaRespondida = estaRespondida(respostas, trf.id);
                const isAtual = trf.id === tarefa.id;

                return (
                  <button
                    key={trf.id}
                    type="button"
                    aria-current={isAtual ? "step" : undefined}
                    onClick={() => setTarefaAtualId(trf.id)}
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

            <div className="mt-5 space-y-3 border-t border-hairline pt-4">
              {filtroAtivo && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-3">{rotuloSelecao}</span>
                    <span className="tabular font-medium text-ink-2">
                      {respondidasNoFiltro} de {tarefasVisiveis.length}
                    </span>
                  </div>
                  <Progress
                    value={progressoFiltro}
                    aria-label={`${rotuloSelecao}: ${respondidasNoFiltro} de ${tarefasVisiveis.length} tarefas respondidas`}
                    className="h-1.5 bg-surface-sunken [&>[data-slot=progress-indicator]]:rounded-full [&>[data-slot=progress-indicator]]:bg-brand/60"
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-3">Progresso da Avaliação</span>
                  <span className="tabular font-semibold text-ink">
                    {respostasPreenchidas} de {todasTarefas.length} tarefas
                  </span>
                </div>
                <Progress
                  value={progresso}
                  aria-label={`Avaliação: ${respostasPreenchidas} de ${todasTarefas.length} tarefas respondidas`}
                  className="h-2 bg-surface-sunken [&>[data-slot=progress-indicator]]:rounded-full [&>[data-slot=progress-indicator]]:bg-brand"
                />
              </div>

              {/* Sempre à mão: finalizar não depende de chegar à última tarefa */}
              <ActionButton className="w-full" onClick={() => setShowFinalizar(true)}>
                <CheckCircle2 />
                Finalizar Avaliação
              </ActionButton>
            </div>
          </Panel>

          <Panel
            titulo={
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-brand-soft px-3 py-1 text-[0.85rem] font-semibold text-brand">
                  Tarefa {posicao + 1}
                </span>
                {respondida && <CheckCircle2 className="size-5 text-success-ink" />}
              </span>
            }
            subtitulo={`${posicao + 1} de ${tarefasVisiveis.length}`}
            acoes={<div className="hidden flex-wrap justify-end gap-1.5 sm:flex">{marcadores}</div>}
            rodape={
              <>
                <ActionButton
                  variant="secondary"
                  onClick={() => setTarefaAtualId(tarefasVisiveis[Math.max(0, posicao - 1)].id)}
                  disabled={posicao === 0}
                >
                  <ArrowLeft />
                  Anterior
                </ActionButton>

                {!ehUltimaDoFiltro ? (
                  <ActionButton onClick={() => setTarefaAtualId(tarefasVisiveis[posicao + 1].id)}>
                    Próxima
                    <ArrowRight />
                  </ActionButton>
                ) : proximo ? (
                  // Fim da atividade: segue para a próxima em vez de parar
                  <ActionButton
                    onClick={() => aplicarFiltro(proximo, "primeira")}
                    aria-label={`Próxima: ${rotuloGrupo(proximo)}`}
                  >
                    <span className="max-w-[14rem] truncate">Próxima: {rotuloGrupo(proximo)}</span>
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
                Você respondeu {respostasPreenchidas} de {todasTarefas.length}{" "}
                tarefas.
                {respostasPreenchidas < todasTarefas.length && (
                  <span className="mt-2 block text-warning-ink">
                    Atenção: Existem {todasTarefas.length - respostasPreenchidas}{" "}
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
