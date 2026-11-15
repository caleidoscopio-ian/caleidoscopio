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
import { ProcedimentoFormDialog } from "@/components/procedimentos/procedimento-form-dialog";
import {
  Activity,
  AlertCircle,
  Award,
  Building2,
  Clock,
  DollarSign,
  FileText,
  Link2,
  Pencil,
  Stethoscope,
  StickyNote,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Procedimento } from "@/types/procedimento";
import { formatBRL } from "@/types/procedimento";
import { TIPO_REPASSE_LABELS } from "@/types/profissional";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";
import {
  ActionButton,
  EstadoVazio,
  LinhaDado,
  PageHeader,
  Panel,
  PersonAvatar,
  StatCard,
  StatusPill,
  TONS_FILEIRA,
} from "@/components/kit";
import { formatarDataCivil } from "@/lib/datas-fuso";

/** Contagem na aba — pílula da marca, como no v2. */
function Contagem({ n }: { n: number }) {
  return (
    <span className="tabular ml-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[0.7rem] font-semibold text-brand">
      {n}
    </span>
  );
}

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
          <div className="py-16">
            <EstadoVazio
              icone={<AlertCircle />}
              titulo="Procedimento não encontrado"
              texto="Ele pode ter sido removido ou o link está incorreto"
              acao={
                <ActionButton variant="secondary" onClick={() => router.push("/procedimentos")}>
                  Voltar para procedimentos
                </ActionButton>
              }
            />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const fmtData = (iso: string | null) =>
    iso ? formatarDataCivil(iso) : null;
  const fmtMin = (m: number | null) => (m != null ? `${m} min` : null);

  return (
    <ProtectedRoute requiredPermission={{ resource: "procedimentos", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-7">
          <PageHeader
            voltar={{ onClick: () => router.push("/procedimentos") }}
            // A cor do chip e dado do procedimento, nao decoracao: vai em
            // `avatar` (sem moldura) e nao em `icone` (que impoe o tom da marca).
            avatar={
              <span
                className="grid size-12 place-items-center rounded-2xl"
                style={{ backgroundColor: procedimento.cor || "var(--brand)" }}
              >
                {procedimento.icone ? (
                  <DynIcon name={procedimento.icone} className="size-5 text-white" />
                ) : (
                  <Activity className="size-5 text-white" />
                )}
              </span>
            }
            titulo={
              <span className="inline-flex flex-wrap items-center gap-3">
                {procedimento.nome}
                <StatusPill tom={procedimento.ativo ? "success" : "neutral"} ponto>
                  {procedimento.ativo ? "Ativo" : "Inativo"}
                </StatusPill>
              </span>
            }
            subtitulo={
              [procedimento.especialidade, procedimento.codigo && `TUSS ${procedimento.codigo}`]
                .filter(Boolean)
                .join(" · ") || undefined
            }
            meta={
              procedimento.requer_autorizacao ? (
                <StatusPill tom="warning">
                  <AlertCircle className="size-3" /> Requer autorização
                </StatusPill>
              ) : undefined
            }
            acoes={
              <ActionButton variant="secondary" onClick={() => setEditando(true)}>
                <Pencil /> Editar
              </ActionButton>
            }
          />

          <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Agendamentos", value: procedimento._count?.agendamentos ?? 0, icon: Clock },
              { label: "Convênios", value: procedimento._count?.tabelasConvenio ?? 0, icon: Link2 },
              { label: "Regras de repasse", value: procedimento._count?.regrasRepasse ?? 0, icon: DollarSign },
              { label: "Pacotes", value: procedimento._count?.pacoteProcedimentos ?? 0, icon: Award },
            ].map(({ label, value, icon: Icon }, i) => (
              <StatCard
                key={label}
                size="sm"
                tom={TONS_FILEIRA[i]}
                icone={<Icon />}
                rotulo={label}
                valor={value}
              />
            ))}
          </div>

          <Tabs defaultValue="dados">
            <TabsList>
              <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
              <TabsTrigger value="convenios">
                Convênios
                {!!procedimento.tabelasConvenio?.length && (
                  <Contagem n={procedimento.tabelasConvenio.length} />
                )}
              </TabsTrigger>
              <TabsTrigger value="repasse">
                Regras de Repasse
                {!!procedimento.regrasRepasse?.length && (
                  <Contagem n={procedimento.regrasRepasse.length} />
                )}
              </TabsTrigger>
            </TabsList>

            {/* ==================== DADOS GERAIS ==================== */}
            <TabsContent value="dados" className="mt-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Panel icone={<Stethoscope />} titulo="Identificação">
                  <LinhaDado rotulo="Nome">{procedimento.nome}</LinhaDado>
                  <LinhaDado rotulo="Especialidade">{procedimento.especialidade}</LinhaDado>
                  <LinhaDado rotulo="Código TUSS">
                    {procedimento.codigo && <span className="tabular">{procedimento.codigo}</span>}
                  </LinhaDado>
                  <LinhaDado rotulo="Autorização prévia">
                    {procedimento.requer_autorizacao ? "Obrigatória" : "Não exige"}
                  </LinhaDado>
                </Panel>

                <Panel icone={<Wallet />} titulo="Valores e Duração">
                  <LinhaDado rotulo="Valor de referência">
                    {procedimento.valor != null && (
                      <span className="tabular">{formatBRL(procedimento.valor)}</span>
                    )}
                  </LinhaDado>
                  <LinhaDado rotulo="Valor particular">
                    {procedimento.valor_particular != null && (
                      <span className="tabular">{formatBRL(procedimento.valor_particular)}</span>
                    )}
                  </LinhaDado>
                  <LinhaDado rotulo="Duração padrão">{fmtMin(procedimento.duracao_padrao)}</LinhaDado>
                  {(procedimento.tempo_minimo != null || procedimento.tempo_maximo != null) && (
                    <LinhaDado rotulo="Tempo mínimo / máximo">
                      {fmtMin(procedimento.tempo_minimo) ?? "—"} / {fmtMin(procedimento.tempo_maximo) ?? "—"}
                    </LinhaDado>
                  )}
                </Panel>

                <Panel icone={<FileText />} titulo="Descrição">
                  {procedimento.descricao ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-2">
                      {procedimento.descricao}
                    </p>
                  ) : (
                    <p className="text-sm text-ink-3">Nenhuma descrição</p>
                  )}
                </Panel>

                <Panel icone={<StickyNote />} titulo="Observações">
                  {procedimento.observacoes ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-2">
                      {procedimento.observacoes}
                    </p>
                  ) : (
                    <p className="text-sm text-ink-3">Nenhuma observação</p>
                  )}
                </Panel>
              </div>
            </TabsContent>

            {/* ==================== CONVÊNIOS ==================== */}
            <TabsContent value="convenios" className="mt-5">
              <Panel
                icone={<Building2 />}
                titulo="Tabelas de Convênio"
                subtitulo="Quanto cada convênio paga por este procedimento"
              >
                {!procedimento.tabelasConvenio?.length ? (
                  <EstadoVazio
                    icone={<Building2 />}
                    titulo="Sem tabela de convênio"
                    texto="Este procedimento ainda não está em nenhuma tabela de convênio"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Convênio</TableHead>
                        <TableHead className="text-right">Valor Convênio</TableHead>
                        <TableHead>Vigência</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedimento.tabelasConvenio.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-brand">
                                <Building2 className="size-4" />
                              </span>
                              <span className="font-semibold text-ink">
                                {t.convenio?.nome_fantasia || t.convenio?.razao_social || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="tabular font-semibold text-ink">
                              {formatBRL(t.valor_convenio)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="tabular text-[0.82rem] text-ink-3">
                              {fmtData(t.vigencia_inicio) ?? "—"} — {fmtData(t.vigencia_fim) ?? "Sem fim"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {t.convenio && (
                              <Link
                                href={`/convenios/${t.convenio.id}`}
                                className="inline-flex h-9 items-center rounded-full border border-rim bg-surface px-3.5 text-[0.8rem] font-medium text-ink transition-colors hover:bg-surface-sunken"
                              >
                                Ver convênio
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Panel>
            </TabsContent>

            {/* ==================== REGRAS DE REPASSE ==================== */}
            <TabsContent value="repasse" className="mt-5">
              <Panel
                icone={<DollarSign />}
                titulo="Regras de Repasse Aplicadas"
                subtitulo="Regras específicas deste procedimento, por profissional"
              >
                {!procedimento.regrasRepasse?.length ? (
                  <EstadoVazio
                    icone={<DollarSign />}
                    titulo="Sem regra específica"
                    texto="Nenhuma regra de repasse específica para este procedimento"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Vigência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedimento.regrasRepasse.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            {r.profissional ? (
                              <Link
                                href={`/terapeutas/${r.profissional.id}`}
                                className="flex items-center gap-3"
                              >
                                <PersonAvatar nome={r.profissional.nome} tamanho={36} />
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-ink hover:underline">
                                    {r.profissional.nome}
                                  </span>
                                  {r.profissional.especialidade && (
                                    <span className="block truncate text-[0.75rem] text-ink-3">
                                      {r.profissional.especialidade}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-ink-4">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusPill tom="violet">
                              {TIPO_REPASSE_LABELS[r.tipo] ?? r.tipo}
                            </StatusPill>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="tabular font-semibold text-ink">
                              {r.tipo === "PERCENTUAL" ? `${r.valor}%` : formatBRL(r.valor)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {r.convenio?.nome_fantasia || r.convenio?.razao_social || (
                              <StatusPill tom="neutral">Todos</StatusPill>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="tabular text-[0.82rem] text-ink-3">
                              {fmtData(r.vigencia_inicio)} — {fmtData(r.vigencia_fim) ?? "Sem fim"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Panel>
            </TabsContent>
          </Tabs>
        </div>

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
