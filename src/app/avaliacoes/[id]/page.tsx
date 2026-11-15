"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ClipboardCheck,
  Edit,
  Gauge,
  Layers,
  ListChecks,
  Target,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  ActionButton,
  Carregando,
  EstadoVazio,
  NumeroOrdem,
  PageHeader,
  Panel,
  StatusPill,
} from "@/components/kit";

interface Nivel {
  id: string;
  ordem: number;
  descricao: string;
  faixa_etaria?: string;
}

interface Habilidade {
  id: string;
  ordem: number;
  habilidade: string;
}

interface Pontuacao {
  id: string;
  ordem: number;
  tipo: string;
  valor: number;
}

interface Tarefa {
  id: string;
  pergunta: string;
  descricao?: string;
  criterios_pontuacao?: string;
  numero?: number | null;
  nivel?: { descricao: string };
  habilidade?: { habilidade: string };
}

interface Avaliacao {
  id: string;
  tipo: string;
  nome: string;
  observacao?: string;
  createdAt: string;
  niveis: Nivel[];
  habilidades: Habilidade[];
  pontuacoes: Pontuacao[];
  tarefas: Tarefa[];
}

const TIPOS_PONTUACAO: Record<string, string> = {
  SEMPRE_100: "Sempre (100%)",
  FREQUENTEMENTE_75: "Frequentemente (75%)",
  AS_VEZES_50: "Às Vezes (50%)",
  RARAMENTE_25: "Raramente (25%)",
  NUNCA_0: "Nunca (0%)",
  NAO_SE_APLICA: "Não se Aplica",
};

/** Contagem na aba — pílula da marca. */
function Contagem({ n }: { n: number }) {
  return (
    <span className="tabular ml-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[0.7rem] font-semibold text-brand">
      {n}
    </span>
  );
}

function VisualizarAvaliacaoPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const avaliacaoId = params.id as string;

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Visualizar" },
  ];

  useEffect(() => {
    const fetchAvaliacao = async () => {
      try {
        setLoading(true);
        if (!user) return;

        const userDataEncoded = btoa(JSON.stringify(user));
        const response = await fetch(`/api/avaliacoes?id=${avaliacaoId}`, {
          headers: {
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        const result = await response.json();

        if (result.success) {
          setAvaliacao(result.data);
        } else {
          setError(result.error || "Erro ao carregar avaliação");
        }
      } catch (error) {
        console.error("Erro:", error);
        setError("Erro ao carregar avaliação");
      } finally {
        setLoading(false);
      }
    };

    fetchAvaliacao();
  }, [avaliacaoId, user]);

  const traduzirTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      AQUISICAO_HABILIDADES: "Aquisição de Habilidades",
      REDUCAO_COMPORTAMENTOS: "Redução de Comportamentos",
    };
    return tipos[tipo] || tipo;
  };

  if (loading) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <Carregando texto="Carregando avaliação..." className="py-24" />
      </MainLayout>
    );
  }

  if (error || !avaliacao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="py-16">
          <EstadoVazio
            icone={<AlertCircle />}
            titulo={error || "Avaliação não encontrada"}
            acao={
              <ActionButton variant="secondary" onClick={() => router.push("/avaliacoes")}>
                Voltar para Avaliações
              </ActionButton>
            }
          />
        </div>
      </MainLayout>
    );
  }

  const tomTipo = avaliacao.tipo === "AQUISICAO_HABILIDADES" ? "info" : "violet";

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-7">
        <PageHeader
          voltar={{ onClick: () => router.push("/avaliacoes") }}
          titulo={
            <span className="inline-flex flex-wrap items-center gap-3">
              {avaliacao.nome}
              <StatusPill tom={tomTipo}>{traduzirTipo(avaliacao.tipo)}</StatusPill>
            </span>
          }
          subtitulo={[
            [avaliacao.tarefas.length, "tarefa", "tarefas"],
            [avaliacao.niveis.length, "nível", "níveis"],
            [avaliacao.habilidades.length, "habilidade", "habilidades"],
          ]
            .map(([n, um, varios]) => `${n} ${n === 1 ? um : varios}`)
            .join(" · ")}
          acoes={
            <ActionButton onClick={() => router.push(`/avaliacoes/${avaliacaoId}/editar`)}>
              <Edit />
              Editar
            </ActionButton>
          }
        />

        {/* Informações Gerais: blocos com microetiqueta, como no v2 */}
        <Panel icone={<ClipboardCheck />} titulo="Informações Gerais">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 rounded-2xl bg-surface-muted p-4">
              <p className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                Tipo de Avaliação
              </p>
              <StatusPill tom={tomTipo}>{traduzirTipo(avaliacao.tipo)}</StatusPill>
            </div>
            <div className="space-y-1.5 rounded-2xl bg-surface-muted p-4">
              <p className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                Criada em
              </p>
              <p className="tabular font-medium text-ink">
                {new Date(avaliacao.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            {avaliacao.observacao && (
              <div className="space-y-1.5 rounded-2xl bg-surface-muted p-4 sm:col-span-2">
                <p className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                  Observação
                </p>
                <p className="text-sm whitespace-pre-wrap text-ink-2">{avaliacao.observacao}</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Abas na largura toda — é como o v2 desenha esta tela */}
        <Tabs defaultValue="niveis">
          <TabsList className="w-full">
            <TabsTrigger value="niveis" className="flex-1">
              Níveis <Contagem n={avaliacao.niveis.length} />
            </TabsTrigger>
            <TabsTrigger value="habilidades" className="flex-1">
              Habilidades <Contagem n={avaliacao.habilidades.length} />
            </TabsTrigger>
            <TabsTrigger value="pontuacao" className="flex-1">
              Pontuação <Contagem n={avaliacao.pontuacoes.length} />
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="flex-1">
              Tarefas <Contagem n={avaliacao.tarefas.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="niveis" className="mt-5">
            <Panel
              icone={<Layers />}
              titulo="Níveis da Avaliação"
              subtitulo="Níveis de desenvolvimento cadastrados"
            >
              {avaliacao.niveis.length === 0 ? (
                <EstadoVazio icone={<Layers />} titulo="Nenhum nível cadastrado" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Ordem</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Faixa Etária</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {avaliacao.niveis.map((nivel) => (
                      <TableRow key={nivel.id}>
                        <TableCell>
                          <NumeroOrdem n={nivel.ordem} />
                        </TableCell>
                        <TableCell className="font-semibold text-ink">{nivel.descricao}</TableCell>
                        <TableCell>
                          {nivel.faixa_etaria ? (
                            <StatusPill tom="neutral">{nivel.faixa_etaria}</StatusPill>
                          ) : (
                            <span className="text-ink-4">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="habilidades" className="mt-5">
            <Panel
              icone={<Target />}
              titulo="Habilidades da Avaliação"
              subtitulo="Habilidades a serem avaliadas"
            >
              {avaliacao.habilidades.length === 0 ? (
                <EstadoVazio icone={<Target />} titulo="Nenhuma habilidade cadastrada" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Ordem</TableHead>
                      <TableHead>Habilidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {avaliacao.habilidades.map((habilidade) => (
                      <TableRow key={habilidade.id}>
                        <TableCell>
                          <NumeroOrdem n={habilidade.ordem} />
                        </TableCell>
                        <TableCell className="font-semibold text-ink">{habilidade.habilidade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="pontuacao" className="mt-5">
            <Panel
              icone={<Gauge />}
              titulo="Sistema de Pontuação"
              subtitulo="Escala de pontuação da avaliação"
            >
              {avaliacao.pontuacoes.length === 0 ? (
                <EstadoVazio icone={<Gauge />} titulo="Nenhuma pontuação cadastrada" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Ordem</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {avaliacao.pontuacoes.map((pontuacao) => (
                      <TableRow key={pontuacao.id}>
                        <TableCell>
                          <NumeroOrdem n={pontuacao.ordem} />
                        </TableCell>
                        <TableCell className="font-medium text-ink">
                          {TIPOS_PONTUACAO[pontuacao.tipo] || pontuacao.tipo}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular font-semibold text-brand">
                            {pontuacao.valor === -1 ? "N/A" : `${pontuacao.valor}%`}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="tarefas" className="mt-5">
            <Panel
              icone={<ListChecks />}
              titulo="Tarefas da Avaliação"
              subtitulo="Perguntas e critérios de avaliação"
            >
              {avaliacao.tarefas.length === 0 ? (
                <EstadoVazio icone={<ListChecks />} titulo="Nenhuma tarefa cadastrada" />
              ) : (
                <ol className="space-y-2.5">
                  {avaliacao.tarefas.map((tarefa, index) => (
                    <li key={tarefa.id} className="rounded-2xl bg-surface-muted p-4">
                      <div className="flex items-start gap-3">
                        <NumeroOrdem n={index + 1} />
                        <div className="min-w-0 flex-1 space-y-2.5">
                          <p className="pt-1 font-semibold text-ink">{tarefa.pergunta}</p>
                          {(tarefa.nivel || tarefa.habilidade || tarefa.numero != null) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {tarefa.nivel && (
                                <StatusPill tom="info">Nível: {tarefa.nivel.descricao}</StatusPill>
                              )}
                              {tarefa.habilidade && (
                                <StatusPill tom="violet">
                                  Habilidade: {tarefa.habilidade.habilidade}
                                </StatusPill>
                              )}
                              {tarefa.numero != null && (
                                <StatusPill tom="neutral">Número: {tarefa.numero}</StatusPill>
                              )}
                            </div>
                          )}
                          {tarefa.descricao && (
                            <div className="space-y-1">
                              <p className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                                Descrição
                              </p>
                              <p className="text-sm whitespace-pre-wrap text-ink-2">{tarefa.descricao}</p>
                            </div>
                          )}
                          {tarefa.criterios_pontuacao && (
                            <div className="space-y-1">
                              <p className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                                Critérios de Pontuação
                              </p>
                              <p className="text-sm whitespace-pre-wrap text-ink-2">
                                {tarefa.criterios_pontuacao}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function VisualizarAvaliacaoPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'avaliacoes', action: 'VIEW' }}>
      <VisualizarAvaliacaoPageContent />
    </ProtectedRoute>
  );
}
