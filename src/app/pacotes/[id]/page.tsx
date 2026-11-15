/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/page-loader";
import { PacoteFormDialog } from "@/components/pacotes/pacote-form-dialog";
import {
  Clock,
  FileText,
  ListChecks,
  Package,
  Pencil,
  StickyNote,
  Wallet,
  History as HistoryIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Pacote } from "@/types/pacote";
import { TIPO_PACOTE_LABELS, STATUS_PACOTE_LABELS } from "@/types/pacote";
import { formatBRL, formatDuracao } from "@/types/procedimento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ActionButton,
  EstadoVazio,
  LinhaDado,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
} from "@/components/kit";

/** Contagem na aba — pílula da marca, como no v2. */
function Contagem({ n }: { n: number }) {
  return (
    <span className="tabular ml-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[0.7rem] font-semibold text-brand">
      {n}
    </span>
  );
}

interface PacoteDetalhe extends Pacote {
  historicos?: Array<{
    id: string
    tipo_alteracao: string
    descricao: string
    usuario_nome: string
    createdAt: string
  }>
}

export default function PacoteDetalhePage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [pacote, setPacote] = useState<PacoteDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Procedimentos", href: "/procedimentos" },
    { label: "Pacotes", href: "/procedimentos?tab=pacotes" },
    { label: pacote?.nome ?? "Detalhe" },
  ];

  const authHeaders = useCallback(() => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
  }), [user]);

  const fetchPacote = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`/api/pacotes/${id}`, { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setPacote(d.data);
      else throw new Error(d.error);
    } catch (e) {
      toast({ title: "Erro ao carregar", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, user, authHeaders, toast]);

  useEffect(() => {
    if (isAuthenticated && user) fetchPacote();
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "procedimentos", action: "VIEW" }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <PageLoader message="Carregando pacote..." />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!pacote) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "procedimentos", action: "VIEW" }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="py-16">
            <EstadoVazio
              icone={<Package />}
              titulo="Pacote não encontrado"
              texto="Ele pode ter sido removido ou o link está incorreto"
            />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const valorOriginal = pacote.valor_original ? Number(pacote.valor_original) : null;
  const valorTotal = Number(pacote.valor_total);
  const desconto = valorOriginal && valorOriginal > valorTotal
    ? Math.round((1 - valorTotal / valorOriginal) * 100)
    : 0;

  return (
    <ProtectedRoute requiredPermission={{ resource: "procedimentos", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-7">
        <PageHeader
          voltar={{ onClick: () => router.push("/procedimentos") }}
          avatar={
            <span
              className="grid size-12 place-items-center rounded-2xl"
              style={{ backgroundColor: pacote.cor || "var(--brand)" }}
            >
              <Package className="size-5 text-white" />
            </span>
          }
          titulo={
            <span className="inline-flex flex-wrap items-center gap-3">
              {pacote.nome}
              <StatusPill
                tom={pacote.status === "ATIVO" ? "success" : pacote.status === "ESGOTADO" ? "warning" : "neutral"}
                ponto
              >
                {STATUS_PACOTE_LABELS[pacote.status]}
              </StatusPill>
            </span>
          }
          subtitulo={[
            TIPO_PACOTE_LABELS[pacote.tipo],
            pacote.convenio?.nome_fantasia || pacote.convenio?.razao_social,
          ]
            .filter(Boolean)
            .join(" · ")}
          meta={
            desconto > 0 ? (
              <StatusPill tom="success">{desconto}% off</StatusPill>
            ) : undefined
          }
          acoes={
            <ActionButton variant="secondary" onClick={() => setEditando(true)} disabled={!pacote.ativo}>
              <Pencil /> Editar
            </ActionButton>
          }
        />

        {/* Stats */}
        <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <StatCard tom="blue" size="hero" rotulo="Valor do Pacote" valor={formatBRL(valorTotal)} />
          <StatCard
            tom="lavender"
            rotulo="Valor Original"
            valor={valorOriginal ? formatBRL(valorOriginal) : "—"}
          />
          <StatCard tom="mint" rotulo="Total de Sessões" valor={pacote.total_sessoes ?? "—"} />
          <StatCard
            tom="peach"
            rotulo="Validade"
            valor={pacote.validade_dias ? `${pacote.validade_dias}d` : "—"}
          />
        </div>

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
            <TabsTrigger value="composicao">
              Composição
              {!!pacote.procedimentos?.length && <Contagem n={pacote.procedimentos.length} />}
            </TabsTrigger>
            <TabsTrigger value="historico">
              Histórico
              {!!pacote.historicos?.length && <Contagem n={pacote.historicos.length} />}
            </TabsTrigger>
          </TabsList>

          {/* Dados Gerais */}
          <TabsContent value="dados" className="mt-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Panel icone={<Package />} titulo="Identificação">
                <LinhaDado rotulo="Nome">{pacote.nome}</LinhaDado>
                <LinhaDado rotulo="Tipo">{TIPO_PACOTE_LABELS[pacote.tipo]}</LinhaDado>
                <LinhaDado rotulo="Convênio">
                  {pacote.convenio?.nome_fantasia || pacote.convenio?.razao_social}
                </LinhaDado>
                <LinhaDado rotulo="Validade">
                  {pacote.validade_dias ? `${pacote.validade_dias} dias` : null}
                </LinhaDado>
              </Panel>
              <Panel icone={<Wallet />} titulo="Valores">
                <LinhaDado rotulo="Valor total">
                  <span className="tabular">{formatBRL(valorTotal)}</span>
                </LinhaDado>
                <LinhaDado rotulo="Valor particular">
                  <span className="tabular">{formatBRL(pacote.valor_particular)}</span>
                </LinhaDado>
                <LinhaDado rotulo="Soma dos procedimentos">
                  {valorOriginal ? <span className="tabular">{formatBRL(valorOriginal)}</span> : null}
                </LinhaDado>
                <LinhaDado rotulo="Desconto">{desconto > 0 ? `${desconto}%` : null}</LinhaDado>
              </Panel>
              <Panel icone={<FileText />} titulo="Descrição">
                {pacote.descricao ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-2">{pacote.descricao}</p>
                ) : (
                  <p className="text-sm text-ink-3">Nenhuma descrição</p>
                )}
              </Panel>
              <Panel icone={<StickyNote />} titulo="Observações">
                {pacote.observacoes ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-2">{pacote.observacoes}</p>
                ) : (
                  <p className="text-sm text-ink-3">Nenhuma observação</p>
                )}
              </Panel>
            </div>
          </TabsContent>

          {/* Composição */}
          <TabsContent value="composicao" className="mt-5">
            <Panel icone={<ListChecks />} titulo="Procedimentos do Pacote">
              {!pacote.procedimentos?.length ? (
                <EstadoVazio icone={<ListChecks />} titulo="Pacote vazio" texto="Nenhum procedimento neste pacote" />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Procedimento</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Valor Unit.</TableHead>
                        <TableHead>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pacote.procedimentos.map((item) => {
                        const subtotal = item.procedimento?.valor
                          ? Number(item.procedimento.valor) * item.quantidade
                          : null;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <span
                                className="block size-3 rounded-full"
                                style={{ backgroundColor: item.procedimento?.cor || "var(--ink-4)" }}
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-ink">{item.procedimento?.nome ?? "—"}</TableCell>
                            <TableCell>
                              <span className="tabular text-[0.82rem] text-ink-3">
                                {formatDuracao(item.procedimento?.duracao_padrao ?? null)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusPill tom="info">{item.quantidade}×</StatusPill>
                            </TableCell>
                            <TableCell className="tabular">{formatBRL(item.procedimento?.valor ?? null)}</TableCell>
                            <TableCell className="tabular font-semibold text-ink">{formatBRL(subtotal)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {valorOriginal && (
                    <div className="mt-4 space-y-1.5 rounded-2xl bg-surface-muted p-4 text-sm">
                      <div className="flex justify-between text-ink-3">
                        <span>Soma dos procedimentos:</span><span>{formatBRL(valorOriginal)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-ink">
                        <span>Valor do pacote:</span><span>{formatBRL(valorTotal)}</span>
                      </div>
                      {desconto > 0 && (
                        <div className="flex justify-between text-success-ink">
                          <span>Economia:</span>
                          <span>{formatBRL(valorOriginal - valorTotal)} ({desconto}% off)</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </Panel>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="historico" className="mt-5">
            <Panel icone={<HistoryIcon />} titulo="Histórico de Alterações">
              {!pacote.historicos?.length ? (
                <EstadoVazio icone={<Clock />} titulo="Nenhum histórico registrado" />
              ) : (
                <ol className="relative space-y-4 before:absolute before:top-3 before:bottom-3 before:left-[7px] before:w-px before:bg-hairline">
                  {pacote.historicos.map((h) => (
                    <li key={h.id} className="relative pl-8">
                      <span
                        aria-hidden
                        className="absolute top-5 left-0 size-[15px] rounded-full border-[3px] border-surface bg-brand shadow-[0_0_0_1px_var(--hairline)]"
                      />
                      <div className="rounded-2xl bg-surface-muted p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <StatusPill tom="info">{h.tipo_alteracao}</StatusPill>
                            {h.descricao && (
                              <p className="mt-2 text-sm whitespace-pre-wrap text-ink-2">{h.descricao}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-[0.75rem] text-ink-3 sm:text-right">
                            <p className="font-medium text-ink-2">{h.usuario_nome}</p>
                            <p className="tabular">
                              {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
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

        <PacoteFormDialog
          pacote={pacote}
          open={editando}
          onOpenChange={setEditando}
          onSuccess={fetchPacote}
        />
      </MainLayout>
    </ProtectedRoute>
  );
}
