"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { AbaGeral } from "@/components/atividades/aba-geral";
import { AbaPontuacao } from "@/components/atividades/aba-pontuacao";
import { AbaInstrucoes } from "@/components/atividades/aba-instrucoes";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/kit";

function NovaAtividadePageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("geral");
  const [atividadeId, setAtividadeId] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Atividades", href: "/atividades-clinicas" },
    { label: "Nova Atividade" },
  ];

  const handleAtividadeCriada = (id: string) => {
    setAtividadeId(id);
    setActiveTab("pontuacao"); // Avançar para próxima aba
  };

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
          titulo="Nova Atividade"
          subtitulo="Preencha as informações da atividade"
          acoes={atividadeId && (
              <Button onClick={() => router.push("/atividades-clinicas")}>
                <Save className="mr-2 h-4 w-4" />
                Concluir
              </Button>
            )}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="pontuacao" disabled={!atividadeId}>
              Pontuação/Dicas
            </TabsTrigger>
            <TabsTrigger value="instrucoes" disabled={!atividadeId}>
              Instruções
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <AbaGeral
              atividadeId={atividadeId}
              onSave={handleAtividadeCriada}
            />
          </TabsContent>

          <TabsContent value="pontuacao">
            <AbaPontuacao
              atividadeId={atividadeId}
              onSave={() => setActiveTab("instrucoes")}
            />
          </TabsContent>

          <TabsContent value="instrucoes">
            <AbaInstrucoes
              atividadeId={atividadeId}
              onSave={() => router.push("/atividades-clinicas")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function NovaAtividadePage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'atividades', action: 'CREATE' }}>
      <NovaAtividadePageContent />
    </ProtectedRoute>
  );
}
