/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { NovoProntuarioForm } from "@/components/forms/novo-prontuario-form";
import { EditarProntuarioForm } from "@/components/forms/editar-prontuario-form";
import { ProntuarioDetailsDialog } from "@/components/prontuario-details-dialog";
import { DeleteProntuarioDialog } from "@/components/delete-prontuario-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Loader2,
  User,
  Stethoscope,
  BarChart,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  PageHeader,
  Panel,
  SearchField,
  StatCard,
  StatusPill,
  PersonAvatar,
} from "@/components/kit";

interface Patient {
  id: string;
  name: string;
}

interface Professional {
  id: string;
  name: string;
  specialty: string;
}

interface MedicalRecord {
  id: string;
  patient: Patient;
  professional: Professional;
  sessionDate: string;
  serviceType: string;
  clinicalEvolution: string;
  observations?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

interface MedicalRecordsResponse {
  success: boolean;
  data: MedicalRecord[];
  total: number;
  error?: string;
}

function ProntuariosPageContent() {
  const { user, isAuthenticated } = useAuth();
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProfessional, setFilterProfessional] = useState("all");
  const [filterServiceType, setFilterServiceType] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Registro de Sessão" },
  ];

  // Buscar prontuários da API
  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      console.log("🔍 Frontend - Enviando dados do usuário para API:");
      console.log(`   👤 Usuário: ${user.name} (${user.email})`);
      console.log(`   🏥 Clínica: ${user.tenant?.name} (${user.tenant?.id})`);
      console.log(`   🔑 Role: ${user.role}`);

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/prontuarios", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result: MedicalRecordsResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar prontuários");
      }

      if (result.success) {
        setMedicalRecords(result.data);
        console.log(
          `✅ Frontend - Carregados ${result.data.length} prontuários da clínica "${user.tenant?.name}"`
        );
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Frontend - Erro ao buscar prontuários:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar prontuários"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchMedicalRecords();
    }
  }, [isAuthenticated, user]);

  // Filtrar prontuários baseado nos filtros aplicados
  const filteredRecords = medicalRecords.filter((record) => {
    const matchesSearch =
      record.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.professional.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      record.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.clinicalEvolution.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProfessional =
      !filterProfessional ||
      filterProfessional === "all" ||
      record.professional.id === filterProfessional;
    const matchesServiceType =
      !filterServiceType ||
      filterServiceType === "all" ||
      record.serviceType === filterServiceType;

    return matchesSearch && matchesProfessional && matchesServiceType;
  });

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Tipos de atendimento comuns
  const tiposAtendimento = [
    "Consulta Inicial",
    "Sessão de Terapia",
    "Avaliação",
    "Reavaliação",
    "Orientação Familiar",
    "Atendimento Conjunto",
    "Sessão de Grupo",
    "Acompanhamento",
  ];

  // Estatísticas
  const totalSessoes = medicalRecords.length;
  const sessoesEsteMes = medicalRecords.filter((record) => {
    const created = new Date(record.createdAt);
    const now = new Date();
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }).length;

  const profissionaisUnicos = [
    ...new Set(medicalRecords.map((r) => r.professional.id)),
  ].length;
  const pacientesAtendidos = [
    ...new Set(medicalRecords.map((r) => r.patient.id)),
  ].length;

  // Obter lista única de profissionais para filtro
  const profissionaisDisponiveis = [
    ...new Map(
      medicalRecords.map((r) => [r.professional.id, r.professional])
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          titulo="Registros de Sessão"
          subtitulo="Histórico de atendimentos, evoluções clínicas e registros"
          acoes={
            <NovoProntuarioForm onSuccess={fetchMedicalRecords} />
          }
        />

        {/* Estatísticas */}
        <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <StatCard
            tom="blue"
            size="hero"
            icone={<FileText />}
            rotulo="Total Registros"
            valor={loading ? "..." : totalSessoes}
          />

          <StatCard
            tom="lavender"
            icone={<Calendar className="text-brand" />}
            rotulo="Este Mês"
            valor={<span className="text-brand">{loading ? "..." : sessoesEsteMes}</span>}
            hint="Registros criados"
          />

          <StatCard
            tom="mint"
            icone={<User />}
            rotulo="Pacientes Atendidos"
            valor={<span className="text-success-ink">{loading ? "..." : pacientesAtendidos}</span>}
            hint="Pacientes únicos"
          />

          <StatCard
            tom="peach"
            icone={<Stethoscope />}
            rotulo="Profissionais Ativos"
            valor={loading ? "..." : profissionaisUnicos}
            hint="Com registros"
          />
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <SearchField
                placeholder="Buscar por paciente, profissional, tipo ou evolução..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>

          <Select
            value={filterProfessional}
            onValueChange={setFilterProfessional}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos profissionais</SelectItem>
              {profissionaisDisponiveis.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  {prof.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterServiceType}
            onValueChange={setFilterServiceType}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo atendimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {tiposAtendimento.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setFilterProfessional("all");
              setFilterServiceType("all");
            }}
          >
            <Filter className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>

        {/* Tabela de Prontuários */}
        <Panel
          icone={<BarChart />}
          titulo="Histórico de Atendimentos"
          subtitulo="Evoluções clínicas registradas por sessão"
          acoes={
            !loading && (
              <StatusPill tom="neutral">
                {filteredRecords.length} de {medicalRecords.length}
              </StatusPill>
            )
          }
        >

          {error && (
            <div className="text-center py-8">
              <div className="text-danger-ink mb-4">{error}</div>
              <Button onClick={fetchMedicalRecords} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          )}

          {loading && !error && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                Carregando registros...
              </p>
            </div>
          )}

          {!loading && !error && medicalRecords.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhum registro encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Comece registrando o primeiro atendimento.
              </p>
              <NovoProntuarioForm onSuccess={fetchMedicalRecords} />
            </div>
          )}

          {!loading && !error && filteredRecords.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Sessão</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Tipo Atendimento</TableHead>
                  <TableHead>Evolução Clínica</TableHead>
                  <TableHead>Anexos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <Calendar className="size-4 shrink-0 text-ink-4" aria-hidden />
                        <span className="tabular text-[0.82rem]">
                          {formatDate(record.sessionDate)}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <PersonAvatar nome={record.patient.name} tamanho={32} />
                        <span className="truncate font-semibold text-ink">
                          {record.patient.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="truncate">{record.professional.name}</p>
                      {record.professional.specialty && (
                        <StatusPill tom="violet" className="mt-1">
                          {record.professional.specialty}
                        </StatusPill>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill tom="info">{record.serviceType}</StatusPill>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate text-[0.82rem]">{record.clinicalEvolution}</p>
                    </TableCell>
                    <TableCell>
                      {record.attachments.length > 0 ? (
                        <StatusPill tom="info">
                          {record.attachments.length} arquivo(s)
                        </StatusPill>
                      ) : (
                        <span className="text-[0.82rem] text-ink-4">Nenhum</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="tabular text-[0.82rem] text-ink-3">
                        {formatDateTime(record.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <ProntuarioDetailsDialog record={record} />
                        <EditarProntuarioForm
                          record={record}
                          onSuccess={fetchMedicalRecords}
                        />
                        <DeleteProntuarioDialog
                          record={record}
                          onSuccess={fetchMedicalRecords}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading &&
            !error &&
            medicalRecords.length > 0 &&
            filteredRecords.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum resultado encontrado
                </h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros ou termos da sua busca.
                </p>
              </div>
            )}
        </Panel>
      </div>
    </MainLayout>
  );
}

export default function ProntuariosPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'prontuarios', action: 'VIEW' }}>
      <ProntuariosPageContent />
    </ProtectedRoute>
  )
}
