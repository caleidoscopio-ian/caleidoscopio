/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
  CheckCircle,
  Clock,
  User,
  Calendar,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnamneseDetalhes {
  id: string;
  paciente: {
    id: string;
    nome: string;
    nascimento: string;
    foto?: string;
    cpf?: string;
    telefone?: string;
    email?: string;
  };
  profissionalId: string;
  historiaDesenvolvimento?: any;
  comportamentosExcessivos?: string;
  comportamentosDeficitarios?: string;
  comportamentosProblema?: any;
  rotinaDiaria?: any;
  ambienteFamiliar?: string;
  ambienteEscolar?: string;
  preferencias?: any;
  documentosAnexos?: string[];
  habilidadesCriticas?: any;
  observacoesGerais?: string;
  status: "RASCUNHO" | "FINALIZADA";
  finalizadaEm?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AnamneseDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [anamnese, setAnamnese] = useState<AnamneseDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const anamneseId = params.id as string;

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Anamneses", href: "/anamnese" },
    { label: "Detalhes" },
  ];

  // Buscar detalhes da anamnese
  const fetchAnamnese = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/anamneses/${anamneseId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar anamnese");
      }

      if (result.success) {
        setAnamnese(result.data);
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Erro ao buscar anamnese:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar anamnese"
      );
      toast({
        title: "Erro",
        description:
          err instanceof Error ? err.message : "Erro ao carregar anamnese",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user && anamneseId) {
      fetchAnamnese();
    }
  }, [isAuthenticated, user, anamneseId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
    router.push("/anamnese");
  };

  const handleEditar = () => {
    router.push(`/anamnese/${anamneseId}/editar`);
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
              <p className="text-muted-foreground">Carregando anamnese...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (error || !anamnese) {
    return (
      <ProtectedRoute>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar anamnese
              </h3>
              <p className="text-muted-foreground mb-4">
                {error || "Anamnese não encontrada"}
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
                <h1 className="text-3xl font-bold tracking-tight">Anamnese</h1>
                {anamnese.status === "FINALIZADA" ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Finalizada
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-orange-600 text-orange-600"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Rascunho
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Avaliação inicial completa do paciente
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVoltar} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              {anamnese.status === "RASCUNHO" && (
                <Button onClick={handleEditar}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
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
                    {anamnese.paciente.nome}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Idade
                    </label>
                    <p className="text-base">
                      {calculateAge(anamnese.paciente.nascimento)} anos
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Nascimento
                    </label>
                    <p className="text-base">
                      {new Date(
                        anamnese.paciente.nascimento
                      ).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                {(anamnese.paciente.telefone || anamnese.paciente.email) && (
                  <div className="grid grid-cols-1 gap-3">
                    {anamnese.paciente.telefone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Telefone
                        </label>
                        <p className="text-base">
                          {anamnese.paciente.telefone}
                        </p>
                      </div>
                    )}
                    {anamnese.paciente.email && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Email
                        </label>
                        <p className="text-base">{anamnese.paciente.email}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações do Profissional */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profissional Responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nome
                  </label>
                  <p className="text-base font-medium">
                    {user?.id === anamnese.profissionalId
                      ? user.name
                      : "Profissional não identificado"}
                  </p>
                </div>
                <Separator />
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Criada em: {formatDate(anamnese.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Atualizada em: {formatDate(anamnese.updatedAt)}</span>
                  </div>
                  {anamnese.finalizadaEm && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>
                        Finalizada em: {formatDate(anamnese.finalizadaEm)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Etapa 1: História do Desenvolvimento */}
          {anamnese.historiaDesenvolvimento && (
            <Card>
              <CardHeader>
                <CardTitle>1. História do Desenvolvimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {anamnese.historiaDesenvolvimento.gestacao && (
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">
                      Gestação
                    </label>
                    <p className="text-base mt-1 whitespace-pre-wrap">
                      {anamnese.historiaDesenvolvimento.gestacao}
                    </p>
                  </div>
                )}
                {anamnese.historiaDesenvolvimento.parto && (
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">
                      Parto
                    </label>
                    <p className="text-base mt-1 whitespace-pre-wrap">
                      {anamnese.historiaDesenvolvimento.parto}
                    </p>
                  </div>
                )}
                {anamnese.historiaDesenvolvimento.marcos && (
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">
                      Marcos do Desenvolvimento
                    </label>
                    <p className="text-base mt-1 whitespace-pre-wrap">
                      {anamnese.historiaDesenvolvimento.marcos}
                    </p>
                  </div>
                )}
                {anamnese.historiaDesenvolvimento.desenvolvimento && (
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">
                      Desenvolvimento Geral
                    </label>
                    <p className="text-base mt-1 whitespace-pre-wrap">
                      {anamnese.historiaDesenvolvimento.desenvolvimento}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Etapa 2: Comportamentos Excessivos e Deficitários */}
          {(anamnese.comportamentosExcessivos ||
            anamnese.comportamentosDeficitarios) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  2. Comportamentos Excessivos e Deficitários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {anamnese.comportamentosExcessivos && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Comportamentos Excessivos
                    </label>
                    <p className="text-base mt-2 whitespace-pre-wrap">
                      {anamnese.comportamentosExcessivos}
                    </p>
                  </div>
                )}
                {anamnese.comportamentosDeficitarios && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Comportamentos Deficitários
                    </label>
                    <p className="text-base mt-2 whitespace-pre-wrap">
                      {anamnese.comportamentosDeficitarios}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Etapa 3: Comportamentos-Problema (ABC) */}
          {anamnese.comportamentosProblema && (
            <Card>
              <CardHeader>
                <CardTitle>
                  3. Comportamentos-Problema (Análise Funcional ABC)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">
                  {typeof anamnese.comportamentosProblema === "string"
                    ? anamnese.comportamentosProblema
                    : Array.isArray(anamnese.comportamentosProblema) &&
                        anamnese.comportamentosProblema[0]?.descricao
                      ? anamnese.comportamentosProblema[0].descricao
                      : ""}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Etapa 4: Rotina Diária */}
          {anamnese.rotinaDiaria && (
            <Card>
              <CardHeader>
                <CardTitle>4. Rotina Diária</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {anamnese.rotinaDiaria.acordar && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">
                        Acordar
                      </label>
                      <p className="text-base mt-1 whitespace-pre-wrap">
                        {anamnese.rotinaDiaria.acordar}
                      </p>
                    </div>
                  )}
                  {anamnese.rotinaDiaria.cafe && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">
                        Café da Manhã
                      </label>
                      <p className="text-base mt-1 whitespace-pre-wrap">
                        {anamnese.rotinaDiaria.cafe}
                      </p>
                    </div>
                  )}
                  {anamnese.rotinaDiaria.escola && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">
                        Escola
                      </label>
                      <p className="text-base mt-1 whitespace-pre-wrap">
                        {anamnese.rotinaDiaria.escola}
                      </p>
                    </div>
                  )}
                  {anamnese.rotinaDiaria.almoco && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">
                        Almoço
                      </label>
                      <p className="text-base mt-1 whitespace-pre-wrap">
                        {anamnese.rotinaDiaria.almoco}
                      </p>
                    </div>
                  )}
                  {anamnese.rotinaDiaria.tarde && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">
                        Tarde
                      </label>
                      <p className="text-base mt-1 whitespace-pre-wrap">
                        {anamnese.rotinaDiaria.tarde}
                      </p>
                    </div>
                  )}
                  {anamnese.rotinaDiaria.jantar && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">
                        Jantar
                      </label>
                      <p className="text-base mt-1 whitespace-pre-wrap">
                        {anamnese.rotinaDiaria.jantar}
                      </p>
                    </div>
                  )}
                  {anamnese.rotinaDiaria.dormir && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">
                        Dormir
                      </label>
                      <p className="text-base mt-1 whitespace-pre-wrap">
                        {anamnese.rotinaDiaria.dormir}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Etapa 5: Ambiente Familiar e Escolar */}
          {(anamnese.ambienteFamiliar || anamnese.ambienteEscolar) && (
            <Card>
              <CardHeader>
                <CardTitle>5. Ambiente Familiar e Escolar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {anamnese.ambienteFamiliar && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Ambiente Familiar
                    </label>
                    <p className="text-base mt-2 whitespace-pre-wrap">
                      {anamnese.ambienteFamiliar}
                    </p>
                  </div>
                )}
                {anamnese.ambienteEscolar && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Ambiente Escolar
                    </label>
                    <p className="text-base mt-2 whitespace-pre-wrap">
                      {anamnese.ambienteEscolar}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Etapa 6: Preferências (Reforçadores) */}
          {anamnese.preferencias && (
            <Card>
              <CardHeader>
                <CardTitle>6. Preferências (Reforçadores)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">
                  {typeof anamnese.preferencias === "string"
                    ? anamnese.preferencias
                    : anamnese.preferencias?.descricao
                      ? anamnese.preferencias.descricao
                      : ""}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Etapa 7: Documentos Anexos */}
          {anamnese.documentosAnexos &&
            anamnese.documentosAnexos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>7. Documentos e Vídeos Anexados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {anamnese.documentosAnexos.map((doc, index) => (
                      <li key={index} className="text-sm">
                        <a
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Documento {index + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

          {/* Etapa 8: Habilidades Críticas */}
          {anamnese.habilidadesCriticas && (
            <Card>
              <CardHeader>
                <CardTitle>
                  8. Habilidades Críticas para o Desenvolvimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">
                  {typeof anamnese.habilidadesCriticas === "string"
                    ? anamnese.habilidadesCriticas
                    : Array.isArray(anamnese.habilidadesCriticas) &&
                        anamnese.habilidadesCriticas[0]?.descricao
                      ? anamnese.habilidadesCriticas[0].descricao
                      : ""}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Observações Gerais */}
          {anamnese.observacoesGerais && (
            <Card>
              <CardHeader>
                <CardTitle>Observações Gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">
                  {anamnese.observacoesGerais}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
