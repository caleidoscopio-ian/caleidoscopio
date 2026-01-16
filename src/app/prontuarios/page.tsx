/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { NovoProntuarioForm } from "@/components/forms/novo-prontuario-form";
import { EditarProntuarioForm } from "@/components/forms/editar-prontuario-form";
import { ProntuarioDetailsDialog } from "@/components/prontuario-details-dialog";
import { DeleteProntuarioDialog } from "@/components/delete-prontuario-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function ProntuariosPage() {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Registros de Sessão
            </h1>
            <p className="text-muted-foreground">
              Histórico de atendimentos, evoluções clínicas e registros
            </p>
          </div>
          <NovoProntuarioForm onSuccess={fetchMedicalRecords} />
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Registros
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : totalSessoes}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading ? "..." : sessoesEsteMes}
              </div>
              <p className="text-xs text-muted-foreground">Registros criados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pacientes Atendidos
              </CardTitle>
              <User className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? "..." : pacientesAtendidos}
              </div>
              <p className="text-xs text-muted-foreground">Pacientes únicos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Profissionais Ativos
              </CardTitle>
              <Stethoscope className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {loading ? "..." : profissionaisUnicos}
              </div>
              <p className="text-xs text-muted-foreground">Com registros</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, profissional, tipo ou evolução..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Histórico de Atendimentos
              {!loading && (
                <Badge variant="secondary" className="ml-2">
                  {filteredRecords.length} de {medicalRecords.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
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
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(record.sessionDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {record.patient.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {record.professional.name}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {record.professional.specialty}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{record.serviceType}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate text-sm">
                          {record.clinicalEvolution}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.attachments.length > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700"
                          >
                            {record.attachments.length} arquivo(s)
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(record.createdAt)}
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
