/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useFilial } from "@/hooks/useFilial";
import { MainLayout } from "@/components/main-layout";
import { EditarTerapeutaForm } from "@/components/forms/editar-terapeuta-form";
import { TerapeutaDetailsDialog } from "@/components/terapeuta-details-dialog";
import { DeleteTerapeutaDialog } from "@/components/delete-terapeuta-dialog";
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
  Users,
  Search,
  Filter,
  Calendar,
  Clock,
  Loader2,
  Stethoscope,
  GraduationCap,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { agruparPorFilial } from "@/lib/agrupar-filial";
import { PageHeader, Panel, StatCard, PersonAvatar } from "@/components/kit";

interface Professional {
  id: string;
  name: string;
  cpf: string;
  phone?: string;
  email?: string;
  specialty: string | null;
  professionalRegistration?: string;
  tipoVinculo?: string | null;
  especialidadeClinica?: string | null;
  especialidadeCustomizadaId?: string | null;
  funcaoAdministrativa?: string | null;
  conselho?: string | null;
  numeroRegistro?: string | null;
  ufRegistro?: string | null;
  roomAccess: string[];
  filialId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfessionalsResponse {
  success: boolean;
  data: Professional[];
  total: number;
  error?: string;
}

function TerapeutasTable({
  professionals,
  onSuccess,
  formatCPF,
  formatDate,
}: {
  professionals: Professional[];
  onSuccess: () => void;
  formatCPF: (cpf: string) => string;
  formatDate: (dateString: string) => string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Especialidade</TableHead>
          <TableHead>CPF</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Registro Profissional</TableHead>
          <TableHead>Cadastrado</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {professionals.map((professional) => (
          <TableRow key={professional.id}>
            <TableCell>
              <div className="flex min-w-0 items-center gap-3">
                <PersonAvatar nome={professional.name} tamanho={36} />
                <span className="truncate font-semibold text-ink">{professional.name}</span>
              </div>
            </TableCell>
            <TableCell>
              {professional.specialty ? (
                <Badge
                  variant="outline"
                  className="bg-brand-soft text-brand"
                >
                  {professional.specialty}
                </Badge>
              ) : (
                <Badge variant="secondary">Não classificado</Badge>
              )}
            </TableCell>
            <TableCell className="font-mono text-sm">
              {formatCPF(professional.cpf)}
            </TableCell>
            <TableCell>
              <div className="text-sm">
                {professional.phone && (
                  <div>{professional.phone}</div>
                )}
                {professional.email && (
                  <div className="text-muted-foreground">
                    {professional.email}
                  </div>
                )}
                {!professional.phone && !professional.email && (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                {professional.professionalRegistration ? (
                  <span className="font-mono">
                    {professional.professionalRegistration}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(professional.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end space-x-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/terapeutas/${professional.id}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Detalhes
                  </Link>
                </Button>
                <EditarTerapeutaForm
                  professional={professional}
                  onSuccess={onSuccess}
                />
                <DeleteTerapeutaDialog
                  professional={professional}
                  onSuccess={onSuccess}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TerapeutasPageContent() {
  const { user, isAuthenticated } = useAuth();
  const { filialAtiva, filiais } = useFilial();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Profissionais" },
  ];

  // Buscar terapeutas da API
  const fetchProfessionals = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se usuário está autenticado
      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      console.log("🔍 Frontend - Enviando dados do usuário para API:");
      console.log(`   👤 Usuário: ${user.name} (${user.email})`);
      console.log(`   🏥 Clínica: ${user.tenant?.name} (${user.tenant?.id})`);
      console.log(`   🔑 Role: ${user.role}`);

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user));

      const params = new URLSearchParams();
      if (filialAtiva?.id) params.set("filialId", filialAtiva.id);

      const response = await fetch(`/api/terapeutas?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result: ProfessionalsResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar terapeutas");
      }

      if (result.success) {
        setProfessionals(result.data);
        console.log(
          `✅ Frontend - Carregados ${result.data.length} terapeutas da clínica "${user.tenant?.name}"`
        );
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Frontend - Erro ao buscar terapeutas:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar terapeutas"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfessionals();
    }
  }, [isAuthenticated, user, filialAtiva?.id]);

  // Filtrar terapeutas baseado no termo de busca
  const filteredProfessionals = professionals.filter(
    (professional) =>
      professional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.cpf.includes(searchTerm) ||
      (professional.specialty && professional.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (professional.email &&
        professional.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Formatar CPF
  const formatCPF = (cpf: string) => {
    if (!cpf) return "-";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Agrupa pelas especialidades efetivamente usadas — assim as especialidades
  // criadas pela clínica entram na contagem junto com as do enum
  const especialidadeStats = Object.entries(
    professionals
      .filter((p) => p.tipoVinculo !== "FUNCIONARIO_ADMINISTRATIVO" && p.specialty)
      .reduce<Record<string, number>>((acc, p) => {
        acc[p.specialty as string] = (acc[p.specialty as string] ?? 0) + 1;
        return acc;
      }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          titulo="Gestão de Profissionais"
          subtitulo="Gerencie os profissionais da clínica e suas especialidades"
        />

        {/* Estatísticas */}
        <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <StatCard
            tom="blue"
            size="hero"
            icone={<UserCheck />}
            rotulo="Total Profissionais"
            valor={loading ? "..." : professionals.length}
          />

          <StatCard
            tom="lavender"
            icone={<Users />}
            rotulo="Ativos"
            valor={loading ? "..." : professionals.length}
            hint="Todos os profissionais estão ativos"
          />

          <StatCard
            tom="mint"
            icone={<Stethoscope />}
            rotulo="Especialidades"
            valor={loading ? "..." : especialidadeStats.length}
            hint="Diferentes áreas de atuação"
          />

          <StatCard
            tom="peach"
            icone={<Calendar />}
            rotulo="Cadastrados Este Mês"
            valor={loading ? "..." : professionals.filter((p) => { const created = new Date(p.createdAt); const now = new Date(); return ( created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear() ); }).length}
          />
        </div>

        {/* Estatísticas por Especialidade */}
        {!loading && especialidadeStats.length > 0 && (
          <Panel icone={<GraduationCap />} titulo="Distribuição por Especialidade">

            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              {especialidadeStats.map((stat) => (
                <div
                  key={stat.name}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted p-3.5"
                >
                  <span className="text-sm font-medium">{stat.name}</span>
                  <Badge variant="secondary">{stat.count}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Filtros e Busca */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, especialidade ou email..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" disabled>
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Tabela de Terapeutas */}
        <Panel
          titulo={<>Lista de Profissionais {!loading && ( <Badge variant="secondary" className="ml-2"> {filteredProfessionals.length} de {professionals.length} </Badge> )}</>}
        >

          {error && (
            <div className="text-center py-8">
              <div className="text-danger-ink mb-4">{error}</div>
              <Button onClick={fetchProfessionals} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          )}

          {loading && !error && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                Carregando profissionais...
              </p>
            </div>
          )}

          {!loading && !error && professionals.length === 0 && (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhum profissional encontrado
              </h3>
              <p className="text-muted-foreground">
                Os profissionais devem ser criados através da página de Usuários.
              </p>
            </div>
          )}

          {!loading && !error && filteredProfessionals.length > 0 && (
            filialAtiva ? (
              <TerapeutasTable
                professionals={filteredProfessionals}
                onSuccess={fetchProfessionals}
                formatCPF={formatCPF}
                formatDate={formatDate}
              />
            ) : (
              <Accordion
                type="multiple"
                defaultValue={agruparPorFilial(
                  filteredProfessionals,
                  (p) => filiais.find((f) => f.id === p.filialId) ?? null
                ).map((g) => g.filial?.id ?? "_sem_filial")}
              >
                {agruparPorFilial(
                  filteredProfessionals,
                  (p) => filiais.find((f) => f.id === p.filialId) ?? null
                ).map((grupo) => (
                  <AccordionItem key={grupo.filial?.id ?? "_sem_filial"} value={grupo.filial?.id ?? "_sem_filial"}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: grupo.filial?.cor ?? "#94a3b8" }}
                        />
                        <span className="font-medium">{grupo.filial?.nome ?? "Sem filial"}</span>
                        <Badge variant="secondary" className="text-xs">{grupo.items.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <TerapeutasTable
                        professionals={grupo.items}
                        onSuccess={fetchProfessionals}
                        formatCPF={formatCPF}
                        formatDate={formatDate}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )
          )}

          {!loading &&
            !error &&
            professionals.length > 0 &&
            filteredProfessionals.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum resultado encontrado
                </h3>
                <p className="text-muted-foreground">
                  Tente ajustar os termos da sua busca.
                </p>
              </div>
            )}
        </Panel>
      </div>
    </MainLayout>
  );
}

export default function TerapeutasPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'terapeutas', action: 'VIEW' }}>
      <TerapeutasPageContent />
    </ProtectedRoute>
  );
}
