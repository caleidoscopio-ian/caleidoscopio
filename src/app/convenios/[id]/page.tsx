/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Clock,
  FileText,
  FolderOpen,
  History as HistoryIcon,
  Link2,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Receipt,
  StickyNote,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditarConvenioDialog } from "@/components/convenios/editar-convenio-dialog";
import { ConvenioTabelaForm } from "@/components/convenios/convenio-tabela-form";
import { ConvenioTissForm } from "@/components/convenios/convenio-tiss-form";
import { ConvenioHistoricoNota } from "@/components/convenios/convenio-historico-nota";
import type {
  StatusConvenio,
  TipoHistoricoConvenio,
  Convenio,
  ConvenioTabela,
  ConvenioAnexo,
  ConvenioHistorico,
} from "@/types/convenio";
import {
  STATUS_CONVENIO_LABELS,
  TIPO_CONVENIO_LABELS,
  TIPO_GUIA_TISS_LABELS,
  TIPO_CONVENIO_ANEXO_LABELS,
  TIPO_HISTORICO_LABELS,
} from "@/types/convenio";
import {
  ActionButton,
  EstadoVazio,
  IconButton,
  LinhaDado,
  PageHeader,
  Panel,
  StatusPill,
  type TomStatus,
} from "@/components/kit";

const TOM_STATUS: Record<StatusConvenio, TomStatus> = {
  ATIVO: "success",
  INATIVO: "neutral",
  SUSPENSO: "danger",
  EM_NEGOCIACAO: "warning",
};

const TOM_HISTORICO: Record<TipoHistoricoConvenio, TomStatus> = {
  CRIACAO: "success",
  ALTERACAO_DADOS: "info",
  ALTERACAO_TABELA: "info",
  NEGOCIACAO: "violet",
  REAJUSTE: "warning",
  SUSPENSAO: "danger",
  REATIVACAO: "success",
  OBSERVACAO: "neutral",
};

/** Contagem na aba — pílula da marca, como no v2. */
function Contagem({ n }: { n: number }) {
  return (
    <span className="tabular ml-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[0.7rem] font-semibold text-brand">
      {n}
    </span>
  );
}

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
  const [tabelaForm, setTabelaForm] = useState<{
    open: boolean;
    item?: ConvenioTabela | null;
  }>({ open: false });
  const [uploadLoading, setUploadLoading] = useState(false);

  const authHeaders = useCallback(
    () => ({
      "X-User-Data": btoa(JSON.stringify(user)),
      "X-Auth-Token": user!.token,
    }),
    [user],
  );

  const fetchConvenio = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/convenios/${id}`, {
        headers: authHeaders(),
      });
      const result = await response.json();
      if (result.success) setConvenio(result.data);
      else throw new Error(result.error);
    } catch (error) {
      toast({
        title: "Erro ao carregar convênio",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, user, authHeaders, toast]);

  const fetchTabela = useCallback(async () => {
    if (!user) return;
    setTabelaLoading(true);
    try {
      const response = await fetch(`/api/convenios/${id}/tabela`, {
        headers: authHeaders(),
      });
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
      const response = await fetch(`/api/convenios/${id}/anexos`, {
        headers: authHeaders(),
      });
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
      const response = await fetch(`/api/convenios/${id}/historico`, {
        headers: authHeaders(),
      });
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
    const response = await fetch(
      `/api/convenios/${id}/tabela?itemId=${itemId}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );
    const result = await response.json();
    if (result.success) {
      toast({ title: "Procedimento removido" });
      fetchTabela();
    }
  };

  const handleRemoverAnexo = async (anexoId: string) => {
    if (!user) return;
    const response = await fetch(
      `/api/convenios/${id}/anexos?anexoId=${anexoId}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );
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
      if (!uploadResp.ok)
        throw new Error(uploadResult.error || "Erro no upload");

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
      toast({
        title: "Erro no upload",
        description: String(error),
        variant: "destructive",
      });
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
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatarDataHora = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);

  const formatarCNPJ = (cnpj: string) => {
    const l = cnpj.replace(/\D/g, "");
    return l.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  if (loading) {
    return (
      <ProtectedRoute
        requiredPermission={{ resource: "convenios", action: "VIEW" }}
      >
        <MainLayout
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Convênios", href: "/convenios" },
            { label: "..." },
          ]}
        >
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!convenio) {
    return (
      <ProtectedRoute
        requiredPermission={{ resource: "convenios", action: "VIEW" }}
      >
        <MainLayout
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Convênios", href: "/convenios" },
            { label: "Não encontrado" },
          ]}
        >
          <div className="py-16">
            <EstadoVazio
              icone={<AlertCircle />}
              titulo="Convênio não encontrado"
              texto="Ele pode ter sido removido ou o link está incorreto"
              acao={
                <ActionButton variant="secondary" onClick={() => router.push("/convenios")}>
                  <ArrowLeft />
                  Voltar para convênios
                </ActionButton>
              }
            />
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
    <ProtectedRoute
      requiredPermission={{ resource: "convenios", action: "VIEW" }}
    >
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-7">
          <PageHeader
            voltar={{ onClick: () => router.push("/convenios") }}
            titulo={
              <span className="inline-flex flex-wrap items-center gap-3">
                {convenio.razao_social}
                <StatusPill tom={TOM_STATUS[convenio.status]} ponto>
                  {STATUS_CONVENIO_LABELS[convenio.status]}
                </StatusPill>
              </span>
            }
            subtitulo={[convenio.nome_fantasia, formatarCNPJ(convenio.cnpj)]
              .filter(Boolean)
              .join(" · ")}
            acoes={
              <ActionButton variant="secondary" onClick={() => setEditando(true)}>
                <Pencil />
                Editar
              </ActionButton>
            }
          />

          <Tabs defaultValue="dados">
            <TabsList>
              <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
              <TabsTrigger value="tabela">
                Tabela de Valores
                {tabela.length > 0 && <Contagem n={tabela.length} />}
              </TabsTrigger>
              <TabsTrigger value="tiss">Regras de Guia (TISS)</TabsTrigger>
              <TabsTrigger value="anexos">
                Anexos
                {anexos.length > 0 && <Contagem n={anexos.length} />}
              </TabsTrigger>
              <TabsTrigger value="historico">
                Histórico
                {historico.length > 0 && <Contagem n={historico.length} />}
              </TabsTrigger>
            </TabsList>

            {/* ==================== DADOS GERAIS ==================== */}
            <TabsContent value="dados" className="mt-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Panel icone={<Building2 />} titulo="Identificação">
                  <LinhaDado rotulo="Tipo">
                    {TIPO_CONVENIO_LABELS[convenio.tipo]}
                  </LinhaDado>
                  {convenio.registro_ans && (
                    <LinhaDado rotulo="Registro ANS">
                      <span className="tabular">{convenio.registro_ans}</span>
                    </LinhaDado>
                  )}
                  <LinhaDado rotulo="CNPJ">
                    <span className="tabular">{formatarCNPJ(convenio.cnpj)}</span>
                  </LinhaDado>
                  <LinhaDado rotulo="Cadastrado em">
                    <span className="tabular">{formatarData(convenio.createdAt)}</span>
                  </LinhaDado>
                </Panel>

                <Panel icone={<Phone />} titulo="Contato">
                  {convenio.telefone && (
                    <LinhaDado rotulo="Telefone">
                      <span className="tabular">{convenio.telefone}</span>
                    </LinhaDado>
                  )}
                  {convenio.email && (
                    <LinhaDado rotulo="E-mail">{convenio.email}</LinhaDado>
                  )}
                  {convenio.contato_nome && (
                    <div className="mt-3 rounded-2xl bg-surface-muted p-4">
                      <p className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                        Pessoa de contato
                      </p>
                      <p className="mt-1.5 font-semibold text-ink">
                        {convenio.contato_nome}
                      </p>
                      {convenio.contato_telefone && (
                        <p className="tabular text-[0.8rem] text-ink-3">
                          {convenio.contato_telefone}
                        </p>
                      )}
                    </div>
                  )}
                  {!convenio.telefone &&
                    !convenio.email &&
                    !convenio.contato_nome && (
                      <p className="text-sm text-ink-3">
                        Nenhum contato cadastrado
                      </p>
                    )}
                </Panel>

                <Panel icone={<Wallet />} titulo="Configurações Financeiras">
                  {convenio.prazo_pagamento_dias != null && (
                    <LinhaDado rotulo="Prazo de pagamento">
                      {convenio.prazo_pagamento_dias} dias
                    </LinhaDado>
                  )}
                  {convenio.dia_fechamento != null && (
                    <LinhaDado rotulo="Dia de fechamento">
                      Dia {convenio.dia_fechamento}
                    </LinhaDado>
                  )}
                  {convenio.dia_entrega_guias != null && (
                    <LinhaDado rotulo="Entrega de guias">
                      Até dia {convenio.dia_entrega_guias}
                    </LinhaDado>
                  )}
                  {convenio.percentual_repasse != null && (
                    <LinhaDado rotulo="Repasse">
                      {convenio.percentual_repasse}%
                    </LinhaDado>
                  )}
                  {convenio.prazo_pagamento_dias == null &&
                    convenio.dia_fechamento == null &&
                    convenio.dia_entrega_guias == null &&
                    convenio.percentual_repasse == null && (
                      <p className="text-sm text-ink-3">
                        Nenhuma configuração financeira
                      </p>
                    )}
                </Panel>

                <Panel icone={<StickyNote />} titulo="Observações">
                  {convenio.observacoes ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-2">
                      {convenio.observacoes}
                    </p>
                  ) : (
                    <p className="text-sm text-ink-3">Nenhuma observação</p>
                  )}
                </Panel>
              </div>
            </TabsContent>

            {/* ==================== TABELA DE VALORES ==================== */}
            <TabsContent value="tabela" className="mt-5">
              <Panel
                icone={<Receipt />}
                titulo="Procedimentos e Valores"
                subtitulo="Valor pago pelo convênio em cada procedimento"
                acoes={
                  <ActionButton
                    size="sm"
                    onClick={() => setTabelaForm({ open: true, item: null })}
                  >
                    <Plus />
                    Adicionar Procedimento
                  </ActionButton>
                }
              >
                {tabelaLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                    ))}
                  </div>
                ) : tabela.length === 0 ? (
                  <EstadoVazio
                    icone={<FileText />}
                    titulo="Nenhum procedimento cadastrado"
                    texto="Clique em “Adicionar Procedimento” para começar"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Procedimento</TableHead>
                        <TableHead className="text-right">Valor Convênio</TableHead>
                        <TableHead>Tipo Guia</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabela.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink">
                                  {item.nome_procedimento}
                                </span>
                                {item.procedimentoId && (
                                  <StatusPill tom="info" className="py-0.5">
                                    <Link2 className="size-3" />
                                    clínica
                                  </StatusPill>
                                )}
                              </div>
                              <span className="tabular text-[0.75rem] text-ink-3">
                                {item.codigo_procedimento}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="tabular font-semibold text-ink">
                              {formatarMoeda(item.valor_convenio)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {item.tipo_guia ? (
                              <StatusPill tom="violet">
                                {TIPO_GUIA_TISS_LABELS[item.tipo_guia]}
                              </StatusPill>
                            ) : (
                              <span className="text-[0.82rem] text-ink-3">Padrão</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1.5">
                              <IconButton
                                aria-label={`Editar ${item.nome_procedimento}`}
                                className="size-9"
                                onClick={() => setTabelaForm({ open: true, item })}
                              >
                                <Pencil className="size-4" />
                              </IconButton>
                              <IconButton
                                aria-label={`Remover ${item.nome_procedimento}`}
                                className="size-9 text-danger-ink"
                                onClick={() => handleRemoverProcedimento(item.id)}
                              >
                                <Trash2 className="size-4" />
                              </IconButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Panel>
            </TabsContent>

            {/* ==================== REGRAS DE GUIA (TISS) ==================== */}
            <TabsContent value="tiss" className="mt-5">
              <ConvenioTissForm convenio={convenio} onSuccess={fetchConvenio} />
            </TabsContent>

            {/* ==================== ANEXOS ==================== */}
            <TabsContent value="anexos" className="mt-5">
              <Panel
                icone={<FolderOpen />}
                titulo="Documentos e Contratos"
                subtitulo="Contratos, tabelas e documentos do convênio"
                acoes={
                  <>
                    <ActionButton
                      variant="secondary"
                      size="sm"
                      disabled={uploadLoading}
                      onClick={() =>
                        document.getElementById("upload-anexo")?.click()
                      }
                    >
                      {uploadLoading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Upload />
                      )}
                      Upload Arquivo
                    </ActionButton>
                    <input
                      id="upload-anexo"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      onChange={handleUploadAnexo}
                    />
                  </>
                }
              >
                {anexosLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-[4.25rem] w-full rounded-2xl" />
                    ))}
                  </div>
                ) : anexos.length === 0 ? (
                  <EstadoVazio
                    icone={<FileText />}
                    titulo="Nenhum anexo cadastrado"
                    texto="Faça upload de contratos, tabelas e documentos"
                  />
                ) : (
                  <ul className="space-y-2">
                    {anexos.map((anexo) => (
                      <li
                        key={anexo.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted p-3.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
                            <FileText className="size-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink" title={anexo.titulo}>
                              {anexo.titulo}
                            </p>
                            <p className="truncate text-[0.75rem] text-ink-3">
                              {TIPO_CONVENIO_ANEXO_LABELS[anexo.tipo]} ·{" "}
                              {formatarBytes(anexo.arquivo_size)} ·{" "}
                              {formatarData(anexo.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <a
                            href={anexo.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center rounded-full border border-rim bg-surface px-3.5 text-[0.8rem] font-medium text-ink transition-colors hover:bg-surface-sunken"
                          >
                            Ver
                          </a>
                          <IconButton
                            aria-label={`Remover ${anexo.titulo}`}
                            className="size-9 bg-surface text-danger-ink"
                            onClick={() => handleRemoverAnexo(anexo.id)}
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </TabsContent>

            {/* ==================== HISTÓRICO ==================== */}
            <TabsContent value="historico" className="mt-5">
              <Panel
                icone={<HistoryIcon />}
                titulo="Histórico de Negociações"
                subtitulo="Alterações, reajustes e notas registradas"
                acoes={
                  <ConvenioHistoricoNota convenioId={id} onSuccess={fetchHistorico} />
                }
              >
                {historicoLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                    ))}
                  </div>
                ) : historico.length === 0 ? (
                  <EstadoVazio
                    icone={<Clock />}
                    titulo="Nenhum registro no histórico"
                    texto="Alterações e notas sobre o convênio aparecem aqui"
                  />
                ) : (
                  // Linha do tempo: um trilho vertical com um ponto por registro.
                  <ol className="relative space-y-4 before:absolute before:top-3 before:bottom-3 before:left-[7px] before:w-px before:bg-hairline">
                    {historico.map((item) => (
                      <li key={item.id} className="relative pl-8">
                        <span
                          aria-hidden
                          className="absolute top-5 left-0 size-[15px] rounded-full border-[3px] border-surface bg-brand shadow-[0_0_0_1px_var(--hairline)]"
                        />
                        <div className="rounded-2xl bg-surface-muted p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusPill tom={TOM_HISTORICO[item.tipo]}>
                                  {TIPO_HISTORICO_LABELS[item.tipo]}
                                </StatusPill>
                                <span className="font-semibold text-ink">
                                  {item.titulo}
                                </span>
                              </div>
                              {item.descricao && (
                                <p className="mt-2 text-sm whitespace-pre-wrap text-ink-2">
                                  {item.descricao}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-[0.75rem] text-ink-3 sm:text-right">
                              <p className="font-medium text-ink-2">{item.usuario_nome}</p>
                              <p className="tabular">{formatarDataHora(item.createdAt)}</p>
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
