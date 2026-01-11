"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import { AbaGeral } from "@/components/atividades/aba-geral";
import { AbaPontuacao } from "@/components/atividades/aba-pontuacao";
import { AbaInstrucoes } from "@/components/atividades/aba-instrucoes";

export default function NovaAtividadePage() {
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
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleVoltar}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Nova Atividade
            </h1>
            <p className="text-muted-foreground">
              Preencha as informações da atividade
            </p>
          </div>

          {atividadeId && (
            <Button onClick={() => router.push("/atividades-clinicas")}>
              <Save className="mr-2 h-4 w-4" />
              Concluir
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
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
