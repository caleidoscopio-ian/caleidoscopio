/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { EditarTerapeutaForm } from "@/components/forms/editar-terapeuta-form";
import { TerapeutaDetailsDialog } from "@/components/terapeuta-details-dialog";
import { DeleteTerapeutaDialog } from "@/components/delete-terapeuta-dialog";
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
  Users,
  Search,
  Filter,
  Calendar,
  Clock,
  Loader2,
  Stethoscope,
  GraduationCap,
  UserCheck,
} from "lucide-react";

interface Professional {
  id: string;
  name: string;
  cpf: string;
  phone?: string;
  email?: string;
  specialty: string;
  professionalRegistration?: string;
  roomAccess: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProfessionalsResponse {
  success: boolean;
  data: Professional[];
  total: number;
  error?: string;
}

export default function TerapeutasPage() {
  const { user, isAuthenticated } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Terapeutas" },
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

      const response = await fetch("/api/terapeutas", {
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
  }, [isAuthenticated, user]);

  // Filtrar terapeutas baseado no termo de busca
  const filteredProfessionals = professionals.filter(
    (professional) =>
      professional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.cpf.includes(searchTerm) ||
      professional.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Lista de especialidades comuns
  const especialidades = [
    "Fonoaudiologia",
    "Terapia Ocupacional",
    "Psicologia",
    "Fisioterapia",
    "Neuropsicologia",
    "Psicopedagogia",
    "Musicoterapia",
    "Educação Física Adaptada",
  ];

  const especialidadeStats = especialidades
    .map((esp) => ({
      name: esp,
      count: professionals.filter((p) => p.specialty === esp).length,
    }))
    .filter((stat) => stat.count > 0);

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gestão de Terapeutas
            </h1>
            <p className="text-muted-foreground">
              Gerencie os profissionais da clínica e suas especialidades
            </p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Terapeutas
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : professionals.length}
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
                {loading ? "..." : professionals.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Todos os terapeutas estão ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Especialidades
              </CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : especialidadeStats.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Diferentes áreas de atuação
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
                  : professionals.filter((p) => {
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
        </div>

        {/* Estatísticas por Especialidade */}
        {!loading && especialidadeStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Distribuição por Especialidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {especialidadeStats.map((stat) => (
                  <div
                    key={stat.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="text-sm font-medium">{stat.name}</span>
                    <Badge variant="secondary">{stat.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
        <Card>
          <CardHeader>
            <CardTitle>
              Lista de Terapeutas
              {!loading && (
                <Badge variant="secondary" className="ml-2">
                  {filteredProfessionals.length} de {professionals.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={fetchProfessionals} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            )}

            {loading && !error && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Carregando terapeutas...
                </p>
              </div>
            )}

            {!loading && !error && professionals.length === 0 && (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum terapeuta encontrado
                </h3>
                <p className="text-muted-foreground">
                  Os terapeutas devem ser criados através da página de Usuários.
                </p>
              </div>
            )}

            {!loading && !error && filteredProfessionals.length > 0 && (
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
                  {filteredProfessionals.map((professional) => (
                    <TableRow key={professional.id}>
                      <TableCell className="font-medium">
                        {professional.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700"
                        >
                          {professional.specialty}
                        </Badge>
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
                          <TerapeutaDetailsDialog professional={professional} />
                          <EditarTerapeutaForm
                            professional={professional}
                            onSuccess={fetchProfessionals}
                          />
                          <DeleteTerapeutaDialog
                            professional={professional}
                            onSuccess={fetchProfessionals}
                          />
                          <Button size="sm">
                            <Calendar className="h-4 w-4 mr-1" />
                            Agenda
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
