/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/page-loader";
import { PacoteFormDialog } from "@/components/pacotes/pacote-form-dialog";
import { ArrowLeft, Pencil, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Pacote } from "@/types/pacote";
import { TIPO_PACOTE_LABELS, STATUS_PACOTE_LABELS } from "@/types/pacote";
import { formatBRL, formatDuracao } from "@/types/procedimento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => router.push("/procedimentos")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-3 flex-1">
            {pacote.cor && (
              <span className="h-10 w-10 rounded-lg shrink-0" style={{ backgroundColor: pacote.cor }} />
            )}
            <div>
              <h1 className="text-2xl font-bold">{pacote.nome}</h1>
              <div className="flex gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs">{TIPO_PACOTE_LABELS[pacote.tipo]}</Badge>
                <Badge variant={pacote.status === "ATIVO" ? "default" : "destructive"} className="text-xs">
                  {STATUS_PACOTE_LABELS[pacote.status]}
                </Badge>
                {desconto > 0 && (
                  <Badge className="text-xs bg-green-100 text-green-700">{desconto}% off</Badge>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => setEditando(true)} disabled={!pacote.ativo}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Valor do Pacote</p>
            <p className="text-xl font-bold">{formatBRL(valorTotal)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Valor Original</p>
            <p className="text-xl font-bold">{valorOriginal ? formatBRL(valorOriginal) : "—"}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total de Sessões</p>
            <p className="text-xl font-bold">{pacote.total_sessoes ?? "—"}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Validade</p>
            <p className="text-xl font-bold">{pacote.validade_dias ? `${pacote.validade_dias}d` : "—"}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="dados">
          <TabsList className="mb-4">
            <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
            <TabsTrigger value="composicao">Composição</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* Dados Gerais */}
          <TabsContent value="dados">
            <Card>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{pacote.nome}</p></div>
                <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium">{TIPO_PACOTE_LABELS[pacote.tipo]}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor Total</p><p className="font-medium">{formatBRL(valorTotal)}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor Particular</p><p className="font-medium">{formatBRL(pacote.valor_particular)}</p></div>
                <div><p className="text-xs text-muted-foreground">Convênio</p><p className="font-medium">{pacote.convenio?.nome_fantasia || pacote.convenio?.razao_social || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Validade</p><p className="font-medium">{pacote.validade_dias ? `${pacote.validade_dias} dias` : "—"}</p></div>
                {pacote.descricao && (
                  <div className="col-span-2"><p className="text-xs text-muted-foreground mb-1">Descrição</p><p>{pacote.descricao}</p></div>
                )}
                {pacote.observacoes && (
                  <div className="col-span-2"><p className="text-xs text-muted-foreground mb-1">Observações</p><p className="text-muted-foreground">{pacote.observacoes}</p></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Composição */}
          <TabsContent value="composicao">
            <Card>
              <CardHeader><CardTitle className="text-base">Procedimentos do Pacote</CardTitle></CardHeader>
              <CardContent>
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
                          <div className="flex justify-between text-green-600">
                            <span>Economia:</span>
                            <span>{formatBRL(valorOriginal - valorTotal)} ({desconto}% off)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="historico">
            <Card>
              <CardHeader><CardTitle className="text-base">Histórico de Alterações</CardTitle></CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
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
