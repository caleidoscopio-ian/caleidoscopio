/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { NovoPacienteForm } from "@/components/forms/novo-paciente-form";
import { EditarPacienteForm } from "@/components/forms/editar-paciente-form";
import { PacienteDetailsDialog } from "@/components/paciente-details-dialog";
import { DeletePatientDialog } from "@/components/delete-patient-dialog";
import Link from "next/link";
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
import { Users, Search, Filter, Calendar, Clock, Loader2, FileText } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  email?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  healthInsurance?: string;
  healthInsuranceNumber?: string;
  profissionalId?: string;
  profissional?: {
    id: string;
    nome: string;
    especialidade: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PatientsResponse {
  success: boolean;
  data: Patient[];
  total: number;
  error?: string;
}

export default function PacientesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pacientes" },
  ];

  // Buscar pacientes da API
  const fetchPatients = async () => {
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

      const response = await fetch("/api/pacientes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result: PatientsResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar pacientes");
      }

      if (result.success) {
        setPatients(result.data);
        console.log(
          `✅ Frontend - Carregados ${result.data.length} pacientes da clínica "${user.tenant?.name}"`
        );
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Frontend - Erro ao buscar pacientes:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar pacientes"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPatients();
    }
  }, [isAuthenticated, user]);

  // Filtrar pacientes baseado no termo de busca
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf.includes(searchTerm) ||
      (patient.email &&
        patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calcular idade baseada na data de nascimento
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  };

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gestão de Pacientes
            </h1>
            <p className="text-muted-foreground">
              Gerencie os pacientes e seus atendimentos
            </p>
          </div>
          <NovoPacienteForm onSuccess={fetchPatients} />
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pacientes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : patients.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : patients.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Todos os pacientes estão ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cadastrados Este Mês
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading
                  ? "..."
                  : patients.filter((p) => {
                      const created = new Date(p.createdAt);
                      const now = new Date();
                      return (
                        created.getMonth() === now.getMonth() &&
                        created.getFullYear() === now.getFullYear()
                      );
                    }).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Média de Idade
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading
                  ? "..."
                  : patients.length > 0
                    ? Math.round(
                        patients.reduce(
                          (acc, p) => acc + calculateAge(p.birthDate),
                          0
                        ) / patients.length
                      ) + " anos"
                    : "0 anos"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou email..."
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

        {/* Tabela de Pacientes */}
        <Card>
          <CardHeader>
            <CardTitle>
              Lista de Pacientes
              {!loading && (
                <Badge variant="secondary" className="ml-2">
                  {filteredPatients.length} de {patients.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={fetchPatients} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            )}

            {loading && !error && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando pacientes...</p>
              </div>
            )}

            {!loading && !error && patients.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum paciente encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando o primeiro paciente da sua clínica.
                </p>
                <NovoPacienteForm onSuccess={fetchPatients} />
              </div>
            )}

            {!loading && !error && filteredPatients.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Terapeuta</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Cadastrado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.name}
                      </TableCell>
                      <TableCell>
                        {calculateAge(patient.birthDate)} anos
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {patient.cpf}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {patient.profissional ? (
                            <>
                              <div className="font-medium">
                                {patient.profissional.nome}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {patient.profissional.especialidade}
                              </div>
                            </>
                          ) : (
                            <Badge variant="outline">Não atribuído</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {patient.phone && <div>{patient.phone}</div>}
                          {patient.email && (
                            <div className="text-muted-foreground">
                              {patient.email}
                            </div>
                          )}
                          {!patient.phone && !patient.email && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {patient.guardianName && (
                            <div>{patient.guardianName}</div>
                          )}
                          {patient.guardianPhone && (
                            <div className="text-muted-foreground">
                              {patient.guardianPhone}
                            </div>
                          )}
                          {!patient.guardianName && !patient.guardianPhone && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {patient.healthInsurance && (
                            <div>{patient.healthInsurance}</div>
                          )}
                          {patient.healthInsuranceNumber && (
                            <div className="text-muted-foreground font-mono text-xs">
                              {patient.healthInsuranceNumber}
                            </div>
                          )}
                          {!patient.healthInsurance &&
                            !patient.healthInsuranceNumber && (
                              <Badge variant="outline">Particular</Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(patient.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/prontuario/${patient.id}`}>
                            <Button variant="outline" size="sm" title="Visualizar Prontuário">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                          <PacienteDetailsDialog patient={patient} />
                          <EditarPacienteForm
                            patient={patient}
                            onSuccess={fetchPatients}
                          />
                          <DeletePatientDialog
                            patient={patient}
                            onSuccess={fetchPatients}
                          />
                          <Button
                            size="sm"
                            onClick={() => router.push("/agenda")}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Agendar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!loading &&
              !error &&
              patients.length > 0 &&
              filteredPatients.length === 0 && (
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
