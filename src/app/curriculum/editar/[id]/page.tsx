/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { AbaGeral } from "@/components/curriculum/aba-geral";
import { AbaAtividades } from "@/components/curriculum/aba-atividades";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/kit";

function EditarCurriculumPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const curriculumId = params.id as string;
  const [activeTab, setActiveTab] = useState("geral");
  const [loading, setLoading] = useState(true);
  const [curriculumNome, setCurriculumNome] = useState("");

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Plano Terapêutico", href: "/curriculum" },
    { label: "Editar Plano Terapêutico" },
  ];

  useEffect(() => {
    if (curriculumId) {
      fetchCurriculum();
    }
  }, [curriculumId, user]);

  const fetchCurriculum = async () => {
    try {
      if (!user) return;

      setLoading(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/curriculum?id=${curriculumId}`, {
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        setCurriculumNome(result.data.nome || "");
      }
    } catch (error) {
      console.error("Erro ao carregar curriculum:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    if (
      confirm("Deseja realmente sair? Alterações não salvas serão perdidas.")
    ) {
      router.push("/curriculum");
    }
  };

  const handleConcluir = () => {
    router.push("/curriculum");
  };

  if (loading) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          voltar={{ onClick: handleVoltar }}
          titulo="Editar Curriculum"
          subtitulo={curriculumNome && (
              <p className="text-muted-foreground">{curriculumNome}</p>
            )}
          acoes={
            <Button onClick={handleConcluir}>
              <Save className="mr-2 h-4 w-4" />
              Concluir
            </Button>
          }
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <AbaGeral
              curriculumId={curriculumId}
              onSave={() => fetchCurriculum()}
            />
          </TabsContent>

          <TabsContent value="atividades">
            <AbaAtividades
              curriculumId={curriculumId}
              onSave={handleConcluir}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function EditarCurriculumPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'curriculums', action: 'UPDATE' }}>
      <EditarCurriculumPageContent />
    </ProtectedRoute>
  );
}
