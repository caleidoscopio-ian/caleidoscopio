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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  FileText,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditarConvenioDialog } from "@/components/convenios/editar-convenio-dialog";
import { ConvenioTabelaForm } from "@/components/convenios/convenio-tabela-form";
import { ConvenioTissForm } from "@/components/convenios/convenio-tiss-form";
import { ConvenioHistoricoNota } from "@/components/convenios/convenio-historico-nota";
import type { Convenio, ConvenioTabela, ConvenioAnexo, ConvenioHistorico } from "@/types/convenio";
import {
  STATUS_CONVENIO_LABELS,
  TIPO_CONVENIO_LABELS,
  TIPO_GUIA_TISS_LABELS,
  TIPO_CONVENIO_ANEXO_LABELS,
  TIPO_HISTORICO_LABELS,
} from "@/types/convenio";

export default function ConvenioDetalhePage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [convenio, setConvenio] = useState<Convenio | null>(null);
  const [tabela, setTabela] = useState<ConvenioTabela[]>([]);
  const [anexos, setAnexos] = useState<ConvenioAnexo[]>([]);
  const [historico, setHistorico] = useState<ConvenioHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabelaLoading, setTabelaLoading] = useState(true);
  const [anexosLoading, setAnexosLoading] = useState(true);
  const [historicoLoading, setHistoricoLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [tabelaForm, setTabelaForm] = useState<{ open: boolean; item?: ConvenioTabela | null }>({ open: false });
  const [uploadLoading, setUploadLoading] = useState(false);

  const authHeaders = useCallback(() => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
  }), [user]);

  const fetchConvenio = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/convenios/${id}`, { headers: authHeaders() });
      const result = await response.json();
      if (result.success) setConvenio(result.data);
      else throw new Error(result.error);
    } catch (error) {
      toast({ title: "Erro ao carregar convênio", description: String(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, user, authHeaders, toast]);

  const fetchTabela = useCallback(async () => {
    if (!user) return;
    setTabelaLoading(true);
    try {
      const response = await fetch(`/api/convenios/${id}/tabela`, { headers: authHeaders() });
      const result = await response.json();
      if (result.success) setTabela(result.data);
    } finally {
      setTabelaLoading(false);
    }
  }, [id, user, authHeaders]);

  const fetchAnexos = useCallback(async () => {
    if (!user) return;
    setAnexosLoading(true);
    try {
      const response = await fetch(`/api/convenios/${id}/anexos`, { headers: authHeaders() });
      const result = await response.json();
      if (result.success) setAnexos(result.data);
    } finally {
      setAnexosLoading(false);
    }
  }, [id, user, authHeaders]);

  const fetchHistorico = useCallback(async () => {
    if (!user) return;
    setHistoricoLoading(true);
    try {
      const response = await fetch(`/api/convenios/${id}/historico`, { headers: authHeaders() });
      const result = await response.json();
      if (result.success) setHistorico(result.data);
    } finally {
      setHistoricoLoading(false);
    }
  }, [id, user, authHeaders]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchConvenio();
      fetchTabela();
      fetchAnexos();
      fetchHistorico();
    }
  }, [isAuthenticated, user]);

  const handleRemoverProcedimento = async (itemId: string) => {
    if (!user) return;
    const response = await fetch(`/api/convenios/${id}/tabela?itemId=${itemId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const result = await response.json();
    if (result.success) {
      toast({ title: "Procedimento removido" });
      fetchTabela();
    }
  };

  const handleRemoverAnexo = async (anexoId: string) => {
    if (!user) return;
    const response = await fetch(`/api/convenios/${id}/anexos?anexoId=${anexoId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const result = await response.json();
    if (result.success) {
      toast({ title: "Anexo excluído" });
      fetchAnexos();
    }
  };

  const handleUploadAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResp = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const uploadResult = await uploadResp.json();
      if (!uploadResp.ok) throw new Error(uploadResult.error || "Erro no upload");

      await fetch(`/api/convenios/${id}/anexos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          tipo: "CONTRATO",
          titulo: file.name,
          arquivo_url: uploadResult.url,
          arquivo_nome: uploadResult.fileName,
          arquivo_tipo: uploadResult.fileType,
          arquivo_size: uploadResult.fileSize,
        }),
      });

      toast({ title: "Arquivo anexado com sucesso!" });
      fetchAnexos();
    } catch (error) {
      toast({ title: "Erro no upload", description: String(error), variant: "destructive" });
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const formatarBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const formatarDataHora = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const formatarCNPJ = (cnpj: string) => {
    const l = cnpj.replace(/\D/g, "");
    return l.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  if (loading) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "convenios", action: "VIEW" }}>
        <MainLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Convênios", href: "/convenios" }, { label: "..." }]}>
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!convenio) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "convenios", action: "VIEW" }}>
        <MainLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Convênios", href: "/convenios" }, { label: "Não encontrado" }]}>
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Convênio não encontrado.</p>
            <Button variant="outline" onClick={() => router.push("/convenios")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Convênios", href: "/convenios" },
    { label: convenio.razao_social },
  ];

  return (
    <ProtectedRoute requiredPermission={{ resource: "convenios", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/convenios")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{convenio.razao_social}</h1>
                  <Badge variant={convenio.status === "ATIVO" ? "default" : "secondary"}>
                    {STATUS_CONVENIO_LABELS[convenio.status]}
                  </Badge>
                </div>
                {convenio.nome_fantasia && (
                  <p className="text-muted-foreground">{convenio.nome_fantasia}</p>
                )}
                <p className="text-sm text-muted-foreground font-mono">{formatarCNPJ(convenio.cnpj)}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="dados">
            <TabsList>
              <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
              <TabsTrigger value="tabela">
                Tabela de Valores
                {tabela.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{tabela.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tiss">TISS/SADT</TabsTrigger>
              <TabsTrigger value="anexos">
                Anexos
                {anexos.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{anexos.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="historico">
                Histórico
                {historico.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{historico.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ==================== DADOS GERAIS ==================== */}
            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Identificação</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo</span>
                      <span>{TIPO_CONVENIO_LABELS[convenio.tipo]}</span>
                    </div>
                    {convenio.registro_ans && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Registro ANS</span>
                        <span className="font-mono">{convenio.registro_ans}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cadastrado em</span>
                      <span>{formatarData(convenio.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Contato</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {convenio.telefone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Telefone</span>
                        <span>{convenio.telefone}</span>
                      </div>
                    )}
                    {convenio.email && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">E-mail</span>
                        <span>{convenio.email}</span>
                      </div>
                    )}
                    {convenio.contato_nome && (
                      <>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Contato</span>
                          <span>{convenio.contato_nome}</span>
                        </div>
                        {convenio.contato_telefone && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tel. contato</span>
                            <span>{convenio.contato_telefone}</span>
                          </div>
                        )}
                      </>
                    )}
                    {!convenio.telefone && !convenio.email && !convenio.contato_nome && (
                      <p className="text-muted-foreground">Nenhum contato cadastrado</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Configurações Financeiras</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {convenio.prazo_pagamento_dias != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prazo de pagamento</span>
                        <span>{convenio.prazo_pagamento_dias} dias</span>
                      </div>
                    )}
                    {convenio.dia_fechamento != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dia de fechamento</span>
                        <span>Dia {convenio.dia_fechamento}</span>
                      </div>
                    )}
                    {convenio.dia_entrega_guias != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entrega de guias</span>
                        <span>Até dia {convenio.dia_entrega_guias}</span>
                      </div>
                    )}
                    {convenio.percentual_repasse != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Repasse</span>
                        <span>{convenio.percentual_repasse}%</span>
                      </div>
                    )}
                    {convenio.prazo_pagamento_dias == null && convenio.dia_fechamento == null && (
                      <p className="text-muted-foreground">Nenhuma configuração financeira</p>
                    )}
                  </CardContent>
                </Card>

                {convenio.observacoes && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Observações</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{convenio.observacoes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ==================== TABELA DE VALORES ==================== */}
            <TabsContent value="tabela" className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Procedimentos e Valores</h2>
                <Button size="sm" onClick={() => setTabelaForm({ open: true, item: null })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Procedimento
                </Button>
              </div>
              {tabelaLoading ? (
                <Card>
                  <CardContent className="p-0">
                    <div className="p-4 space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : tabela.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
                  <FileText className="h-8 w-8 mb-2 opacity-30" />
                  <p>Nenhum procedimento cadastrado</p>
                  <p className="text-sm">Clique em &quot;Adicionar Procedimento&quot; para começar</p>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Procedimento</TableHead>
                          <TableHead className="text-right">Valor Convênio</TableHead>
                          <TableHead className="text-right">Valor Particular</TableHead>
                          <TableHead>Tipo Guia</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tabela.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.codigo_procedimento}</TableCell>
                            <TableCell>{item.nome_procedimento}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatarMoeda(item.valor_convenio)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.valor_particular ? formatarMoeda(item.valor_particular) : "—"}
                            </TableCell>
                            <TableCell>
                              {item.tipo_guia ? (
                                <Badge variant="outline">{TIPO_GUIA_TISS_LABELS[item.tipo_guia]}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Padrão</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setTabelaForm({ open: true, item })}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleRemoverProcedimento(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ==================== TISS/SADT ==================== */}
            <TabsContent value="tiss" className="mt-4">
              <ConvenioTissForm convenio={convenio} onSuccess={fetchConvenio} />
            </TabsContent>

            {/* ==================== ANEXOS ==================== */}
            <TabsContent value="anexos" className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Documentos e Contratos</h2>
                <label>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadLoading}
                    onClick={() => document.getElementById("upload-anexo")?.click()}
                  >
                    {uploadLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Arquivo
                  </Button>
                  <input
                    id="upload-anexo"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={handleUploadAnexo}
                  />
                </label>
              </div>
              {anexosLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </div>
              ) : anexos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
                  <FileText className="h-8 w-8 mb-2 opacity-30" />
                  <p>Nenhum anexo cadastrado</p>
                  <p className="text-sm">Faça upload de contratos, tabelas e documentos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {anexos.map((anexo) => (
                    <div
                      key={anexo.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{anexo.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {TIPO_CONVENIO_ANEXO_LABELS[anexo.tipo]} · {formatarBytes(anexo.arquivo_size)} · {formatarData(anexo.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={anexo.arquivo_url} target="_blank" rel="noopener noreferrer">
                            Ver
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoverAnexo(anexo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ==================== HISTÓRICO ==================== */}
            <TabsContent value="historico" className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Histórico de Negociações</h2>
                <ConvenioHistoricoNota convenioId={id} onSuccess={fetchHistorico} />
              </div>
              {historicoLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                        <div className="space-y-1 text-right">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : historico.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
                  <Clock className="h-8 w-8 mb-2 opacity-30" />
                  <p>Nenhum registro no histórico</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {TIPO_HISTORICO_LABELS[item.tipo]}
                            </Badge>
                            <span className="font-medium text-sm">{item.titulo}</span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.descricao}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                          <p>{item.usuario_nome}</p>
                          <p>{formatarDataHora(item.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        {editando && (
          <EditarConvenioDialog
            convenio={convenio}
            open={editando}
            onOpenChange={(o) => !o && setEditando(false)}
            onSuccess={fetchConvenio}
          />
        )}
        <ConvenioTabelaForm
          convenioId={id}
          item={tabelaForm.item}
          open={tabelaForm.open}
          onOpenChange={(o) => setTabelaForm((prev) => ({ ...prev, open: o }))}
          onSuccess={fetchTabela}
        />
      </MainLayout>
    </ProtectedRoute>
  );
}
