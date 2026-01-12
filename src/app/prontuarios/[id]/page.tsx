/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Loader2,
  ArrowLeft,
  Edit,
  User,
  Calendar,
  Download,
  Stethoscope,
  FileCheck,
  Paperclip,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProntuarioDetalhes {
  id: string;
  patient: {
    id: string;
    nome: string;
    nascimento: string;
    foto?: string;
    cpf?: string;
    telefone?: string;
    email?: string;
  };
  professional: {
    id: string;
    nome: string;
  };
  sessionDate: string;
  serviceType: string;
  clinicalEvolution: string;
  observations?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ProntuarioDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [prontuario, setProntuario] = useState<ProntuarioDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prontuarioId = params.id as string;

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Prontuários", href: "/prontuarios" },
    { label: "Detalhes" },
  ];

  // Buscar detalhes do prontuário
  const fetchProntuario = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/prontuarios/${prontuarioId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar prontuário");
      }

      if (result.success) {
        setProntuario(result.data);
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Erro ao buscar prontuário:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar prontuário"
      );
      toast({
        title: "Erro",
        description:
          err instanceof Error ? err.message : "Erro ao carregar prontuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user && prontuarioId) {
      fetchProntuario();
    }
  }, [isAuthenticated, user, prontuarioId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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

  const handleVoltar = () => {
    router.push("/prontuarios");
  };

  const handleEditar = () => {
    router.push(`/prontuarios/${prontuarioId}/editar`);
  };

  const handleGerarPDF = () => {
    toast({
      title: "Em desenvolvimento",
      description:
        "Funcionalidade de exportação em PDF será implementada em breve.",
    });
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando prontuário...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (error || !prontuario) {
    return (
      <ProtectedRoute>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar prontuário
              </h3>
              <p className="text-muted-foreground mb-4">
                {error || "Prontuário não encontrado"}
              </p>
              <Button onClick={handleVoltar} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  Prontuário
                </h1>
                <Badge variant="default" className="bg-primary">
                  <FileCheck className="h-3 w-3 mr-1" />
                  Registro Clínico
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Registro completo da sessão clínica
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVoltar} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleEditar}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button onClick={handleGerarPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>

          {/* Informações Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações do Paciente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nome
                  </label>
                  <p className="text-base font-medium">
                    {prontuario.patient.nome}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Idade
                    </label>
                    <p className="text-base">
                      {calculateAge(prontuario.patient.nascimento)} anos
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Nascimento
                    </label>
                    <p className="text-base">
                      {new Date(
                        prontuario.patient.nascimento
                      ).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                {(prontuario.patient.telefone || prontuario.patient.email) && (
                  <div className="grid grid-cols-1 gap-3">
                    {prontuario.patient.telefone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Telefone
                        </label>
                        <p className="text-base">
                          {prontuario.patient.telefone}
                        </p>
                      </div>
                    )}
                    {prontuario.patient.email && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Email
                        </label>
                        <p className="text-base">{prontuario.patient.email}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações do Profissional e Sessão */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Profissional e Sessão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Profissional Responsável
                  </label>
                  <p className="text-base font-medium">
                    {prontuario.professional.nome}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Data da Sessão
                  </label>
                  <p className="text-base">
                    {formatDateOnly(prontuario.sessionDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Tipo de Atendimento
                  </label>
                  <p className="text-base">{prontuario.serviceType}</p>
                </div>
                <Separator />
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Criado em: {formatDate(prontuario.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Atualizado em: {formatDate(prontuario.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Evolução Clínica */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Clínica</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base whitespace-pre-wrap">
                {prontuario.clinicalEvolution}
              </p>
            </CardContent>
          </Card>

          {/* Observações */}
          {prontuario.observations && (
            <Card>
              <CardHeader>
                <CardTitle>Observações Adicionais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">
                  {prontuario.observations}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Anexos */}
          {prontuario.attachments && prontuario.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Anexos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {prontuario.attachments.map((attachment, index) => (
                    <li key={index} className="text-sm">
                      <a
                        href={attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Anexo {index + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
