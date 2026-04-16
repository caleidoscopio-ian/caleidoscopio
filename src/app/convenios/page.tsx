/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Handshake,
  Search,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  PauseCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NovoConvenioDialog } from "@/components/convenios/novo-convenio-dialog";
import { EditarConvenioDialog } from "@/components/convenios/editar-convenio-dialog";
import { ExcluirConvenioDialog } from "@/components/convenios/excluir-convenio-dialog";
import type { Convenio, StatusConvenio } from "@/types/convenio";
import { TIPO_CONVENIO_LABELS } from "@/types/convenio";

const STATUS_BADGE: Record<StatusConvenio, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  ATIVO: { label: "Ativo", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  EM_NEGOCIACAO: { label: "Em Negociação", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  SUSPENSO: { label: "Suspenso", variant: "outline", icon: <PauseCircle className="h-3 w-3" /> },
  INATIVO: { label: "Inativo", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Convênios</h1>
              <p className="text-muted-foreground">
                Gestão de convênios e planos de saúde da clínica
              </p>
            </div>
            <NovoConvenioDialog onSuccess={fetchConvenios} />
          </div>

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Handshake className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">{stats.ativos}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Em Negociação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold text-yellow-600">{stats.negociacao}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Inativos/Suspensos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.inativos}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conveniosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Handshake className="h-10 w-10 mb-3 opacity-30" />
                  <p className="font-medium">
                    {searchTerm ? "Nenhum convênio encontrado" : "Nenhum convênio cadastrado"}
                  </p>
                  <p className="text-sm">
                    {searchTerm ? "Tente outro termo de busca" : "Clique em 'Novo Convênio' para começar"}
                  </p>
                </div>
              ) : (
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
                            <div>
                              <p className="font-medium">{convenio.razao_social}</p>
                              {convenio.nome_fantasia && (
                                <p className="text-xs text-muted-foreground">{convenio.nome_fantasia}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatarCNPJ(convenio.cnpj)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{TIPO_CONVENIO_LABELS[convenio.tipo]}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant} className="gap-1">
                              {statusInfo.icon}
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm text-muted-foreground">
                              {convenio._count?.tabelas ?? 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/convenios/${convenio.id}`)}
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditando(convenio)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExcluindo(convenio)}
                                title="Desativar"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
