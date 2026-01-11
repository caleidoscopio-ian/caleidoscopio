"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import { AbaGeral } from "@/components/atividades/aba-geral";
import { AbaPontuacao } from "@/components/atividades/aba-pontuacao";
import { AbaInstrucoes } from "@/components/atividades/aba-instrucoes";

export default function EditarAtividadePage() {
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
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleVoltar}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Editar Atividade
            </h1>
            <p className="text-muted-foreground">
              Atualize as informações da atividade
            </p>
          </div>

          <Button onClick={() => router.push("/atividades-clinicas")}>
            <Save className="mr-2 h-4 w-4" />
            Concluir
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="pontuacao">Pontuação/Dicas</TabsTrigger>
            <TabsTrigger value="instrucoes">Instruções</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <AbaGeral
              atividadeId={atividadeId}
              onSave={() => {}}
            />
          </TabsContent>

          <TabsContent value="pontuacao">
            <AbaPontuacao
              atividadeId={atividadeId}
              onSave={() => {}}
            />
          </TabsContent>

          <TabsContent value="instrucoes">
            <AbaInstrucoes
              atividadeId={atividadeId}
              onSave={() => {}}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
