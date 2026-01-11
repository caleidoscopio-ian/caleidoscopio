"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import { AbaGeral } from "@/components/curriculum/aba-geral";
import { AbaAtividades } from "@/components/curriculum/aba-atividades";

export default function NovoCurriculumPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("geral");
  const [curriculumId, setCurriculumId] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Curriculum", href: "/curriculum" },
    { label: "Novo Curriculum" },
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
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleVoltar}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Novo Curriculum
            </h1>
            <p className="text-muted-foreground">
              Crie um novo curriculum e adicione atividades
            </p>
          </div>

          {curriculumId && (
            <Button onClick={() => router.push("/curriculum")}>
              <Save className="mr-2 h-4 w-4" />
              Concluir
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
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
