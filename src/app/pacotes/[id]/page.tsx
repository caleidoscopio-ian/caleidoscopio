/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/page-loader";
import { PacoteFormDialog } from "@/components/pacotes/pacote-form-dialog";
import { Pencil, Clock, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Pacote } from "@/types/pacote";
import { TIPO_PACOTE_LABELS, STATUS_PACOTE_LABELS } from "@/types/pacote";
import { formatBRL, formatDuracao } from "@/types/procedimento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PageHeader,
  Panel,
  StatCard,
  GradeCampos,
  CampoInfo,
} from "@/components/kit";

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
          <p className="text-center py-16 text-muted-foreground">Pacote não encontrado.</p>
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
        <PageHeader
          className="mb-6"
          voltar={{ onClick: () => router.push("/procedimentos") }}
          avatar={
            pacote.cor ? (
              <span
                className="block size-11 rounded-[0.95rem]"
                style={{ backgroundColor: pacote.cor }}
              />
            ) : undefined
          }
          titulo={pacote.nome}
          meta={
            <>
              <Badge variant="outline" className="text-xs">
                {TIPO_PACOTE_LABELS[pacote.tipo]}
              </Badge>
              <Badge
                variant={pacote.status === "ATIVO" ? "default" : "destructive"}
                className="text-xs"
              >
                {STATUS_PACOTE_LABELS[pacote.status]}
              </Badge>
              {desconto > 0 && (
                <Badge className="text-xs bg-success-soft text-success-ink">
                  {desconto}% off
                </Badge>
              )}
            </>
          }
          acoes={
            <Button size="sm" onClick={() => setEditando(true)} disabled={!pacote.ativo}>
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
          }
        />

        {/* Stats */}
        <div className="anim-escalonada mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
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
            <TabsTrigger value="composicao">Composição</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* Dados Gerais */}
          <TabsContent value="dados">
            <Panel icone={<Package />} titulo="Dados Gerais">
              <GradeCampos colunas={2}>
                <CampoInfo rotulo="Nome" valor={pacote.nome} />
                <CampoInfo rotulo="Tipo" valor={TIPO_PACOTE_LABELS[pacote.tipo]} />
                <CampoInfo rotulo="Valor total" valor={formatBRL(valorTotal)} />
                <CampoInfo
                  rotulo="Valor particular"
                  valor={formatBRL(pacote.valor_particular)}
                />
                <CampoInfo
                  rotulo="Convênio"
                  valor={pacote.convenio?.nome_fantasia || pacote.convenio?.razao_social}
                />
                <CampoInfo
                  rotulo="Validade"
                  valor={pacote.validade_dias ? `${pacote.validade_dias} dias` : null}
                />
                <CampoInfo rotulo="Descrição" valor={pacote.descricao} larguraTotal />
                <CampoInfo rotulo="Observações" valor={pacote.observacoes} larguraTotal />
              </GradeCampos>
            </Panel>
          </TabsContent>

          {/* Composição */}
          <TabsContent value="composicao">
            <Panel titulo="Procedimentos do Pacote">
              {!pacote.procedimentos?.length ? (
                <p className="text-center py-8 text-sm text-muted-foreground">Nenhum procedimento neste pacote.</p>
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
                              {item.procedimento?.cor && (
                                <span className="h-4 w-4 rounded block" style={{ backgroundColor: item.procedimento.cor }} />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{item.procedimento?.nome ?? "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDuracao(item.procedimento?.duracao_padrao ?? null)}
                            </TableCell>
                            <TableCell className="font-mono">{item.quantidade}×</TableCell>
                            <TableCell>{formatBRL(item.procedimento?.valor ?? null)}</TableCell>
                            <TableCell className="font-medium">{formatBRL(subtotal)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {valorOriginal && (
                    <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Soma dos procedimentos:</span><span>{formatBRL(valorOriginal)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
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
          <TabsContent value="historico">
            <Panel titulo="Histórico de Alterações">
              {!pacote.historicos?.length ? (
                <p className="text-center py-8 text-sm text-muted-foreground">Nenhum histórico registrado.</p>
              ) : (
                <div className="space-y-3">
                  {pacote.historicos.map((h) => (
                    <div key={h.id} className="flex gap-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline" className="text-xs">{h.tipo_alteracao}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            {" · "}{h.usuario_nome}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5">{h.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </TabsContent>
        </Tabs>

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
