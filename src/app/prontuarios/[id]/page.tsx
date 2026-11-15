/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
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
import { idadeEmAnos } from "@/lib/datas-fuso";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, Panel } from "@/components/kit";

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
    { label: "Registro de Sessão", href: "/prontuarios" },
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

  const calculateAge = (birthDate: string) => idadeEmAnos(birthDate) ?? 0;

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
      <ProtectedRoute requiredPermission={{ resource: 'prontuarios', action: 'VIEW' }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando registro...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (error || !prontuario) {
    return (
      <ProtectedRoute requiredPermission={{ resource: 'prontuarios', action: 'VIEW' }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar registro
              </h3>
              <p className="text-muted-foreground mb-4">
                {error || "Registro não encontrado"}
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
    <ProtectedRoute requiredPermission={{ resource: 'prontuarios', action: 'VIEW' }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <PageHeader
            voltar={{ onClick: handleVoltar }}
            titulo="Registro de Sessão"
            subtitulo="Registro completo da sessão clínica"
            meta={
              <Badge variant="outline" className="bg-brand-soft text-brand">
                <FileCheck className="h-3 w-3 mr-1" />
                Registro Clínico
              </Badge>
            }
            acoes={
              <>
                <Button onClick={handleEditar}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button onClick={handleGerarPDF} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </>
            }
          />

          {/* Informações Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações do Paciente */}
            <Panel icone={<User />} titulo="Paciente">
              <div className="space-y-4">
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
              </div>
            </Panel>

            {/* Informações do Profissional e Sessão */}
            <Panel icone={<Stethoscope />} titulo="Profissional e Sessão">
              <div className="space-y-4">
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
              </div>
            </Panel>
          </div>

          {/* Evolução Clínica */}
          <Panel titulo="Evolução Clínica">
            <p className="text-base whitespace-pre-wrap">
              {prontuario.clinicalEvolution}
            </p>
          </Panel>

          {/* Observações */}
          {prontuario.observations && (
            <Panel titulo="Observações Adicionais">
              <p className="text-base whitespace-pre-wrap">
                {prontuario.observations}
              </p>
            </Panel>
          )}

          {/* Anexos */}
          {prontuario.attachments && prontuario.attachments.length > 0 && (
            <Panel icone={<Paperclip />} titulo="Anexos">
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
            </Panel>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
