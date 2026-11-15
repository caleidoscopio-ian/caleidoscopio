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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Search, Filter, Calendar, Clock, Loader2, FileText } from "lucide-react";
import { idadeEmAnos } from "@/lib/datas-fuso";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useFilial } from "@/hooks/useFilial";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { agruparPorFilial } from "@/lib/agrupar-filial";
import { PageHeader, Panel, PersonAvatar, SearchField, StatCard, StatusPill } from "@/components/kit";

interface ResponsavelData {
  id?: string;
  nome: string;
  telefone?: string | null;
  parentesco: string;
  cpf?: string | null;
  financeiro: boolean;
}

interface ConvenioVinculado {
  id?: string;
  convenioId: string;
  numero_carteirinha?: string | null;
  principal: boolean;
  convenio?: { id: string; razao_social: string; nome_fantasia: string | null };
}

interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  email?: string;
  phone?: string;
  address?: string;
  sexo?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  guardianName?: string;
  guardianPhone?: string;
  healthInsurance?: string;
  healthInsuranceNumber?: string;
  convenioId?: string | null;
  convenio?: { id: string; razao_social: string; nome_fantasia: string | null } | null;
  profissionalId?: string | null;
  profissional?: {
    id: string;
    nome: string;
    especialidade: string;
  } | null;
  filialId?: string | null;
  filial?: { id: string; nome: string; cor?: string | null } | null;
  responsaveis?: ResponsavelData[];
  convenios?: ConvenioVinculado[];
  createdAt: string;
  updatedAt: string;
}

interface PatientsResponse {
  success: boolean;
  data: Patient[];
  total: number;
  error?: string;
}

function PacientesTable({
  patients,
  onSuccess,
  calculateAge,
  formatDate,
  onAgendar,
}: {
  patients: Patient[];
  onSuccess: () => void;
  calculateAge: (birthDate: string) => number;
  formatDate: (dateString: string) => string;
  onAgendar: () => void;
}) {
  return (
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
        {patients.map((patient) => (
          <TableRow key={patient.id}>
            <TableCell>
              <div className="flex min-w-0 items-center gap-3">
                <PersonAvatar nome={patient.name} tamanho={36} />
                <span className="truncate font-semibold text-ink">{patient.name}</span>
              </div>
            </TableCell>
            {/* Cada célula é no máximo duas linhas de UMA linha cada: o texto
                longo corta com reticências e mostra o valor inteiro no `title`.
                Antes "Jenifer F Granciele Almeida da Silva" quebrava em quatro
                linhas e a linha do paciente ficava com o dobro da altura das
                outras. */}
            <TableCell className="whitespace-nowrap">
              <span className="tabular">{calculateAge(patient.birthDate)} anos</span>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <span className="tabular text-[0.82rem] text-ink-3">{patient.cpf}</span>
            </TableCell>
            <TableCell>
              {patient.profissional ? (
                <div className="max-w-[11rem] min-w-0">
                  <p className="truncate" title={patient.profissional.nome}>
                    {patient.profissional.nome}
                  </p>
                  {patient.profissional.especialidade && (
                    <p className="truncate text-[0.75rem] text-ink-3">
                      {patient.profissional.especialidade}
                    </p>
                  )}
                </div>
              ) : (
                <StatusPill tom="neutral">Não atribuído</StatusPill>
              )}
            </TableCell>
            <TableCell>
              {patient.phone || patient.email ? (
                <div className="max-w-[12rem] min-w-0">
                  {patient.phone && (
                    <p className="tabular truncate">{patient.phone}</p>
                  )}
                  {patient.email && (
                    <p className="truncate text-[0.75rem] text-ink-3" title={patient.email}>
                      {patient.email}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-ink-4">—</span>
              )}
            </TableCell>
            <TableCell>
              {patient.guardianName || patient.guardianPhone ? (
                <div className="max-w-[11rem] min-w-0">
                  {patient.guardianName && (
                    <p className="truncate" title={patient.guardianName}>
                      {patient.guardianName}
                    </p>
                  )}
                  {patient.guardianPhone && (
                    <p className="tabular truncate text-[0.75rem] text-ink-3">
                      {patient.guardianPhone}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-ink-4">—</span>
              )}
            </TableCell>
            <TableCell>
              {patient.convenio || patient.healthInsurance ? (
                <div className="max-w-[10rem] min-w-0">
                  <p
                    className="truncate"
                    title={
                      patient.convenio
                        ? patient.convenio.nome_fantasia || patient.convenio.razao_social
                        : patient.healthInsurance
                    }
                  >
                    {patient.convenio
                      ? patient.convenio.nome_fantasia || patient.convenio.razao_social
                      : patient.healthInsurance}
                  </p>
                  {patient.healthInsuranceNumber && (
                    <p className="tabular truncate text-[0.75rem] text-ink-3">
                      {patient.healthInsuranceNumber}
                    </p>
                  )}
                </div>
              ) : (
                <StatusPill tom="neutral">Particular</StatusPill>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <span className="tabular text-[0.82rem] text-ink-3">
                {formatDate(patient.createdAt)}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex flex-nowrap items-center justify-end gap-1.5">
                <Link href={`/prontuario/${patient.id}`}>
                  <Button variant="outline" size="sm" title="Visualizar Prontuário">
                    <FileText className="h-4 w-4" />
                  </Button>
                </Link>
                <PacienteDetailsDialog patient={patient} onSuccess={onSuccess} />
                <EditarPacienteForm
                  patient={patient}
                  onSuccess={onSuccess}
                />
                <DeletePatientDialog
                  patient={patient}
                  onSuccess={onSuccess}
                />
                <Button
                  size="sm"
                  onClick={onAgendar}
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
  );
}

function PacientesPageContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { filialAtiva } = useFilial();
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

      const params = new URLSearchParams();
      if (filialAtiva?.id) params.set("filialId", filialAtiva.id);

      const response = await fetch(`/api/pacientes?${params}`, {
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
  }, [isAuthenticated, user, filialAtiva?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtrar pacientes baseado no termo de busca
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf.includes(searchTerm) ||
      (patient.email &&
        patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calcular idade baseada na data de nascimento
  const calculateAge = (birthDate: string) => idadeEmAnos(birthDate) ?? 0;

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          titulo="Gestão de Pacientes"
          subtitulo="Gerencie os pacientes e seus atendimentos"
          acoes={
            <NovoPacienteForm onSuccess={fetchPatients} />
          }
        />

        {/* Estatísticas */}
        <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <StatCard
            tom="blue"
            size="hero"
            icone={<Users />}
            rotulo="Total Pacientes"
            valor={loading ? "..." : patients.length}
          />

          <StatCard
            tom="lavender"
            icone={<Users />}
            rotulo="Ativos"
            valor={loading ? "..." : patients.length}
            hint="Todos os pacientes estão ativos"
          />

          <StatCard
            tom="mint"
            icone={<Calendar />}
            rotulo="Cadastrados Este Mês"
            valor={loading ? "..." : patients.filter((p) => { const created = new Date(p.createdAt); const now = new Date(); return ( created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear() ); }).length}
          />

          <StatCard
            tom="peach"
            icone={<Clock />}
            rotulo="Média de Idade"
            valor={loading ? "..." : patients.length > 0 ? Math.round( patients.reduce( (acc, p) => acc + calculateAge(p.birthDate), 0 ) / patients.length ) + " anos" : "0 anos"}
          />
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <SearchField
                placeholder="Buscar por nome, CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <Button variant="outline" disabled>
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Tabela de Pacientes */}
        <Panel
          titulo={<>Lista de Pacientes {!loading && ( <Badge variant="secondary" className="ml-2"> {filteredPatients.length} de {patients.length} </Badge> )}</>}
        >

          {error && (
            <div className="text-center py-8">
              <div className="text-danger-ink mb-4">{error}</div>
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
            filialAtiva ? (
              <PacientesTable
                patients={filteredPatients}
                onSuccess={fetchPatients}
                calculateAge={calculateAge}
                formatDate={formatDate}
                onAgendar={() => router.push("/agenda")}
              />
            ) : (
              <Accordion
                type="multiple"
                defaultValue={agruparPorFilial(filteredPatients, (p) => p.filial ?? null).map(
                  (g) => g.filial?.id ?? "_sem_filial"
                )}
              >
                {agruparPorFilial(filteredPatients, (p) => p.filial ?? null).map((grupo) => (
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
                      <PacientesTable
                        patients={grupo.items}
                        onSuccess={fetchPatients}
                        calculateAge={calculateAge}
                        formatDate={formatDate}
                        onAgendar={() => router.push("/agenda")}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )
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
        </Panel>
      </div>
    </MainLayout>
  );
}

export default function PacientesPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'pacientes', action: 'VIEW' }}>
      <PacientesPageContent />
    </ProtectedRoute>
  )
}
