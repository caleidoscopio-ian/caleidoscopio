"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { ProntuarioTabs } from "@/components/prontuario-tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, FileText, Plus } from "lucide-react";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  cpf?: string;
  birthDate: string;
  email?: string;
  phone?: string;
  address?: string;
  escolaridade?: string;
  estado_civil?: string;
  guardianName?: string;
  guardianPhone?: string;
  healthInsurance?: string;
  healthInsuranceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProntuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dados");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fechar dialog ao mudar de aba
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setDialogOpen(false);
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pacientes", href: "/pacientes" },
    { label: "Prontuário" },
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const fetchPatient = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        console.log("🔍 Buscando dados do paciente:", resolvedParams.id);

        const userDataEncoded = btoa(JSON.stringify(user));
        const response = await fetch("/api/pacientes", {
          headers: {
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao carregar paciente");
        }

        const result = await response.json();

        // Encontrar o paciente específico
        const foundPatient = result.data.find(
          (p: Patient) => p.id === resolvedParams.id
        );

        if (!foundPatient) {
          throw new Error("Paciente não encontrado");
        }

        console.log("✅ Paciente carregado:", foundPatient.name);
        setPatient(foundPatient);
      } catch (err) {
        console.error("❌ Erro ao carregar paciente:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao carregar paciente"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [resolvedParams.id, user, isAuthenticated, router]);

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

  if (error || !patient) {
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
                {error || "Paciente não encontrado"}
              </p>
              <Link href="/pacientes">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para Pacientes
                </Button>
              </Link>
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
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link href="/pacientes">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                </Link>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Prontuário: {patient.name}
              </h1>
              <p className="text-muted-foreground">
                Visualização completa do prontuário do paciente
              </p>
            </div>

            {/* Botão de ação dinâmico baseado na aba ativa */}
            <div>
              {activeTab === "encaminhamento" && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Encaminhamento
                </Button>
              )}
              {activeTab === "prescricao" && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Prescrição
                </Button>
              )}
              {activeTab === "diagnostico" && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Diagnóstico
                </Button>
              )}
              {activeTab === "relatorios" && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Relatório
                </Button>
              )}
              {activeTab === "anexos" && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Anexo
                </Button>
              )}
            </div>
          </div>

          {/* Tabs do Prontuário */}
          <ProntuarioTabs
            patient={patient}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            dialogOpen={dialogOpen}
            onDialogChange={setDialogOpen}
          />
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
