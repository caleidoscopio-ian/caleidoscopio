"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { AbaGeral } from "@/components/curriculum/aba-geral";
import { AbaAtividades } from "@/components/curriculum/aba-atividades";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/kit";

function NovoCurriculumPageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("geral");
  const [curriculumId, setCurriculumId] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Plano Terapêutico", href: "/curriculum" },
    { label: "Novo Plano Terapêutico" },
  ];

  const handleCurriculumCriado = (id: string) => {
    setCurriculumId(id);
    setActiveTab("atividades");
  };

  const handleVoltar = () => {
    if (confirm("Deseja realmente sair? Dados não salvos serão perdidos.")) {
      router.push("/curriculum");
    }
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          voltar={{ onClick: handleVoltar }}
          titulo="Novo Plano Terapêutico"
          subtitulo="Crie um novo plano e adicione atividades"
          acoes={curriculumId && (
              <Button onClick={() => router.push("/curriculum")}>
                <Save className="mr-2 h-4 w-4" />
                Concluir
              </Button>
            )}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="atividades" disabled={!curriculumId}>
              Atividades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <AbaGeral
              curriculumId={curriculumId}
              onSave={handleCurriculumCriado}
            />
          </TabsContent>

          <TabsContent value="atividades">
            <AbaAtividades
              curriculumId={curriculumId}
              onSave={() => router.push("/curriculum")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function NovoCurriculumPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'curriculums', action: 'CREATE' }}>
      <NovoCurriculumPageContent />
    </ProtectedRoute>
  );
}
