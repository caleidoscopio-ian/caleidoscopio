/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Handshake,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NovoConvenioDialog } from "@/components/convenios/novo-convenio-dialog";
import { EditarConvenioDialog } from "@/components/convenios/editar-convenio-dialog";
import { ExcluirConvenioDialog } from "@/components/convenios/excluir-convenio-dialog";
import type { Convenio, StatusConvenio } from "@/types/convenio";
import { TIPO_CONVENIO_LABELS } from "@/types/convenio";
import {
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
  SearchField,
  IconButton,
  IconTile,
  EstadoVazio,
  Carregando,
  type TomStatus,
} from "@/components/kit";

const STATUS_BADGE: Record<StatusConvenio, { label: string; tom: TomStatus }> = {
  ATIVO: { label: "Ativo", tom: "success" },
  EM_NEGOCIACAO: { label: "Em Negociação", tom: "warning" },
  SUSPENSO: { label: "Suspenso", tom: "neutral" },
  INATIVO: { label: "Inativo", tom: "danger" },
};

export default function ConveniosPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editando, setEditando] = useState<Convenio | null>(null);
  const [excluindo, setExcluindo] = useState<Convenio | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Convênios" },
  ];

  const fetchConvenios = async () => {
    if (!isAuthenticated || !user) return;
    try {
      setLoading(true);
      const response = await fetch("/api/convenios", {
        headers: {
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
      });
      const result = await response.json();
      if (result.success) {
        setConvenios(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar convênios",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchConvenios();
    }
  }, [isAuthenticated, user]);

  const conveniosFiltrados = convenios.filter((c) => {
    const termo = searchTerm.toLowerCase();
    return (
      c.razao_social.toLowerCase().includes(termo) ||
      (c.nome_fantasia?.toLowerCase().includes(termo) ?? false) ||
      c.cnpj.includes(termo)
    );
  });

  const stats = {
    total: convenios.length,
    ativos: convenios.filter((c) => c.status === "ATIVO").length,
    negociacao: convenios.filter((c) => c.status === "EM_NEGOCIACAO").length,
    inativos: convenios.filter((c) => c.status === "INATIVO" || c.status === "SUSPENSO").length,
  };

  const formatarCNPJ = (cnpj: string) => {
    const limpo = cnpj.replace(/\D/g, "");
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  return (
    <ProtectedRoute requiredPermission={{ resource: "convenios", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            titulo="Convênios"
            subtitulo="Gestão de convênios e planos de saúde da clínica"
            acoes={
              <NovoConvenioDialog onSuccess={fetchConvenios} />
            }
          />

          {/* Fileira pastel, tons na ordem do v2 nesta tela */}
          <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tom="blue" icone={<Building2 />} rotulo="Total" valor={stats.total} />
            <StatCard
              tom="mint"
              icone={<CheckCircle2 />}
              rotulo="Ativos"
              valor={stats.ativos}
            />
            <StatCard
              tom="peach"
              icone={<Clock />}
              rotulo="Em Negociação"
              valor={stats.negociacao}
            />
            <StatCard
              tom="lavender"
              icone={<XCircle />}
              rotulo="Inativos/Suspensos"
              valor={stats.inativos}
            />
          </div>

          {/* A busca mora no cabeçalho do painel, como no v2 — campo solto
              acima da tabela era o resto da tela antiga. */}
          <Panel
            icone={<Building2 />}
            titulo="Convênios e planos"
            subtitulo={`${conveniosFiltrados.length} ${conveniosFiltrados.length === 1 ? "convênio" : "convênios"}`}
            acoes={
              <SearchField
                placeholder="Buscar por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="hidden w-72 md:flex"
              />
            }
          >
            <div>
              {/* No telefone o campo desce para o corpo: no cabeçalho ele
                  espremeria o título. */}
              <SearchField
                placeholder="Buscar por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4 md:hidden"
              />
              {loading ? (
                <Carregando texto="Carregando convênios..." />
              ) : conveniosFiltrados.length === 0 ? (
                <EstadoVazio
                  icone={<Handshake />}
                  titulo={searchTerm ? "Nenhum convênio encontrado" : "Nenhum convênio cadastrado"}
                  texto={
                    searchTerm
                      ? "Tente outro termo de busca."
                      : "Clique em “Novo Convênio” para começar."
                  }
                />
              ) : (
                <div className="scrollbar-none overflow-x-auto rounded-2xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Procedimentos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conveniosFiltrados.map((convenio) => {
                      const statusInfo = STATUS_BADGE[convenio.status];
                      return (
                        <TableRow key={convenio.id}>
                          <TableCell>
                            <div className="flex min-w-0 items-center gap-3">
                              <IconTile className="hidden size-10 rounded-[0.85rem] sm:grid">
                                <Building2 />
                              </IconTile>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-ink">
                                  {convenio.razao_social}
                                </p>
                                {convenio.nome_fantasia && (
                                  <p className="truncate text-[0.75rem] text-ink-3">
                                    {convenio.nome_fantasia}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="tabular text-[0.82rem] whitespace-nowrap">
                              {formatarCNPJ(convenio.cnpj)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-[0.82rem]">
                              {TIPO_CONVENIO_LABELS[convenio.tipo]}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusPill tom={statusInfo.tom} ponto>
                              {statusInfo.label}
                            </StatusPill>
                          </TableCell>
                          <TableCell className="hidden text-center md:table-cell">
                            <span className="tabular text-ink-3">
                              {convenio._count?.tabelas ?? 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1.5">
                              <IconButton
                                aria-label={`Ver detalhes de ${convenio.razao_social}`}
                                title="Ver detalhes"
                                onClick={() => router.push(`/convenios/${convenio.id}`)}
                                className="size-9"
                              >
                                <Eye className="size-4" aria-hidden />
                              </IconButton>
                              <IconButton
                                aria-label={`Editar ${convenio.razao_social}`}
                                title="Editar"
                                onClick={() => setEditando(convenio)}
                                className="size-9"
                              >
                                <Pencil className="size-4" aria-hidden />
                              </IconButton>
                              <IconButton
                                aria-label={`Desativar ${convenio.razao_social}`}
                                title="Desativar"
                                onClick={() => setExcluindo(convenio)}
                                className="size-9 hover:text-danger"
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </IconButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Dialogs */}
        {editando && (
          <EditarConvenioDialog
            convenio={editando}
            open={!!editando}
            onOpenChange={(o) => !o && setEditando(null)}
            onSuccess={fetchConvenios}
          />
        )}
        {excluindo && (
          <ExcluirConvenioDialog
            convenio={excluindo}
            open={!!excluindo}
            onOpenChange={(o) => !o && setExcluindo(null)}
            onSuccess={fetchConvenios}
          />
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}
