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
import { ProcedimentoFormDialog } from "@/components/procedimentos/procedimento-form-dialog";
import {
  ArrowLeft, Pencil, Activity, AlertCircle, Clock,
  DollarSign, Award, Link2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Procedimento } from "@/types/procedimento";
import { formatBRL, formatDuracao } from "@/types/procedimento";
import { TIPO_REPASSE_LABELS } from "@/types/profissional";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";

function DynIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  return Icon ? <Icon {...props} /> : <Activity {...props} />;
}

interface ProcedimentoDetalhe extends Procedimento {
  tabelasConvenio?: Array<{
    id: string
    valor_convenio: number
    valor_particular: number | null
    vigencia_inicio: string | null
    vigencia_fim: string | null
    convenio?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  }>
  regrasRepasse?: Array<{
    id: string
    tipo: string
    valor: number
    prioridade: number
    vigencia_inicio: string
    vigencia_fim: string | null
    profissional?: { id: string; nome: string; especialidade: string } | null
    convenio?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  }>
}

export default function ProcedimentoDetalhePage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [procedimento, setProcedimento] = useState<ProcedimentoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Procedimentos", href: "/procedimentos" },
    { label: procedimento?.nome ?? "Detalhe" },
  ];

  const authHeaders = useCallback(() => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
  }), [user]);

  const fetchProcedimento = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`/api/procedimentos/${id}`, { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setProcedimento(d.data);
      else throw new Error(d.error);
    } catch (e) {
      toast({ title: "Erro ao carregar", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, user, authHeaders, toast]);

  useEffect(() => {
    if (isAuthenticated && user) fetchProcedimento();
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "procedimentos", action: "VIEW" }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <PageLoader message="Carregando procedimento..." />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!procedimento) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "procedimentos", action: "VIEW" }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <p className="text-center py-16 text-muted-foreground">Procedimento não encontrado.</p>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission={{ resource: "procedimentos", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => router.push("/procedimentos")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-3 flex-1">
            {procedimento.cor && (
              <span
                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: procedimento.cor }}
              >
                {procedimento.icone
                  ? <DynIcon name={procedimento.icone} className="h-5 w-5 text-white" />
                  : <Activity className="h-5 w-5 text-white" />}
              </span>
            )}
            <div>
              <h1 className="text-2xl font-bold">{procedimento.nome}</h1>
              <div className="flex gap-2 mt-0.5">
                {procedimento.especialidade && <Badge variant="secondary">{procedimento.especialidade}</Badge>}
                {procedimento.codigo && <Badge variant="outline" className="font-mono text-xs">{procedimento.codigo}</Badge>}
                {procedimento.requer_autorizacao && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" /> Requer autorização
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => setEditando(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Agendamentos", value: procedimento._count?.agendamentos ?? 0, icon: Clock },
            { label: "Convênios", value: procedimento._count?.tabelasConvenio ?? 0, icon: Link2 },
            { label: "Regras Repasse", value: procedimento._count?.regrasRepasse ?? 0, icon: DollarSign },
            { label: "Pacotes", value: procedimento._count?.pacoteProcedimentos ?? 0, icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dados">
          <TabsList className="mb-4">
            <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
            <TabsTrigger value="convenios">Convênios</TabsTrigger>
            <TabsTrigger value="repasse">Regras de Repasse</TabsTrigger>
          </TabsList>

          {/* Dados Gerais */}
          <TabsContent value="dados">
            <Card>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <InfoItem label="Nome" value={procedimento.nome} />
                <InfoItem label="Especialidade" value={procedimento.especialidade} />
                <InfoItem label="Código TUSS" value={procedimento.codigo} mono />
                <InfoItem label="Valor Padrão" value={formatBRL(procedimento.valor)} />
                <InfoItem label="Valor Particular" value={formatBRL(procedimento.valor_particular)} />
                <InfoItem label="Duração Padrão" value={formatDuracao(procedimento.duracao_padrao)} />
                <InfoItem label="Duração Mínima" value={formatDuracao(procedimento.tempo_minimo)} />
                <InfoItem label="Duração Máxima" value={formatDuracao(procedimento.tempo_maximo)} />
                {procedimento.descricao && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm">{procedimento.descricao}</p>
                  </div>
                )}
                {procedimento.observacoes && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm text-muted-foreground">{procedimento.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Convênios */}
          <TabsContent value="convenios">
            <Card>
              <CardHeader><CardTitle className="text-base">Tabelas de Convênio</CardTitle></CardHeader>
              <CardContent>
                {!procedimento.tabelasConvenio?.length ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">
                    Este procedimento ainda não está em nenhuma tabela de convênio.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Valor Convênio</TableHead>
                        <TableHead>Valor Particular</TableHead>
                        <TableHead>Vigência</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedimento.tabelasConvenio.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">
                            {t.convenio?.nome_fantasia || t.convenio?.razao_social || "—"}
                          </TableCell>
                          <TableCell>{formatBRL(t.valor_convenio)}</TableCell>
                          <TableCell>{formatBRL(t.valor_particular)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.vigencia_inicio ? new Date(t.vigencia_inicio).toLocaleDateString("pt-BR") : "—"}
                            {" — "}
                            {t.vigencia_fim ? new Date(t.vigencia_fim).toLocaleDateString("pt-BR") : "Sem fim"}
                          </TableCell>
                          <TableCell>
                            {t.convenio && (
                              <Button size="sm" variant="ghost" asChild>
                                <Link href={`/convenios/${t.convenio.id}`}>Ver convênio</Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regras de Repasse */}
          <TabsContent value="repasse">
            <Card>
              <CardHeader><CardTitle className="text-base">Regras de Repasse Aplicadas</CardTitle></CardHeader>
              <CardContent>
                {!procedimento.regrasRepasse?.length ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma regra de repasse específica para este procedimento.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Vigência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedimento.regrasRepasse.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.profissional ? (
                              <Link href={`/terapeutas/${r.profissional.id}`} className="hover:underline">
                                {r.profissional.nome}
                              </Link>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {TIPO_REPASSE_LABELS[r.tipo] ?? r.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {r.tipo === "PERCENTUAL" ? `${r.valor}%` : formatBRL(r.valor)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.convenio?.nome_fantasia || r.convenio?.razao_social || <span className="text-muted-foreground text-xs">Todos</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(r.vigencia_inicio).toLocaleDateString("pt-BR")}
                            {r.vigencia_fim ? ` — ${new Date(r.vigencia_fim).toLocaleDateString("pt-BR")}` : " — Sem fim"}
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

        <ProcedimentoFormDialog
          procedimento={procedimento}
          open={editando}
          onOpenChange={setEditando}
          onSuccess={fetchProcedimento}
        />
      </MainLayout>
    </ProtectedRoute>
  );
}

function InfoItem({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
    </div>
  );
}
