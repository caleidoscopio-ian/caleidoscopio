"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { AbaGeral } from "@/components/atividades/aba-geral";
import { AbaPontuacao } from "@/components/atividades/aba-pontuacao";
import { AbaInstrucoes } from "@/components/atividades/aba-instrucoes";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/kit";

function EditarAtividadePageContent() {
  const router = useRouter();
  const params = useParams();
  const atividadeId = params.id as string;
  const [activeTab, setActiveTab] = useState("geral");

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Atividades", href: "/atividades-clinicas" },
    { label: "Editar Atividade" },
  ];

  const handleVoltar = () => {
    if (confirm("Deseja realmente sair? Dados não salvos serão perdidos.")) {
      router.push("/atividades-clinicas");
    }
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          voltar={{ onClick: handleVoltar }}
          titulo="Editar Atividade"
          subtitulo="Atualize as informações da atividade"
          acoes={
            <Button onClick={() => router.push("/atividades-clinicas")}>
              <Save className="mr-2 h-4 w-4" />
              Concluir
            </Button>
          }
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="pontuacao">Pontuação/Dicas</TabsTrigger>
            <TabsTrigger value="instrucoes">Instruções (SD)</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <AbaGeral atividadeId={atividadeId} onSave={() => {}} />
          </TabsContent>

          <TabsContent value="pontuacao">
            <AbaPontuacao atividadeId={atividadeId} onSave={() => {}} />
          </TabsContent>

          <TabsContent value="instrucoes">
            <AbaInstrucoes atividadeId={atividadeId} onSave={() => {}} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function EditarAtividadePage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'atividades', action: 'UPDATE' }}>
      <EditarAtividadePageContent />
    </ProtectedRoute>
  );
}
