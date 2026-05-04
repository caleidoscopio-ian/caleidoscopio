/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/page-loader";
import { ProcedimentoFormDialog } from "@/components/procedimentos/procedimento-form-dialog";
import { ExcluirProcedimentoDialog } from "@/components/procedimentos/excluir-procedimento-dialog";
import { PacoteFormDialog } from "@/components/pacotes/pacote-form-dialog";
import type { Procedimento } from "@/types/procedimento";
import { formatDuracao, formatBRL } from "@/types/procedimento";
import type { Pacote } from "@/types/pacote";
import { TIPO_PACOTE_LABELS, STATUS_PACOTE_LABELS } from "@/types/pacote";
import * as LucideIcons from "lucide-react";
import {
  Search, Plus, Pencil, Trash2, Package2, Activity,
  ExternalLink, AlertCircle,
} from "lucide-react";
import { LucideProps } from "lucide-react";

function DynIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  return Icon ? <Icon {...props} /> : <Activity {...props} />;
}

function ProcColorChip({ cor, icone }: { cor?: string | null; icone?: string | null }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-flex h-5 w-5 rounded items-center justify-center shrink-0"
        style={{ backgroundColor: cor ?? "#e2e8f0" }}
      >
        {icone && <DynIcon name={icone} className="h-3 w-3 text-white" />}
      </span>
    </span>
  );
}

export default function ProcedimentosPage() {
  const { user, isAuthenticated } = useAuth();
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [procForm, setProcForm] = useState<{ open: boolean; proc?: Procedimento | null }>({ open: false });
  const [pacoteForm, setPacoteForm] = useState<{ open: boolean; pacote?: Pacote | null }>({ open: false });

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Procedimentos e Pacotes" },
  ];

  const authHeaders = useCallback(() => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
  }), [user]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [rProc, rPac] = await Promise.all([
        fetch("/api/procedimentos", { headers: authHeaders() }),
        fetch("/api/pacotes", { headers: authHeaders() }),
      ]);
      const [dProc, dPac] = await Promise.all([rProc.json(), rPac.json()]);
      if (dProc.success) setProcedimentos(dProc.data);
      if (dPac.success) setPacotes(dPac.data);
    } finally {
      setLoading(false);
    }
  }, [user, authHeaders]);

  useEffect(() => {
    if (isAuthenticated && user) fetchAll();
  }, [isAuthenticated, user]);

  const filteredProc = procedimentos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.especialidade ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredPac = pacotes.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const especialidades = [...new Set(procedimentos.map((p) => p.especialidade).filter(Boolean))];
  const pacotesAtivos = pacotes.filter((p) => p.status === "ATIVO").length;

  const handleDesativarPacote = async (pacoteId: string) => {
    if (!user) return;
    await fetch(`/api/pacotes/${pacoteId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    fetchAll();
  };

  if (loading) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "procedimentos", action: "VIEW" }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <PageLoader message="Carregando procedimentos..." />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission={{ resource: "procedimentos", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Procedimentos e Pacotes</h1>
            <p className="text-sm text-muted-foreground">Gerencie os procedimentos oferecidos e crie pacotes de atendimento.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Procedimentos</p>
              <p className="text-2xl font-bold">{procedimentos.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Especialidades</p>
              <p className="text-2xl font-bold">{especialidades.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Pacotes</p>
              <p className="text-2xl font-bold">{pacotes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Pacotes Ativos</p>
              <p className="text-2xl font-bold">{pacotesAtivos}</p>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou especialidade..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="procedimentos">
          <TabsList className="mb-4">
            <TabsTrigger value="procedimentos">
              Procedimentos
              <Badge variant="secondary" className="ml-2">{filteredProc.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pacotes">
              Pacotes
              <Badge variant="secondary" className="ml-2">{filteredPac.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Procedimentos ── */}
          <TabsContent value="procedimentos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">Lista de Procedimentos</CardTitle>
                <Button size="sm" onClick={() => setProcForm({ open: true, proc: null })}>
                  <Plus className="h-4 w-4 mr-1" /> Novo Procedimento
                </Button>
              </CardHeader>
              <CardContent>
                {filteredProc.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhum procedimento encontrado.</p>
                    <p className="text-sm mt-1">Clique em &ldquo;Novo Procedimento&rdquo; para começar.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Especialidade</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Autorizações</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProc.map((proc) => (
                        <TableRow key={proc.id}>
                          <TableCell><ProcColorChip cor={proc.cor} icone={proc.icone} /></TableCell>
                          <TableCell className="font-medium">{proc.nome}</TableCell>
                          <TableCell className="font-mono text-xs">{proc.codigo || "—"}</TableCell>
                          <TableCell>
                            {proc.especialidade
                              ? <Badge variant="outline" className="text-xs">{proc.especialidade}</Badge>
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-sm">{formatBRL(proc.valor)}</TableCell>
                          <TableCell className="text-sm">{formatDuracao(proc.duracao_padrao)}</TableCell>
                          <TableCell>
                            {proc.requer_autorizacao && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <AlertCircle className="h-3 w-3" /> Sim
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                                <Link href={`/procedimentos/${proc.id}`}><ExternalLink className="h-3 w-3" /></Link>
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setProcForm({ open: true, proc })}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <ExcluirProcedimentoDialog procedimento={proc} onSuccess={fetchAll} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Pacotes ── */}
          <TabsContent value="pacotes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">Pacotes de Atendimento</CardTitle>
                <Button size="sm" onClick={() => setPacoteForm({ open: true, pacote: null })}>
                  <Plus className="h-4 w-4 mr-1" /> Novo Pacote
                </Button>
              </CardHeader>
              <CardContent>
                {filteredPac.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhum pacote encontrado.</p>
                    <p className="text-sm mt-1">Clique em &ldquo;Novo Pacote&rdquo; para criar um combo de atendimento.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Procedimentos</TableHead>
                        <TableHead>Sessões</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPac.map((pac) => (
                        <TableRow key={pac.id} className={!pac.ativo ? "opacity-50" : ""}>
                          <TableCell>
                            {pac.cor && (
                              <span className="h-5 w-5 rounded block" style={{ backgroundColor: pac.cor }} />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{pac.nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {TIPO_PACOTE_LABELS[pac.tipo] ?? pac.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{pac._count?.procedimentos ?? 0}</TableCell>
                          <TableCell className="text-sm">{pac.total_sessoes ?? "—"}</TableCell>
                          <TableCell className="text-sm font-medium">{formatBRL(pac.valor_total)}</TableCell>
                          <TableCell className="text-sm">{pac.validade_dias ? `${pac.validade_dias} dias` : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={pac.status === "ATIVO" ? "default" : "destructive"} className="text-xs">
                              {STATUS_PACOTE_LABELS[pac.status] ?? pac.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                                <Link href={`/pacotes/${pac.id}`}><ExternalLink className="h-3 w-3" /></Link>
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPacoteForm({ open: true, pacote: pac })} disabled={!pac.ativo}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDesativarPacote(pac.id)} disabled={!pac.ativo}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ProcedimentoFormDialog
          procedimento={procForm.proc}
          open={procForm.open}
          onOpenChange={(open) => setProcForm((p) => ({ ...p, open }))}
          onSuccess={fetchAll}
        />
        <PacoteFormDialog
          pacote={pacoteForm.pacote}
          open={pacoteForm.open}
          onOpenChange={(open) => setPacoteForm((p) => ({ ...p, open }))}
          onSuccess={fetchAll}
        />
      </MainLayout>
    </ProtectedRoute>
  );
}
